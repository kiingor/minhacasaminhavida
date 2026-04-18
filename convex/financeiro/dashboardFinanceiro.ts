import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isDespesaInMes(d: any, mes: string): boolean {
  const origMes = d.dataVencimento.slice(0, 7);
  if (d.tipo === "avulsa") return origMes === mes;
  if (d.tipo === "fixa") return mes >= origMes;
  if (d.tipo === "parcelada") {
    const parcelaInicial = d.parcelaAtual ?? 1;
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && (parcelaInicial + offset) <= (d.totalParcelas ?? 1);
  }
  return false;
}

function isReceitaInMes(r: any, mes: string): boolean {
  const origMes = r.dataPrevisao.slice(0, 7);
  if (r.tipo === "avulsa") return origMes === mes;
  if (r.tipo === "fixa") return mes >= origMes;
  if (r.tipo === "parcelada") {
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && offset < (r.totalParcelas ?? 1);
  }
  return false;
}

async function baixasDoMes(ctx: any, familyId: string, mes: string) {
  const [pagamentos, recebimentos] = await Promise.all([
    ctx.db.query("pagamentosDespesas").withIndex("by_familia_mes", (q: any) => q.eq("familyId", familyId).eq("mes", mes)).collect(),
    ctx.db.query("recebimentosReceitas").withIndex("by_familia_mes", (q: any) => q.eq("familyId", familyId).eq("mes", mes)).collect(),
  ]);
  const pagoSet = new Set(pagamentos.map((p: any) => p.despesaId as string));
  const recebidoSet = new Set(recebimentos.map((r: any) => r.receitaId as string));
  return { pagoSet, recebidoSet };
}

export const resumoMes = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));

    const mesAnterior = shiftMonth(mes, -1);
    const dMesAnt = despesas.filter((d) => isDespesaInMes(d, mesAnterior));
    const rMesAnt = receitas.filter((r) => isReceitaInMes(r, mesAnterior));

    const [baixasAtual, baixasAnt] = await Promise.all([
      baixasDoMes(ctx, user.familyId, mes),
      baixasDoMes(ctx, user.familyId, mesAnterior),
    ]);

    const totalDespesas = dMes.reduce((s, d) => s + d.valor, 0);
    const totalReceitas = rMes.reduce((s, r) => s + r.valor, 0);
    const pagas = dMes.filter((d) => baixasAtual.pagoSet.has(d._id as string)).reduce((s, d) => s + d.valor, 0);
    const recebidas = rMes.filter((r) => baixasAtual.recebidoSet.has(r._id as string)).reduce((s, r) => s + r.valor, 0);

    const totalDespesasAnt = dMesAnt.reduce((s, d) => s + d.valor, 0);
    const totalReceitasAnt = rMesAnt.reduce((s, r) => s + r.valor, 0);
    const pagasAnt = dMesAnt.filter((d) => baixasAnt.pagoSet.has(d._id as string)).reduce((s, d) => s + d.valor, 0);
    const recebidasAnt = rMesAnt.filter((r) => baixasAnt.recebidoSet.has(r._id as string)).reduce((s, r) => s + r.valor, 0);
    const saldoAnt = totalReceitasAnt - totalDespesasAnt;
    const aPagarAnt = totalDespesasAnt - pagasAnt;
    const aReceberAnt = totalReceitasAnt - recebidasAnt;
    const economiaAnt = recebidasAnt - pagasAnt;

    function trend(atual: number, anterior: number): "up" | "down" | "neutral" {
      if (anterior === 0) return atual > 0 ? "up" : "neutral";
      const diff = ((atual - anterior) / Math.abs(anterior)) * 100;
      if (Math.abs(diff) < 5) return "neutral";
      return diff > 0 ? "up" : "down";
    }

    return {
      totalDespesas,
      totalReceitas,
      saldo: totalReceitas - totalDespesas,
      aPagar: totalDespesas - pagas,
      aReceber: totalReceitas - recebidas,
      economia: recebidas - pagas,
      trends: {
        saldo: trend(totalReceitas - totalDespesas, saldoAnt),
        aReceber: trend(totalReceitas - recebidas, aReceberAnt),
        aPagar: trend(totalDespesas - pagas, aPagarAnt),
        economia: trend(recebidas - pagas, economiaAnt),
      },
    };
  },
});

