import { v } from "convex/values";
import { query, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id } from "../_generated/dataModel";

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
  if (d.tipo === "fixa") {
    if (mes < origMes) return false;
    const periodicidade = d.periodicidade ?? "mensal";
    if (periodicidade === "mensal") return true;
    const mesAlvoNum = Number(mes.slice(5, 7));
    if (periodicidade === "anual") {
      return Number(origMes.slice(5, 7)) === mesAlvoNum;
    }
    // sazonal
    const meses: number[] = d.mesesSazonais ?? [];
    return meses.includes(mesAlvoNum);
  }
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
  if (r.tipo === "fixa") {
    if (mes < origMes) return false;
    const periodicidade = r.periodicidade ?? "mensal";
    if (periodicidade === "mensal") return true;
    const mesAlvoNum = Number(mes.slice(5, 7));
    if (periodicidade === "anual") {
      return Number(origMes.slice(5, 7)) === mesAlvoNum;
    }
    const meses: number[] = r.mesesSazonais ?? [];
    return meses.includes(mesAlvoNum);
  }
  if (r.tipo === "parcelada") {
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && offset < (r.totalParcelas ?? 1);
  }
  return false;
}

// Aplica override para retornar o valor do registro num mes especifico.
function valorDespesaNoMes(d: any, mes: string): number {
  const ov = (d.overrides ?? []).find((o: any) => o.mes === mes);
  if (ov && typeof ov.valor === "number") return ov.valor;
  return d.valor;
}