// Pizza: despesas por categoria
export const despesasPorCategoria = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const map = new Map<string, number>();
    for (const d of dMes) {
      map.set(d.categoriaId, (map.get(d.categoriaId) ?? 0) + d.valor);
    }
    return Array.from(map.entries()).map(([catId, valor]) => {
      const cat = categorias.find((c) => c._id === catId);
      return { label: cat?.nome ?? "?", valor, cor: cat?.cor ?? "#94A3B8" };
    });
  },
});

// Barras: receitas vs despesas últimos 6 meses
export const historico6Meses = query({
  args: { sessionToken: v.string(), mesAtual: v.string() },
  handler: async (ctx, { sessionToken, mesAtual }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const mes = shiftMonth(mesAtual, -i);
      const totalD = despesas.filter((d) => isDespesaInMes(d, mes)).reduce((s, d) => s + d.valor, 0);
      const totalR = receitas.filter((r) => isReceitaInMes(r, mes)).reduce((s, r) => s + r.valor, 0);
      result.push({ mes, despesas: totalD, receitas: totalR, saldo: totalR - totalD });
    }
    return result;
  },
});

// Gastos por pessoa no mês
export const gastosPorPessoa = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, pessoas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pessoas").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const { pagoSet } = await baixasDoMes(ctx, user.familyId, mes);
    const isPago = (d: any) => pagoSet.has(d._id as string);

    const map = new Map<string, number>();
    let semPessoa = 0;
    for (const d of dMes) {
      if (d.pessoaId) {
        map.set(d.pessoaId, (map.get(d.pessoaId) ?? 0) + d.valor);
      } else {
        semPessoa += d.valor;
      }
    }

    const resultado = pessoas
      .filter((p) => map.has(p._id))
      .map((p) => ({
        pessoaId: p._id,
        nome: p.apelido ?? p.nome,
        cor: p.corTema,
        total: map.get(p._id) ?? 0,
        pagas: dMes.filter((d) => d.pessoaId === p._id && isPago(d)).reduce((s, d) => s + d.valor, 0),
        pendentes: dMes.filter((d) => d.pessoaId === p._id && !isPago(d)).reduce((s, d) => s + d.valor, 0),
      }))
      .sort((a, b) => b.total - a.total);

    if (semPessoa > 0) {
      resultado.push({
        pessoaId: "" as any,
        nome: "Sem pessoa",
        cor: "#94A3B8",
        total: semPessoa,
        pagas: dMes.filter((d) => !d.pessoaId && isPago(d)).reduce((s, d) => s + d.valor, 0),
        pendentes: dMes.filter((d) => !d.pessoaId && !isPago(d)).reduce((s, d) => s + d.valor, 0),
      });
    }

    return resultado;
  },
});

// Despesas por categoria com evolução (últimos 3 meses)
export const evolucaoCategorias = query({
  args: { sessionToken: v.string(), mesAtual: v.string() },
  handler: async (ctx, { sessionToken, mesAtual }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const meses = [shiftMonth(mesAtual, -2), shiftMonth(mesAtual, -1), mesAtual];
    const result: Array<{
      categoriaId: string;
      nome: string;
      cor: string;
      meses: Array<{ mes: string; valor: number }>;
      total: number;
      variacao: number;
    }> = [];

    const catMap = new Map(categorias.map((c) => [c._id, c]));
    const catTotals = new Map<string, number[]>();

    for (let mi = 0; mi < meses.length; mi++) {
      const mes = meses[mi];
      const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
      for (const d of dMes) {
        if (!catTotals.has(d.categoriaId)) catTotals.set(d.categoriaId, [0, 0, 0]);
        catTotals.get(d.categoriaId)![mi] += d.valor;
      }
    }

    for (const [catId, totals] of catTotals) {
      const cat = catMap.get(catId as any);
      const total = totals.reduce((a, b) => a + b, 0);
      const mesAnterior = totals[1];
      const mesAtualVal = totals[2];
      const variacao = mesAnterior > 0 ? ((mesAtualVal - mesAnterior) / mesAnterior) * 100 : 0;

      result.push({
        categoriaId: catId,
        nome: cat?.nome ?? "?",
        cor: cat?.cor ?? "#94A3B8",
        meses: meses.map((m, i) => ({ mes: m, valor: totals[i] })),
        total,
        variacao: Math.round(variacao),
      });
    }

    return result.sort((a, b) => b.total - a.total);
  },
});