function valorReceitaNoMes(r: any, mes: string): number {
  const ov = (r.overrides ?? []).find((o: any) => o.mes === mes);
  if (ov && typeof ov.valor === "number") return ov.valor;
  return r.valor;
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

    const totalDespesas = dMes.reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
    const totalReceitas = rMes.reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
    const pagas = dMes.filter((d) => baixasAtual.pagoSet.has(d._id as string)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
    const recebidas = rMes.filter((r) => baixasAtual.recebidoSet.has(r._id as string)).reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);

    const totalDespesasAnt = dMesAnt.reduce((s, d) => s + valorDespesaNoMes(d, mesAnterior), 0);
    const totalReceitasAnt = rMesAnt.reduce((s, r) => s + valorReceitaNoMes(r, mesAnterior), 0);
    const pagasAnt = dMesAnt.filter((d) => baixasAnt.pagoSet.has(d._id as string)).reduce((s, d) => s + valorDespesaNoMes(d, mesAnterior), 0);
    const recebidasAnt = rMesAnt.filter((r) => baixasAnt.recebidoSet.has(r._id as string)).reduce((s, r) => s + valorReceitaNoMes(r, mesAnterior), 0);
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

// Pizza: despesas por categoria.
// modo "consolidado" (default): soma despesas filhas no pai. Categorias sem pai
// permanecem com valor próprio. Mostra apenas categorias mãe (e órfãs).
// modo "detalhado": mostra todas as categorias (mãe + filhas), sem consolidar.
export const despesasPorCategoria = query({
  args: {
    sessionToken: v.string(),
    mes: v.string(),
    modo: v.optional(v.union(v.literal("consolidado"), v.literal("detalhado"))),
  },
  handler: async (ctx, { sessionToken, mes, modo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const modoEfetivo = modo ?? "consolidado";

    // soma por categoria (filha ou mãe)
    const baseMap = new Map<string, number>();
    for (const d of dMes) {
      const v = valorDespesaNoMes(d, mes);
      baseMap.set(d.categoriaId as string, (baseMap.get(d.categoriaId as string) ?? 0) + v);
    }

    if (modoEfetivo === "detalhado") {
      return Array.from(baseMap.entries()).map(([catId, valor]) => {
        const cat = catMap.get(catId);
        return { label: cat?.nome ?? "?", valor, cor: cat?.cor ?? "#94A3B8" };
      });
    }

    // consolidado: para cada filha, soma no pai. Mães e órfãs ficam com sua propria soma.
    const consolidado = new Map<string, number>();
    for (const [catId, valor] of baseMap) {
      const cat = catMap.get(catId);
      const chave = cat?.categoriaPaiId ? (cat.categoriaPaiId as string) : catId;
      consolidado.set(chave, (consolidado.get(chave) ?? 0) + valor);
    }
    return Array.from(consolidado.entries()).map(([catId, valor]) => {
      const cat = catMap.get(catId);
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
      const totalD = despesas.filter((d) => isDespesaInMes(d, mes)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
      const totalR = receitas.filter((r) => isReceitaInMes(r, mes)).reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
      result.push({ mes, despesas: totalD, receitas: totalR, saldo: totalR - totalD });
    }
    return result;
  },
});

// Versao parametrizada: ate N meses (default 12, max 24).
export const historicoNMeses = query({
  args: {
    sessionToken: v.string(),
    mesAtual: v.string(),
    meses: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, mesAtual, meses }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const N = typeof meses === "number" && meses > 0 ? Math.min(Math.floor(meses), 24) : 12;
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const result = [];
    for (let i = N - 1; i >= 0; i--) {
      const mes = shiftMonth(mesAtual, -i);
      const totalD = despesas.filter((d) => isDespesaInMes(d, mes)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
      const totalR = receitas.filter((r) => isReceitaInMes(r, mes)).reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
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
      const v = valorDespesaNoMes(d, mes);
      if (d.pessoaId) {
        map.set(d.pessoaId, (map.get(d.pessoaId) ?? 0) + v);
      } else {
        semPessoa += v;
      }
    }

    const resultado = pessoas
      .filter((p) => map.has(p._id))
      .map((p) => ({
        pessoaId: p._id,
        nome: p.apelido ?? p.nome,
        cor: p.corTema,
        total: map.get(p._id) ?? 0,
        pagas: dMes.filter((d) => d.pessoaId === p._id && isPago(d)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0),
        pendentes: dMes.filter((d) => d.pessoaId === p._id && !isPago(d)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0),
      }))
      .sort((a, b) => b.total - a.total);

    if (semPessoa > 0) {
      resultado.push({
        pessoaId: "" as any,
        nome: "Sem pessoa",
        cor: "#94A3B8",
        total: semPessoa,
        pagas: dMes.filter((d) => !d.pessoaId && isPago(d)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0),
        pendentes: dMes.filter((d) => !d.pessoaId && !isPago(d)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0),
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
        catTotals.get(d.categoriaId)![mi] += valorDespesaNoMes(d, mes);
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
      const totalD = despesas.filter((d) => isDespesaInMes(d, mes)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
      const totalR = receitas.filter((r) => isReceitaInMes(r, mes)).reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
      result.push({ mes, despesas: totalD, receitas: totalR, saldo: totalR - totalD });
    }
    return result;
  },
});

// Receitas por categoria do mês (consolidado/detalhado, com herança de pai)
export const receitasPorCategoria = query({
  args: {
    sessionToken: v.string(),
    mes: v.string(),
    modo: v.optional(v.union(v.literal("consolidado"), v.literal("detalhado"))),
  },
  handler: async (ctx, { sessionToken, mes, modo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [receitas, categorias] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const modoEfetivo = modo ?? "consolidado";

    const baseMap = new Map<string, number>();
    for (const r of rMes) {
      const v = valorReceitaNoMes(r, mes);
      baseMap.set(r.categoriaId as string, (baseMap.get(r.categoriaId as string) ?? 0) + v);
    }

    if (modoEfetivo === "detalhado") {
      return Array.from(baseMap.entries()).map(([catId, valor]) => {
        const cat = catMap.get(catId);
        return { label: cat?.nome ?? "?", valor, cor: cat?.cor ?? "#94A3B8" };
      });
    }
    const consolidado = new Map<string, number>();
    for (const [catId, valor] of baseMap) {
      const cat = catMap.get(catId);
      const chave = cat?.categoriaPaiId ? (cat.categoriaPaiId as string) : catId;
      consolidado.set(chave, (consolidado.get(chave) ?? 0) + valor);
    }
    return Array.from(consolidado.entries()).map(([catId, valor]) => {
      const cat = catMap.get(catId);
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
    const totalGeral = rMes.reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
    const { recebidoSet } = await baixasDoMes(ctx, user.familyId, mes);

    type Bucket = { key: string; nome: string; cor: string; total: number; qtd: number; recebido: number; pendente: number };
    const buckets = new Map<string, Bucket>();
    const pagadorMap = new Map(pagadores.map((p) => [p._id as string, p]));

    for (const r of rMes) {
      const valorMes = valorReceitaNoMes(r, mes);
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
      b.total += valorMes;
      b.qtd += 1;
      const recebido = recebidoSet.has(r._id as string);
      if (recebido) b.recebido += valorMes; else b.pendente += valorMes;
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
    const totalGeral = rMes.reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
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
      const valorMes = valorReceitaNoMes(r, mes);
      const { key, nome, cor } = chaveDoPagador(r);
      const b = pagadorBuckets.get(key) ?? { key, nome, cor, total: 0, qtd: 0, recebido: 0, pendente: 0 };
      b.total += valorMes;
      b.qtd += 1;
      const recebido = recebidoSet.has(r._id as string);
      if (recebido) b.recebido += valorMes; else b.pendente += valorMes;
      pagadorBuckets.set(key, b);
    }
    const porPagador = Array.from(pagadorBuckets.values())
      .map((b) => ({ ...b, percentual: totalGeral > 0 ? Math.round((b.total / totalGeral) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Por Categoria com drill-down por pagador
    type CatBucket = { categoriaId: string; nome: string; cor: string; total: number; qtd: number; pagadores: Map<string, Bucket> };
    const catBuckets = new Map<string, CatBucket>();
    for (const r of rMes) {
      const valorMes = valorReceitaNoMes(r, mes);
      const cat = catMap.get(r.categoriaId as string);
      const cb = catBuckets.get(r.categoriaId as string) ?? {
        categoriaId: r.categoriaId as string,
        nome: cat?.nome ?? "?",
        cor: cat?.cor ?? "#94A3B8",
        total: 0,
        qtd: 0,
        pagadores: new Map<string, Bucket>(),
      };
      cb.total += valorMes;
      cb.qtd += 1;
      const { key, nome, cor } = chaveDoPagador(r);
      const pb = cb.pagadores.get(key) ?? { key, nome, cor, total: 0, qtd: 0, recebido: 0, pendente: 0 };
      pb.total += valorMes;
      pb.qtd += 1;
      const recebido = recebidoSet.has(r._id as string);
      if (recebido) pb.recebido += valorMes; else pb.pendente += valorMes;
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
    const valorTotal = dMes.reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
    const valorPago = dMes.filter((d) => pagoSet.has(d._id as string)).reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
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
    const totalD = dMes.reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);
    const totalR = rMes.reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
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
      const v = valorDespesaNoMes(d, mes);
      if (d.tipo === "fixa") fixas += v;
      else variaveis += v;
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
      const v = valorDespesaNoMes(d, mes);
      if (d.cartao && d.cartao.trim()) cartao += v;
      else aVista += v;
    }
    return { cartao, aVista };
  },
});

// Categorias que estouraram o limite de orcamento no mes (>=100% do valor planejado).
// Apenas categorias mae sao consideradas — soma das filhas conta no limite consolidado.
export const categoriasEstouradas = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias, limites] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", "despesa")).collect(),
      ctx.db.query("limitesOrcamento").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes)).collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const realizadoPorCat = new Map<string, number>();
    for (const d of dMes) {
      const k = d.categoriaId as string;
      realizadoPorCat.set(k, (realizadoPorCat.get(k) ?? 0) + valorDespesaNoMes(d, mes));
    }

    const limitePorCat = new Map<string, number>();
    for (const l of limites) limitePorCat.set(l.categoriaId as string, l.valorLimite);

    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const filhasPorPai = new Map<string, typeof categorias>();
    for (const c of categorias) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!filhasPorPai.has(k)) filhasPorPai.set(k, []);
        filhasPorPai.get(k)!.push(c);
      }
    }

    type Item = { categoriaId: string; nome: string; cor: string; icone?: string; realizado: number; limite: number; percentual: number };
    const resultado: Item[] = [];

    // Categorias mae (sem pai) e orfas (filhas com pai inexistente) — visao consolidada
    const idsConsiderados = new Set<string>();
    for (const c of categorias) {
      if (!c.categoriaPaiId) idsConsiderados.add(c._id as string);
    }
    // Orfas
    for (const c of categorias) {
      if (c.categoriaPaiId && !catMap.has(c.categoriaPaiId as string)) {
        idsConsiderados.add(c._id as string);
      }
    }

    for (const id of idsConsiderados) {
      const cat = catMap.get(id);
      if (!cat) continue;
      const filhas = filhasPorPai.get(id) ?? [];
      const realizadoProprio = realizadoPorCat.get(id) ?? 0;
      const realizadoFilhas = filhas.reduce((s, f) => s + (realizadoPorCat.get(f._id as string) ?? 0), 0);
      const realizado = realizadoProprio + realizadoFilhas;

      const limiteProprio = limitePorCat.get(id);
      const limiteFilhas = filhas.reduce((s, f) => s + (limitePorCat.get(f._id as string) ?? 0), 0);
      const limite = limiteProprio ?? limiteFilhas;

      if (limite <= 0) continue;
      const percentual = (realizado / limite) * 100;
      if (percentual < 100) continue;

      resultado.push({
        categoriaId: id,
        nome: cat.nome,
        cor: cat.cor,
        icone: cat.icone,
        realizado,
        limite,
        percentual: Math.round(percentual),
      });
    }

    return resultado.sort((a, b) => b.percentual - a.percentual).slice(0, 5);
  },
});

// Resumo de orcamento do mes para card na home
export const resumoOrcamento = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias, limites] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", "despesa")).collect(),
      ctx.db.query("limitesOrcamento").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes)).collect(),
    ]);

    if (limites.length === 0) {
      return { totalLimite: 0, totalRealizado: 0, percentual: 0, categoriasOK: 0, categoriasAtencao: 0, categoriasEstouradas: 0, temLimites: false };
    }

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const realizadoPorCat = new Map<string, number>();
    for (const d of dMes) {
      const k = d.categoriaId as string;
      realizadoPorCat.set(k, (realizadoPorCat.get(k) ?? 0) + valorDespesaNoMes(d, mes));
    }

    const limitePorCat = new Map<string, number>();
    for (const l of limites) limitePorCat.set(l.categoriaId as string, l.valorLimite);

    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const filhasPorPai = new Map<string, typeof categorias>();
    for (const c of categorias) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!filhasPorPai.has(k)) filhasPorPai.set(k, []);
        filhasPorPai.get(k)!.push(c);
      }
    }

    let totalLimite = 0;
    let totalRealizado = 0;
    let categoriasOK = 0;
    let categoriasAtencao = 0;
    let categoriasEstouradas = 0;

    const idsConsiderados = new Set<string>();
    for (const c of categorias) {
      if (!c.categoriaPaiId && catMap.has(c._id as string)) idsConsiderados.add(c._id as string);
      else if (c.categoriaPaiId && !catMap.has(c.categoriaPaiId as string)) idsConsiderados.add(c._id as string);
    }

    for (const id of idsConsiderados) {
      const cat = catMap.get(id);
      if (!cat) continue;
      const filhas = filhasPorPai.get(id) ?? [];
      const realizadoProprio = realizadoPorCat.get(id) ?? 0;
      const realizadoFilhas = filhas.reduce((s, f) => s + (realizadoPorCat.get(f._id as string) ?? 0), 0);
      const realizado = realizadoProprio + realizadoFilhas;

      const limiteProprio = limitePorCat.get(id);
      const limiteFilhas = filhas.reduce((s, f) => s + (limitePorCat.get(f._id as string) ?? 0), 0);
      const limite = limiteProprio ?? limiteFilhas;

      if (limite <= 0) continue;
      totalLimite += limite;
      totalRealizado += realizado;

      const pct = (realizado / limite) * 100;
      if (pct >= 100) categoriasEstouradas++;
      else if (pct >= 80) categoriasAtencao++;
      else categoriasOK++;
    }

    const percentual = totalLimite > 0 ? Math.round((totalRealizado / totalLimite) * 100) : 0;
    return {
      totalLimite,
      totalRealizado,
      percentual,
      categoriasOK,
      categoriasAtencao,
      categoriasEstouradas,
      temLimites: true,
    };
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
        const ov = (d.overrides ?? []).find((o: any) => o.mes === mesAtual);
        const valor = ov?.valor ?? d.valor;
        const descricao = ov?.descricao ?? d.descricao;
        const dataBase = ov?.dataVencimento ?? d.dataVencimento;
        const origMes = dataBase.slice(0, 7);
        const dataVencimento =
          origMes === mesAtual ? dataBase : projetarParaMes(dataBase, mesAtual);
        return { ...d, valor, descricao, dataVencimento };
      })
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .slice(0, 10);
  },
});