// Receitas vs Despesas evolução (12 meses)
export const evolucaoReceitasDespesas = query({
  args: { sessionToken: v.string(), mesAtual: v.string() },
  handler: async (ctx, { sessionToken, mesAtual }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const mes = shiftMonth(mesAtual, -i);
      const totalD = despesas.filter((d) => isDespesaInMes(d, mes)).reduce((s, d) => s + d.valor, 0);
      const totalR = receitas.filter((r) => isReceitaInMes(r, mes)).reduce((s, r) => s + r.valor, 0);
      result.push({ mes, despesas: totalD, receitas: totalR, saldo: totalR - totalD });
    }
    return result;
  },
});

// Receitas por categoria do mês
export const receitasPorCategoria = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [receitas, categorias] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const map = new Map<string, number>();
    for (const r of rMes) {
      map.set(r.categoriaId, (map.get(r.categoriaId) ?? 0) + r.valor);
    }
    return Array.from(map.entries()).map(([catId, valor]) => {
      const cat = categorias.find((c) => c._id === catId);
      return { label: cat?.nome ?? "?", valor, cor: cat?.cor ?? "#94A3B8" };
    });
  },
});

// Top pagadores do mês
export const receitasPorPagador = query({
  args: { sessionToken: v.string(), mes: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, mes, limit }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [receitas, pagadores] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pagadores").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const totalGeral = rMes.reduce((s, r) => s + r.valor, 0);
    const { recebidoSet } = await baixasDoMes(ctx, user.familyId, mes);

    type Bucket = { key: string; nome: string; cor: string; total: number; qtd: number; recebido: number; pendente: number };
    const buckets = new Map<string, Bucket>();
    const pagadorMap = new Map(pagadores.map((p) => [p._id as string, p]));

    for (const r of rMes) {
      let key: string;
      let nome: string;
      let cor: string;
      if (r.pagadorId) {
        const p = pagadorMap.get(r.pagadorId as string);
        key = r.pagadorId as string;
        nome = p ? (p.apelido ?? p.nome) : (r.pagadorNome ?? "Pagador removido");
        cor = p?.cor ?? "#94A3B8";
      } else if (r.pagadorNome && r.pagadorNome.trim()) {
        const nomeLimpo = r.pagadorNome.trim();
        key = `legado:${nomeLimpo.toLowerCase()}`;
        nome = nomeLimpo;
        cor = "#94A3B8";
      } else {
        key = "__sem_pagador__";
        nome = "Sem pagador";
        cor = "#94A3B8";
      }
      const b = buckets.get(key) ?? { key, nome, cor, total: 0, qtd: 0, recebido: 0, pendente: 0 };
      b.total += r.valor;
      b.qtd += 1;
      const recebido = recebidoSet.has(r._id as string);
      if (recebido) b.recebido += r.valor; else b.pendente += r.valor;
      buckets.set(key, b);
    }

    const ordenado = Array.from(buckets.values())
      .map((b) => ({ ...b, percentual: totalGeral > 0 ? Math.round((b.total / totalGeral) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    return { totalGeral, itens: typeof limit === "number" ? ordenado.slice(0, limit) : ordenado };
  },
});

// Relatório completo: receitas por pagador + por categoria com drill-down
export const relatorioReceitas = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [receitas, pagadores, categorias] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pagadores").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const totalGeral = rMes.reduce((s, r) => s + r.valor, 0);
    const { recebidoSet } = await baixasDoMes(ctx, user.familyId, mes);
    const pagadorMap = new Map(pagadores.map((p) => [p._id as string, p]));
    const catMap = new Map(categorias.map((c) => [c._id as string, c]));

    type Bucket = { key: string; nome: string; cor: string; total: number; qtd: number; recebido: number; pendente: number };

    function chaveDoPagador(r: any): { key: string; nome: string; cor: string } {
      if (r.pagadorId) {
        const p = pagadorMap.get(r.pagadorId as string);
        return {
          key: r.pagadorId as string,
          nome: p ? (p.apelido ?? p.nome) : (r.pagadorNome ?? "Pagador removido"),
          cor: p?.cor ?? "#94A3B8",
        };
      }
      if (r.pagadorNome && r.pagadorNome.trim()) {
        const nomeLimpo = r.pagadorNome.trim();
        return { key: `legado:${nomeLimpo.toLowerCase()}`, nome: nomeLimpo, cor: "#94A3B8" };
      }
      return { key: "__sem_pagador__", nome: "Sem pagador", cor: "#94A3B8" };
    }

    // Por Pagador
    const pagadorBuckets = new Map<string, Bucket>();
    for (const r of rMes) {
      const { key, nome, cor } = chaveDoPagador(r);
      const b = pagadorBuckets.get(key) ?? { key, nome, cor, total: 0, qtd: 0, recebido: 0, pendente: 0 };
      b.total += r.valor;
      b.qtd += 1;
      const recebido = recebidoSet.has(r._id as string);
      if (recebido) b.recebido += r.valor; else b.pendente += r.valor;
      pagadorBuckets.set(key, b);
    }
    const porPagador = Array.from(pagadorBuckets.values())
      .map((b) => ({ ...b, percentual: totalGeral > 0 ? Math.round((b.total / totalGeral) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Por Categoria com drill-down por pagador
    type CatBucket = { categoriaId: string; nome: string; cor: string; total: number; qtd: number; pagadores: Map<string, Bucket> };
    const catBuckets = new Map<string, CatBucket>();
    for (const r of rMes) {
      const cat = catMap.get(r.categoriaId as string);
      const cb = catBuckets.get(r.categoriaId as string) ?? {
        categoriaId: r.categoriaId as string,
        nome: cat?.nome ?? "?",
        cor: cat?.cor ?? "#94A3B8",
        total: 0,
        qtd: 0,
        pagadores: new Map<string, Bucket>(),
      };
      cb.total += r.valor;
      cb.qtd += 1;
      const { key, nome, cor } = chaveDoPagador(r);
      const pb = cb.pagadores.get(key) ?? { key, nome, cor, total: 0, qtd: 0, recebido: 0, pendente: 0 };
      pb.total += r.valor;
      pb.qtd += 1;
      const recebido = recebidoSet.has(r._id as string);
      if (recebido) pb.recebido += r.valor; else pb.pendente += r.valor;
      cb.pagadores.set(key, pb);
      catBuckets.set(r.categoriaId as string, cb);
    }
    const porCategoria = Array.from(catBuckets.values())
      .map((c) => ({
        categoriaId: c.categoriaId,
        nome: c.nome,
        cor: c.cor,
        total: c.total,
        qtd: c.qtd,
        percentual: totalGeral > 0 ? Math.round((c.total / totalGeral) * 100) : 0,
        pagadores: Array.from(c.pagadores.values()).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);

    return { totalGeral, porPagador, porCategoria };
  },
});

// Progresso do mês: % contas pagas
export const progressoMes = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const despesas = await ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect();
    const { pagoSet } = await baixasDoMes(ctx, user.familyId, mes);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const totalContas = dMes.length;
    const contasPagas = dMes.filter((d) => pagoSet.has(d._id as string)).length;
    const valorTotal = dMes.reduce((s, d) => s + d.valor, 0);
    const valorPago = dMes.filter((d) => pagoSet.has(d._id as string)).reduce((s, d) => s + d.valor, 0);
    const percentual = totalContas === 0 ? 0 : Math.round((contasPagas / totalContas) * 100);
    return { totalContas, contasPagas, valorTotal, valorPago, percentual };
  },
});

// Média diária e projeção do mês
export const mediaDiariaProjecao = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const totalD = dMes.reduce((s, d) => s + d.valor, 0);
    const totalR = rMes.reduce((s, r) => s + r.valor, 0);
    const [ano, mm] = mes.split("-").map(Number);
    const diasNoMes = new Date(ano, mm, 0).getDate();
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const isMesAtual = mes === mesAtual;
    const diaReferencia = isMesAtual ? hoje.getDate() : diasNoMes;
    const mediaDiaria = diaReferencia > 0 ? Math.round(totalD / diaReferencia) : 0;
    const projecaoMes = isMesAtual && diaReferencia > 0 ? Math.round((totalD * diasNoMes) / diaReferencia) : totalD;
    const saldoProjetado = totalR - projecaoMes;
    return { mediaDiaria, projecaoMes, saldoProjetado, isMesAtual, diaReferencia, diasNoMes, totalAtual: totalD };
  },
});