// ============================================================================
// MARCO 1.F - Comparativos 12 meses + Top lancamentos + Composicao patrimonio
// ============================================================================

// Compara despesas por categoria entre `mes` e mes anterior. Retorna top 5 que
// mais cresceram e top 5 que mais diminuiram (em valor absoluto).
// Considera categoria mae (consolidando filhas) — alinhado com despesasPorCategoria.
export const categoriasComparativo = query({
  args: { sessionToken: v.string(), mes: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, mes, limit }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", "despesa")).collect(),
    ]);
    const mesAnterior = shiftMonth(mes, -1);
    const N = typeof limit === "number" && limit > 0 ? Math.min(Math.floor(limit), 20) : 5;
    const catMap = new Map(categorias.map((c) => [c._id as string, c]));

    function consolidarPorCategoria(mesAlvo: string): Map<string, number> {
      const dMes = despesas.filter((d) => isDespesaInMes(d, mesAlvo));
      const baseMap = new Map<string, number>();
      for (const d of dMes) {
        const valor = valorDespesaNoMes(d, mesAlvo);
        baseMap.set(d.categoriaId as string, (baseMap.get(d.categoriaId as string) ?? 0) + valor);
      }
      const consolidado = new Map<string, number>();
      for (const [catId, valor] of baseMap) {
        const cat = catMap.get(catId);
        const chave = cat?.categoriaPaiId ? (cat.categoriaPaiId as string) : catId;
        consolidado.set(chave, (consolidado.get(chave) ?? 0) + valor);
      }
      return consolidado;
    }

    const atual = consolidarPorCategoria(mes);
    const anterior = consolidarPorCategoria(mesAnterior);

    type Item = {
      categoriaId: string;
      nome: string;
      cor: string;
      icone?: string;
      atual: number;
      anterior: number;
      variacao: number; // centavos: atual - anterior
      percentual: number; // arredondado, 0 se anterior == 0
    };

    const todasChaves = new Set<string>([...atual.keys(), ...anterior.keys()]);
    const itens: Item[] = [];
    for (const catId of todasChaves) {
      const cat = catMap.get(catId);
      const a = atual.get(catId) ?? 0;
      const ant = anterior.get(catId) ?? 0;
      // Ignora categorias sem dado em ambos os meses.
      if (a === 0 && ant === 0) continue;
      const variacao = a - ant;
      const percentual = ant > 0 ? Math.round(((a - ant) / ant) * 100) : a > 0 ? 100 : 0;
      itens.push({
        categoriaId: catId,
        nome: cat?.nome ?? "?",
        cor: cat?.cor ?? "#94A3B8",
        icone: cat?.icone,
        atual: a,
        anterior: ant,
        variacao,
        percentual,
      });
    }

    const cresceram = itens
      .filter((i) => i.variacao > 0)
      .sort((a, b) => b.variacao - a.variacao)
      .slice(0, N);
    const diminuiram = itens
      .filter((i) => i.variacao < 0)
      .sort((a, b) => a.variacao - b.variacao) // mais negativo primeiro
      .slice(0, N);

    return { topCresceram: cresceram, topDiminuiram: diminuiram, mesAtual: mes, mesAnterior };
  },
});

// Top N maiores despesas individuais do mes (com override aplicado).
export const topLancamentosMes = query({
  args: { sessionToken: v.string(), mes: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, mes, limit }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias, pessoas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", "despesa")).collect(),
      ctx.db.query("pessoas").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const N = typeof limit === "number" && limit > 0 ? Math.min(Math.floor(limit), 20) : 5;
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const { pagoSet } = await baixasDoMes(ctx, user.familyId, mes);
    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const pessoaMap = new Map(pessoas.map((p) => [p._id as string, p]));

    const itens = dMes.map((d) => {
      const ov = (d.overrides ?? []).find((o) => o.mes === mes);
      const valor = ov?.valor ?? d.valor;
      const descricao = ov?.descricao ?? d.descricao;
      const dataVenc = ov?.dataVencimento ?? d.dataVencimento;
      const cat = catMap.get(d.categoriaId as string);
      const pessoa = d.pessoaId ? pessoaMap.get(d.pessoaId as string) : undefined;
      return {
        despesaId: d._id as string,
        descricao,
        valor,
        dataVencimento: dataVenc,
        pago: pagoSet.has(d._id as string),
        categoriaId: d.categoriaId as string,
        categoriaNome: cat?.nome ?? "?",
        categoriaCor: cat?.cor ?? "#94A3B8",
        categoriaIcone: cat?.icone,
        pessoaId: d.pessoaId as string | undefined,
        pessoaNome: pessoa ? (pessoa.apelido ?? pessoa.nome) : undefined,
        pessoaCor: pessoa?.corTema,
      };
    });

    return itens.sort((a, b) => b.valor - a.valor).slice(0, N);
  },
});

// Composicao do patrimonio total — saldo final por tipo de conta.
// Espelha calcularSaldoContaInterno para evitar divergencia.
export const composicaoPatrimonio = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const ativas = contas.filter((c) => c.ativa);

    let correntes = 0;
    let poupancas = 0;
    let dinheiro = 0;
    let aplicacoes = 0;

    for (const c of ativas) {
      const saldo = await calcularSaldoContaInterno(ctx, c._id, user.familyId);
      if (c.tipo === "corrente") correntes += saldo;
      else if (c.tipo === "poupanca") poupancas += saldo;
      else if (c.tipo === "dinheiro") dinheiro += saldo;
      else if (c.tipo === "aplicacao") aplicacoes += saldo;
    }

    const total = correntes + poupancas + dinheiro + aplicacoes;
    return {
      correntes,
      poupancas,
      dinheiro,
      aplicacoes,
      total,
      contasAtivas: ativas.length,
    };
  },
});