// Fixas vs Variáveis
export const fixasVsVariaveis = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const despesas = await ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect();
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    let fixas = 0;
    let variaveis = 0;
    for (const d of dMes) {
      if (d.tipo === "fixa") fixas += d.valor;
      else variaveis += d.valor;
    }
    return { fixas, variaveis };
  },
});

// Cartão vs À vista
export const cartaoVsAVista = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const despesas = await ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect();
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    let cartao = 0;
    let aVista = 0;
    for (const d of dMes) {
      if (d.cartao && d.cartao.trim()) cartao += d.valor;
      else aVista += d.valor;
    }
    return { cartao, aVista };
  },
});

// Categorias que estouraram vs mes anterior (top 5)
export const categoriasEstouradas = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", "despesa")).collect(),
    ]);
    const mesAnterior = shiftMonth(mes, -1);
    const dAtual = despesas.filter((d) => isDespesaInMes(d, mes));
    const dAnt = despesas.filter((d) => isDespesaInMes(d, mesAnterior));
    const totAtual = new Map<string, number>();
    const totAnt = new Map<string, number>();
    for (const d of dAtual) totAtual.set(d.categoriaId, (totAtual.get(d.categoriaId) ?? 0) + d.valor);
    for (const d of dAnt) totAnt.set(d.categoriaId, (totAnt.get(d.categoriaId) ?? 0) + d.valor);

    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const LIMIAR_VALOR = 5000;
    const LIMIAR_VARIACAO = 20;

    const resultado: Array<{ categoriaId: string; nome: string; cor: string; icone?: string; valorAtual: number; valorAnterior: number; variacao: number }> = [];
    for (const [catId, valorAtual] of totAtual) {
      const valorAnterior = totAnt.get(catId) ?? 0;
      if (valorAnterior <= 0) continue;
      if (valorAtual < LIMIAR_VALOR) continue;
      const variacao = Math.round(((valorAtual - valorAnterior) / valorAnterior) * 100);
      if (variacao < LIMIAR_VARIACAO) continue;
      const cat = catMap.get(catId);
      resultado.push({
        categoriaId: catId,
        nome: cat?.nome ?? "?",
        cor: cat?.cor ?? "#94A3B8",
        icone: cat?.icone,
        valorAtual,
        valorAnterior,
        variacao,
      });
    }
    return resultado.sort((a, b) => b.variacao - a.variacao).slice(0, 5);
  },
});

// Próximas contas a vencer (10)
export const proximasContas = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = new Date().toISOString().slice(0, 10);
    const mesAtual = hoje.slice(0, 7);
    const despesas = await ctx.db
      .query("despesas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();
    const { pagoSet } = await baixasDoMes(ctx, user.familyId, mesAtual);
    return despesas
      .filter((d) => isDespesaInMes(d, mesAtual) && !pagoSet.has(d._id as string))
      .map((d) => {
        const origMes = d.dataVencimento.slice(0, 7);
        if (origMes === mesAtual) return d;
        const dia = d.dataVencimento.slice(8, 10);
        return { ...d, dataVencimento: `${mesAtual}-${dia}` };
      })
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .slice(0, 10);
  },
});