// ============================================================================
// MARCO 1.B - Saldo efetivado vs projetado + Lancamentos do dia + Vencimentos
// ============================================================================

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Projeta data original para um mes alvo. Se o dia nao existir no mes alvo
// (ex: dia 31 em fevereiro), usa o ultimo dia do mes.
function projetarParaMes(dataOriginal: string, mesAlvo: string): string {
  const diaOriginal = Number(dataOriginal.slice(8, 10));
  const [y, m] = mesAlvo.split("-").map(Number);
  const ultimoDiaDoMes = new Date(y, m, 0).getDate();
  const dia = Math.min(diaOriginal, ultimoDiaDoMes);
  return `${mesAlvo}-${String(dia).padStart(2, "0")}`;
}

// Calcula saldo efetivo de uma conta. Espelha a logica de contas.ts::calcularSaldoConta
// (replicada para evitar import circular).
async function calcularSaldoContaInterno(
  ctx: QueryCtx,
  contaId: Id<"contas">,
  familyId: string
): Promise<number> {
  const conta = await ctx.db.get(contaId);
  if (!conta || conta.familyId !== familyId) return 0;

  const receitas = await ctx.db
    .query("receitas")
    .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
    .collect();
  const receitasDaConta = receitas.filter((r) => r.contaId === contaId);

  let totalReceitas = 0;
  for (const r of receitasDaConta) {
    const recs = await ctx.db
      .query("recebimentosReceitas")
      .withIndex("by_receita_mes", (q) => q.eq("receitaId", r._id))
      .collect();
    for (const rec of recs) {
      if (rec.dataRecebimento) totalReceitas += rec.valorRecebido ?? r.valor;
    }
  }

  const despesas = await ctx.db
    .query("despesas")
    .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
    .collect();
  const despesasDaConta = despesas.filter((d) => d.contaId === contaId && !d.cartao);

  let totalDespesas = 0;
  for (const d of despesasDaConta) {
    const pags = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_despesa_mes", (q) => q.eq("despesaId", d._id))
      .collect();
    for (const p of pags) {
      if (p.dataPagamento) totalDespesas += p.valorPago ?? d.valor;
    }
  }

  const transfs = await ctx.db
    .query("transferencias")
    .withIndex("by_family_data", (q) => q.eq("familyId", familyId))
    .collect();

  let entradas = 0;
  let saidas = 0;
  for (const t of transfs) {
    if (t.contaDestinoId === contaId) entradas += t.valor;
    if (t.contaOrigemId === contaId) saidas += t.valor;
  }

  const saldoCalculado =
    conta.saldoInicial + totalReceitas - totalDespesas + entradas - saidas;
  const ehManual = conta.tipo === "aplicacao" && conta.saldoManual !== undefined;
  return ehManual ? (conta.saldoManual as number) : saldoCalculado;
}

// 1) Saldo efetivado: soma do saldo final de todas as contas ativas
export const saldoEfetivado = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const ativas = contas.filter((c) => c.ativa);
    let valor = 0;
    for (const c of ativas) {
      valor += await calcularSaldoContaInterno(ctx, c._id, user.familyId);
    }
    return { valor, contasAtivas: ativas.length };
  },
});

// 2) Saldo projetado: efetivado + receitas pendentes do mes - despesas pendentes do mes
export const saldoProjetado = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const mesAtual = currentMonth();

    // Saldo efetivado (mesmo calculo da query saldoEfetivado, inline para 1 chamada)
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const ativas = contas.filter((c) => c.ativa);
    let saldoEfetivadoBase = 0;
    for (const c of ativas) {
      saldoEfetivadoBase += await calcularSaldoContaInterno(ctx, c._id, user.familyId);
    }

    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mesAtual));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mesAtual));
    const { pagoSet, recebidoSet } = await baixasDoMes(ctx, user.familyId, mesAtual);

    const despesasPendentes = dMes
      .filter((d) => !pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesaNoMes(d, mesAtual), 0);
    const receitasPendentes = rMes
      .filter((r) => !recebidoSet.has(r._id as string))
      .reduce((s, r) => s + valorReceitaNoMes(r, mesAtual), 0);

    const valor = saldoEfetivadoBase + receitasPendentes - despesasPendentes;
    return { valor, saldoEfetivadoBase, receitasPendentes, despesasPendentes };
  },
});

// 3) Lancamentos do dia: pagamentos, recebimentos e transferencias com data == hoje
export const lancamentosDoDia = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = todayISO();
    const mesAtual = hoje.slice(0, 7);

    // Pagamentos de hoje (filtrar por mes atual via index, depois por dataPagamento)
    const pagamentosMes = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mesAtual))
      .collect();
    const pagamentosHoje = pagamentosMes.filter((p) => p.dataPagamento === hoje);

    // Recebimentos de hoje
    const recebimentosMes = await ctx.db
      .query("recebimentosReceitas")
      .withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mesAtual))
      .collect();
    const recebimentosHoje = recebimentosMes.filter((r) => r.dataRecebimento === hoje);

    // Transferencias de hoje
    const transferenciasHoje = await ctx.db
      .query("transferencias")
      .withIndex("by_family_data", (q) => q.eq("familyId", user.familyId).eq("data", hoje))
      .collect();

    // Batch get despesas e receitas referenciadas
    const despesaIds = Array.from(new Set(pagamentosHoje.map((p) => p.despesaId)));
    const receitaIds = Array.from(new Set(recebimentosHoje.map((r) => r.receitaId)));
    const [despesasMap, receitasMap] = await Promise.all([
      Promise.all(despesaIds.map((id) => ctx.db.get(id))).then((arr) => {
        const m = new Map<string, any>();
        for (const d of arr) if (d) m.set(d._id as string, d);
        return m;
      }),
      Promise.all(receitaIds.map((id) => ctx.db.get(id))).then((arr) => {
        const m = new Map<string, any>();
        for (const r of arr) if (r) m.set(r._id as string, r);
        return m;
      }),
    ]);

    // Contas para descricao de transferencias
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const contaMap = new Map(contas.map((c) => [c._id as string, c]));

    type Lancamento = {
      tipo: "despesa" | "receita" | "transferencia";
      id: string;
      descricao: string;
      valor: number;
      categoriaId?: string;
      contaId?: string;
      criadoEm: string;
    };

    const itens: Lancamento[] = [];

    for (const p of pagamentosHoje) {
      const d = despesasMap.get(p.despesaId as string);
      if (!d) continue;
      itens.push({
        tipo: "despesa",
        id: p._id as string,
        descricao: d.descricao,
        valor: p.valorPago ?? d.valor,
        categoriaId: d.categoriaId as string,
        contaId: d.contaId as string | undefined,
        criadoEm: p.criadoEm,
      });
    }
    for (const r of recebimentosHoje) {
      const rec = receitasMap.get(r.receitaId as string);
      if (!rec) continue;
      itens.push({
        tipo: "receita",
        id: r._id as string,
        descricao: rec.descricao,
        valor: r.valorRecebido ?? rec.valor,
        categoriaId: rec.categoriaId as string,
        contaId: rec.contaId as string | undefined,
        criadoEm: r.criadoEm,
      });
    }
    for (const t of transferenciasHoje) {
      const origem = contaMap.get(t.contaOrigemId as string);
      const destino = contaMap.get(t.contaDestinoId as string);
      itens.push({
        tipo: "transferencia",
        id: t._id as string,
        descricao: `Transferência: ${origem?.nome ?? "?"} → ${destino?.nome ?? "?"}`,
        valor: t.valor,
        criadoEm: t.criadoEm,
      });
    }

    return itens
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, 20);
  },
});

// ============================================================================
// MARCO 2.D - Indicadores leves de saude financeira (4 numeros na home)
// ============================================================================

type StatusIndicador = "verde" | "amarelo" | "vermelho";

// Calcula media de despesas dos N meses anteriores (nao inclui mes atual,
// alinhado a calcularMediaDespesasInterno em metas.ts).
async function mediaDespesasNMesesInterno(
  ctx: QueryCtx,
  familyId: string,
  N: number
): Promise<number> {
  const mesAtual = currentMonth();
  const despesas = await ctx.db
    .query("despesas")
    .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
    .collect();
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const m = shiftMonth(mesAtual, -i);
    total += despesas
      .filter((d) => isDespesaInMes(d, m))
      .reduce((s, d) => s + valorDespesaNoMes(d, m), 0);
  }
  return Math.round(total / N);
}

// Indicadores de saude: poupanca%, comprometimentoFixo%, diasReserva, mesesAteReserva.
// Cores conforme tabela §8 do roadmap.
export const indicadoresSaude = query({
  args: { sessionToken: v.string(), mes: v.optional(v.string()) },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const mesAlvo = mes ?? currentMonth();

    // ---- Receitas e despesas RECEBIDAS/PAGAS do mes ----
    const [despesas, receitas] = await Promise.all([
      ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
      ctx.db
        .query("receitas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
    ]);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mesAlvo));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mesAlvo));
    const { pagoSet, recebidoSet } = await baixasDoMes(ctx, user.familyId, mesAlvo);

    const receitaRecebida = rMes
      .filter((r) => recebidoSet.has(r._id as string))
      .reduce((s, r) => s + valorReceitaNoMes(r, mesAlvo), 0);
    const despesaPaga = dMes
      .filter((d) => pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesaNoMes(d, mesAlvo), 0);
    const despesaFixaPaga = dMes
      .filter((d) => d.tipo === "fixa" && pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesaNoMes(d, mesAlvo), 0);

    // ---- 1) % poupanca do mes ----
    let poupancaPercentValor = 0;
    let poupancaStatus: StatusIndicador = "amarelo";
    if (receitaRecebida > 0) {
      poupancaPercentValor = ((receitaRecebida - despesaPaga) / receitaRecebida) * 100;
      if (poupancaPercentValor >= 20) poupancaStatus = "verde";
      else if (poupancaPercentValor >= 10) poupancaStatus = "amarelo";
      else poupancaStatus = "vermelho";
    } else {
      // Receita zerada: status amarelo (sem dados pra avaliar).
      poupancaPercentValor = 0;
      poupancaStatus = "amarelo";
    }

    // ---- 2) % comprometimento fixo ----
    let comprometimentoValor = 0;
    let comprometimentoStatus: StatusIndicador = "amarelo";
    if (receitaRecebida > 0) {
      comprometimentoValor = (despesaFixaPaga / receitaRecebida) * 100;
      if (comprometimentoValor <= 50) comprometimentoStatus = "verde";
      else if (comprometimentoValor <= 70) comprometimentoStatus = "amarelo";
      else comprometimentoStatus = "vermelho";
    } else {
      comprometimentoValor = 0;
      comprometimentoStatus = "amarelo";
    }

    // ---- 3) Dias de reserva ----
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const ativas = contas.filter((c) => c.ativa);
    let saldoTotal = 0;
    for (const c of ativas) {
      saldoTotal += await calcularSaldoContaInterno(ctx, c._id, user.familyId);
    }
    const mediaDespesas3m = await mediaDespesasNMesesInterno(ctx, user.familyId, 3);
    const despesaDiaria = mediaDespesas3m > 0 ? Math.round(mediaDespesas3m / 30) : 0;

    let diasReservaValor: number;
    let diasReservaStatus: StatusIndicador;
    if (despesaDiaria <= 0) {
      // Sem despesas historicas: status verde (capped 999 pra UI nao explodir).
      diasReservaValor = 999;
      diasReservaStatus = "verde";
    } else if (saldoTotal <= 0) {
      diasReservaValor = 0;
      diasReservaStatus = "vermelho";
    } else {
      diasReservaValor = Math.round(saldoTotal / despesaDiaria);
      if (diasReservaValor >= 180) diasReservaStatus = "verde";
      else if (diasReservaValor >= 90) diasReservaStatus = "amarelo";
      else diasReservaStatus = "vermelho";
    }

    // ---- 4) Meses ate meta de reserva ----
    const metas = await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const reserva = metas.find(
      (m) => m.ativa && m.tipoEspecial === "reserva_emergencia"
    );

    let mesesAteReservaValor: number | null = null;
    let mesesAteReservaStatus: StatusIndicador = "vermelho";
    let restanteReserva = 0;
    let aporteSugeridoReserva = 0;
    let semReserva = false;
    if (!reserva) {
      semReserva = true;
      mesesAteReservaValor = null;
      mesesAteReservaStatus = "vermelho";
    } else {
      restanteReserva = Math.max(0, reserva.valorAlvo - reserva.valorAtual);
      if (restanteReserva <= 0) {
        // Reserva ja completa
        mesesAteReservaValor = 0;
        mesesAteReservaStatus = "verde";
        aporteSugeridoReserva = 0;
      } else {
        // Sugere quitar em ate 12 meses (alinhado a faixa verde do roadmap).
        aporteSugeridoReserva = Math.ceil(restanteReserva / 12);
        mesesAteReservaValor =
          aporteSugeridoReserva > 0
            ? Math.ceil(restanteReserva / aporteSugeridoReserva)
            : 0;
        if (mesesAteReservaValor <= 12) mesesAteReservaStatus = "verde";
        else if (mesesAteReservaValor <= 24) mesesAteReservaStatus = "amarelo";
        else mesesAteReservaStatus = "vermelho";
      }
    }

    return {
      poupancaPercent: {
        valor: Math.round(poupancaPercentValor * 10) / 10, // 1 casa decimal
        status: poupancaStatus,
        numerador: receitaRecebida - despesaPaga,
        denominador: receitaRecebida,
      },
      comprometimentoFixo: {
        valor: Math.round(comprometimentoValor * 10) / 10,
        status: comprometimentoStatus,
        numerador: despesaFixaPaga,
        denominador: receitaRecebida,
      },
      diasReserva: {
        valor: diasReservaValor,
        status: diasReservaStatus,
        saldoTotal,
        despesaDiaria,
      },
      mesesAteReserva: {
        valor: mesesAteReservaValor,
        status: mesesAteReservaStatus,
        restante: restanteReserva,
        aporteSugerido: aporteSugeridoReserva,
        semReserva,
      },
    };
  },
});

// ============================================================
// MARCO 3.A — Modo Casal + Pagadores expandido
// ============================================================

// Quem pagou as despesas familiares no mes (agrupa por pessoaId).
// Considera apenas despesas marcadas como pagas via pagamentosDespesas do mes.
export const despesasPorPagadorCasal = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, pessoas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pessoas").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const { pagoSet } = await baixasDoMes(ctx, user.familyId, mes);
    const pessoaMap = new Map(pessoas.map((p) => [p._id as string, p]));

    type Bucket = {
      pessoaId: string;
      nome: string;
      totalPago: number;
      qtd: number;
      fotoUrl?: string;
      corTema: string;
      removida: boolean;
    };
    const SEM_PESSOA = "__sem_pessoa__";
    const buckets = new Map<string, Bucket>();

    for (const d of dMes) {
      if (!pagoSet.has(d._id as string)) continue;
      const valor = valorDespesaNoMes(d, mes);
      if (d.pessoaId) {
        const key = d.pessoaId as string;
        const p = pessoaMap.get(key);
        const b =
          buckets.get(key) ??
          {
            pessoaId: key,
            nome: p ? (p.apelido ?? p.nome) : "Removido",
            totalPago: 0,
            qtd: 0,
            fotoUrl: p?.fotoUrl,
            corTema: p?.corTema ?? "#94A3B8",
            removida: !p,
          };
        b.totalPago += valor;
        b.qtd += 1;
        buckets.set(key, b);
      } else {
        const b =
          buckets.get(SEM_PESSOA) ??
          {
            pessoaId: SEM_PESSOA,
            nome: "Sem atribuição",
            totalPago: 0,
            qtd: 0,
            fotoUrl: undefined,
            corTema: "#94A3B8",
            removida: false,
          };
        b.totalPago += valor;
        b.qtd += 1;
        buckets.set(SEM_PESSOA, b);
      }
    }

    const totalGeral = Array.from(buckets.values()).reduce((s, b) => s + b.totalPago, 0);
    return Array.from(buckets.values())
      .map((b) => ({
        ...b,
        percentual: totalGeral > 0 ? Math.round((b.totalPago / totalGeral) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalPago - a.totalPago);
  },
});

// Sugestao de divisao proporcional a renda do casal.
// Compara % renda recebida x % despesas pagas por cada pessoa.
export const divisaoProporcionalSugerida = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas, pessoas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pessoas").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const { pagoSet, recebidoSet } = await baixasDoMes(ctx, user.familyId, mes);

    // Renda total da familia (soma das receitas recebidas no mes).
    let totalRendaRecebida = 0;
    const rendaPorPessoa = new Map<string, number>();
    for (const r of rMes) {
      if (!recebidoSet.has(r._id as string)) continue;
      // Guard contra registros legados sem pessoaId (schema antigo).
      if (!r.pessoaId) continue;
      const v = valorReceitaNoMes(r, mes);
      totalRendaRecebida += v;
      const key = r.pessoaId as string;
      rendaPorPessoa.set(key, (rendaPorPessoa.get(key) ?? 0) + v);
    }

    // Despesas pagas total e por pessoa.
    let totalDespesasPagas = 0;
    const despesasPorPessoa = new Map<string, number>();
    for (const d of dMes) {
      if (!pagoSet.has(d._id as string)) continue;
      const v = valorDespesaNoMes(d, mes);
      totalDespesasPagas += v;
      if (d.pessoaId) {
        const key = d.pessoaId as string;
        despesasPorPessoa.set(key, (despesasPorPessoa.get(key) ?? 0) + v);
      }
    }

    // Sem dados de renda: nao da pra sugerir divisao.
    if (totalRendaRecebida <= 0) {
      return {
        semDados: true,
        totalRenda: 0,
        totalDespesas: totalDespesasPagas,
        pessoas: [] as Array<{
          pessoaId: string;
          nome: string;
          fotoUrl?: string;
          corTema: string;
          renda: number;
          rendaPercentual: number;
          despesasPercentual: number;
          sugerido: number;
          real: number;
          diff: number;
        }>,
      };
    }

    // Inclui todas as pessoas que aparecem em renda OU em despesas.
    const pessoaIdsEnvolvidas = new Set<string>([
      ...rendaPorPessoa.keys(),
      ...despesasPorPessoa.keys(),
    ]);
    const pessoaMap = new Map(pessoas.map((p) => [p._id as string, p]));

    const resultado = Array.from(pessoaIdsEnvolvidas).map((id) => {
      const p = pessoaMap.get(id);
      const renda = rendaPorPessoa.get(id) ?? 0;
      const real = despesasPorPessoa.get(id) ?? 0;
      const rendaPercentual = totalRendaRecebida > 0 ? renda / totalRendaRecebida : 0;
      const despesasPercentual = totalDespesasPagas > 0 ? real / totalDespesasPagas : 0;
      const sugerido = Math.round(totalDespesasPagas * rendaPercentual);
      const diff = real - sugerido;
      return {
        pessoaId: id,
        nome: p ? (p.apelido ?? p.nome) : "Removido",
        fotoUrl: p?.fotoUrl,
        corTema: p?.corTema ?? "#94A3B8",
        renda,
        rendaPercentual: Math.round(rendaPercentual * 1000) / 10,
        despesasPercentual: Math.round(despesasPercentual * 1000) / 10,
        sugerido,
        real,
        diff,
      };
    });

    return {
      semDados: false,
      totalRenda: totalRendaRecebida,
      totalDespesas: totalDespesasPagas,
      pessoas: resultado.sort((a, b) => b.renda - a.renda),
    };
  },
});

// 4) Proximos vencimentos nos proximos 7 dias (despesas nao pagas + receitas nao recebidas)
export const proximosVencimentos7Dias = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = todayISO();
    const mesAtual = hoje.slice(0, 7);
    const limite = addDaysISO(hoje, 7);
    const mesLimite = limite.slice(0, 7);

    // Quando hoje + 7 cair no proximo mes, considerar tambem despesas/receitas
    // do proximo mes para nao perder vencimentos como despesa fixa dia 02 quando
    // hoje = 28/mai.
    const meses = mesAtual === mesLimite ? [mesAtual] : [mesAtual, mesLimite];

    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    type Item = {
      tipo: "despesa" | "receita";
      id: string;
      descricao: string;
      valor: number;
      dataVencimento: string;
      contaId?: string;
    };

    const itens: Item[] = [];
    const idsDespesasJaIncluidas = new Set<string>();
    const idsReceitasJaIncluidas = new Set<string>();

    for (const mesAlvo of meses) {
      const dMes = despesas.filter((d) => isDespesaInMes(d, mesAlvo));
      const rMes = receitas.filter((r) => isReceitaInMes(r, mesAlvo));
      const { pagoSet, recebidoSet } = await baixasDoMes(ctx, user.familyId, mesAlvo);

      for (const d of dMes) {
        const idStr = d._id as string;
        if (idsDespesasJaIncluidas.has(idStr)) continue;
        if (pagoSet.has(idStr)) continue;
        const ov = (d.overrides ?? []).find((o: any) => o.mes === mesAlvo);
        const dataBase = ov?.dataVencimento ?? d.dataVencimento;
        const dataProj = projetarParaMes(dataBase, mesAlvo);
        if (dataProj >= hoje && dataProj <= limite) {
          itens.push({
            tipo: "despesa",
            id: idStr,
            descricao: ov?.descricao ?? d.descricao,
            valor: ov?.valor ?? d.valor,
            dataVencimento: dataProj,
            contaId: d.contaId as string | undefined,
          });
          idsDespesasJaIncluidas.add(idStr);
        }
      }

      for (const r of rMes) {
        const idStr = r._id as string;
        if (idsReceitasJaIncluidas.has(idStr)) continue;
        if (recebidoSet.has(idStr)) continue;
        const ov = (r.overrides ?? []).find((o: any) => o.mes === mesAlvo);
        const dataBase = ov?.dataPrevisao ?? r.dataPrevisao;
        const dataProj = projetarParaMes(dataBase, mesAlvo);
        if (dataProj >= hoje && dataProj <= limite) {
          itens.push({
            tipo: "receita",
            id: idStr,
            descricao: ov?.descricao ?? r.descricao,
            valor: ov?.valor ?? r.valor,
            dataVencimento: dataProj,
            contaId: r.contaId as string | undefined,
          });
          idsReceitasJaIncluidas.add(idStr);
        }
      }
    }

    return itens.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  },
});
