import { v } from "convex/values";
import { query, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Doc, Id } from "../_generated/dataModel";

// ============================================================================
// MARCO 3.B - Money Date (pauta de reuniao mensal do casal)
// ============================================================================
//
// Reune num so objeto todas as informacoes necessarias pro casal sentar e
// revisar o mes: resumo, vitorias, atencoes, decisoes e indicadores de saude.
//
// Reaproveita logica existente (resumoMes, indicadoresSaude, categoriasEstouradas,
// categoriasComparativo etc.) — reimplementada aqui para evitar acoplamento
// circular entre arquivos do mesmo modulo.

// ---------------- Helpers de tempo ----------------

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------- Helpers de despesa/receita ----------------

function isDespesaInMes(d: Doc<"despesas">, mes: string): boolean {
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
    const meses: number[] = d.mesesSazonais ?? [];
    return meses.includes(mesAlvoNum);
  }
  if (d.tipo === "parcelada") {
    const parcelaInicial = d.parcelaAtual ?? 1;
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && parcelaInicial + offset <= (d.totalParcelas ?? 1);
  }
  return false;
}

function isReceitaInMes(r: Doc<"receitas">, mes: string): boolean {
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

function valorDespesaNoMes(d: Doc<"despesas">, mes: string): number {
  const ov = (d.overrides ?? []).find((o) => o.mes === mes);
  if (ov && typeof ov.valor === "number") return ov.valor;
  return d.valor;
}

function valorReceitaNoMes(r: Doc<"receitas">, mes: string): number {
  const ov = (r.overrides ?? []).find((o) => o.mes === mes);
  if (ov && typeof ov.valor === "number") return ov.valor;
  return r.valor;
}

async function baixasDoMes(ctx: QueryCtx, familyId: string, mes: string) {
  const [pagamentos, recebimentos] = await Promise.all([
    ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId).eq("mes", mes))
      .collect(),
    ctx.db
      .query("recebimentosReceitas")
      .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId).eq("mes", mes))
      .collect(),
  ]);
  const pagoSet = new Set(pagamentos.map((p) => p.despesaId as string));
  const recebidoSet = new Set(recebimentos.map((r) => r.receitaId as string));
  return { pagoSet, recebidoSet };
}

// ---------------- Helpers de saldo (para diasReserva) ----------------

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

// ---------------- Helper: percentual de variacao ----------------

function deltaPercent(atual: number, anterior: number): number {
  if (anterior === 0) {
    if (atual === 0) return 0;
    return atual > 0 ? 100 : -100;
  }
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10; // 1 casa decimal
}

// ---------------- Tipos do retorno ----------------

export interface MoneyDateData {
  mes: string;
  mesAnterior: string;
  semComparativo: boolean;
  resumo: {
    receitas: { atual: number; anterior: number; deltaPercent: number };
    despesas: { atual: number; anterior: number; deltaPercent: number };
    saldo: { atual: number; anterior: number; deltaPercent: number };
  };
  vitorias: Array<{
    tipo:
      | "categoria_melhorou"
      | "meta_atingida"
      | "divida_quitada"
      | "reserva_completa";
    titulo: string;
    descricao: string;
    valor?: number;
  }>;
  atencoes: Array<{
    tipo:
      | "categoria_estourada"
      | "objetivo_atrasado"
      | "saude_baixa";
    titulo: string;
    descricao: string;
    valor?: number;
  }>;
  decisoes: Array<{
    titulo: string;
    sugestao: string;
  }>;
  indicadores: {
    poupancaPercent: number;
    comprometimentoFixo: number;
    diasReserva: number;
  };
}

type StatusIndicador = "verde" | "amarelo" | "vermelho";

// ============================================================================
// Query principal
// ============================================================================

export const gerar = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }): Promise<MoneyDateData> => {
    const user = await getCurrentUser(ctx, sessionToken);
    const familyId = user.familyId;
    const mesAnterior = shiftMonth(mes, -1);

    // -------------------------------------------------------------
    // Carrega dados base
    // -------------------------------------------------------------
    const [
      despesas,
      receitas,
      categorias,
      limites,
      metas,
      dividas,
      pagamentosDividasMes,
      contas,
    ] = await Promise.all([
      ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("receitas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("categorias")
        .withIndex("by_family_tipo", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("limitesOrcamento")
        .withIndex("by_family_mes", (q) => q.eq("familyId", familyId).eq("mes", mes))
        .collect(),
      ctx.db
        .query("metas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("dividas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("pagamentosDividas")
        .withIndex("by_family_mes", (q) =>
          q.eq("familyId", familyId).eq("mes", mes)
        )
        .collect(),
      ctx.db
        .query("contas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
    ]);

    const [baixasAtual, baixasAnt] = await Promise.all([
      baixasDoMes(ctx, familyId, mes),
      baixasDoMes(ctx, familyId, mesAnterior),
    ]);

    // -------------------------------------------------------------
    // RESUMO — receitas, despesas, saldo (atual vs anterior)
    // -------------------------------------------------------------
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));
    const dMesAnt = despesas.filter((d) => isDespesaInMes(d, mesAnterior));
    const rMesAnt = receitas.filter((r) => isReceitaInMes(r, mesAnterior));

    // Considera apenas RECEBIDAS / PAGAS para o resumo (alinhado a saude financeira)
    const receitasAtual = rMes
      .filter((r) => baixasAtual.recebidoSet.has(r._id as string))
      .reduce((s, r) => s + valorReceitaNoMes(r, mes), 0);
    const despesasAtual = dMes
      .filter((d) => baixasAtual.pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);

    const receitasAnt = rMesAnt
      .filter((r) => baixasAnt.recebidoSet.has(r._id as string))
      .reduce((s, r) => s + valorReceitaNoMes(r, mesAnterior), 0);
    const despesasAnt = dMesAnt
      .filter((d) => baixasAnt.pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesaNoMes(d, mesAnterior), 0);

    const saldoAtual = receitasAtual - despesasAtual;
    const saldoAntCalc = receitasAnt - despesasAnt;

    // Sem mes anterior = sem despesas/receitas registradas no mes anterior.
    const semComparativo = dMesAnt.length === 0 && rMesAnt.length === 0;

    const resumo = {
      receitas: {
        atual: receitasAtual,
        anterior: receitasAnt,
        deltaPercent: semComparativo ? 0 : deltaPercent(receitasAtual, receitasAnt),
      },
      despesas: {
        atual: despesasAtual,
        anterior: despesasAnt,
        deltaPercent: semComparativo ? 0 : deltaPercent(despesasAtual, despesasAnt),
      },
      saldo: {
        atual: saldoAtual,
        anterior: saldoAntCalc,
        deltaPercent: semComparativo ? 0 : deltaPercent(saldoAtual, saldoAntCalc),
      },
    };

    // -------------------------------------------------------------
    // Auxiliar: gastos por categoria (consolidado) num mes
    // Considera TODAS as despesas do mes (nao apenas pagas), igual ao
    // comportamento de categoriasComparativo.
    // -------------------------------------------------------------
    const catMap = new Map(categorias.map((c) => [c._id as string, c]));

    function consolidadoCategoria(mesAlvo: string): Map<string, number> {
      const dMesAlvo = despesas.filter((d) => isDespesaInMes(d, mesAlvo));
      const baseMap = new Map<string, number>();
      for (const d of dMesAlvo) {
        const v = valorDespesaNoMes(d, mesAlvo);
        baseMap.set(d.categoriaId as string, (baseMap.get(d.categoriaId as string) ?? 0) + v);
      }
      const consolidado = new Map<string, number>();
      for (const [catId, valor] of baseMap) {
        const cat = catMap.get(catId);
        const chave = cat?.categoriaPaiId ? (cat.categoriaPaiId as string) : catId;
        consolidado.set(chave, (consolidado.get(chave) ?? 0) + valor);
      }
      return consolidado;
    }

    const consAtual = consolidadoCategoria(mes);
    const consAnt = consolidadoCategoria(mesAnterior);

    // -------------------------------------------------------------
    // VITORIAS
    // -------------------------------------------------------------
    const vitorias: MoneyDateData["vitorias"] = [];

    // 1) Categorias que reduziram >=10%
    if (!semComparativo) {
      type MelhorouItem = {
        nome: string;
        reduzAbs: number; // centavos
        reduzPercent: number;
      };
      const melhoraram: MelhorouItem[] = [];
      for (const [catId, valorAnt] of consAnt) {
        if (valorAnt <= 0) continue;
        const valorAt = consAtual.get(catId) ?? 0;
        if (valorAt >= valorAnt) continue; // nao reduziu
        const reduz = valorAnt - valorAt;
        const reduzPct = (reduz / valorAnt) * 100;
        if (reduzPct < 10) continue;
        const cat = catMap.get(catId);
        if (!cat) continue;
        melhoraram.push({
          nome: cat.nome,
          reduzAbs: reduz,
          reduzPercent: Math.round(reduzPct),
        });
      }
      melhoraram
        .sort((a, b) => b.reduzAbs - a.reduzAbs)
        .slice(0, 3)
        .forEach((m) => {
          vitorias.push({
            tipo: "categoria_melhorou",
            titulo: `${m.nome} reduziu ${m.reduzPercent}%`,
            descricao: `Economia de ${formatCentavos(m.reduzAbs)} comparado ao mes anterior`,
            valor: m.reduzAbs,
          });
        });
    }

    // 2) Metas atingidas neste mes
    // Heuristica: meta com valorAtual >= valorAlvo e que recebeu pelo menos
    // um aporte no mes (signo de "atingida" no proprio mes).
    const aportesPorMeta = new Map<string, Doc<"aportesMeta">[]>();
    for (const meta of metas.filter((m) => m.ativa)) {
      const aportes = await ctx.db
        .query("aportesMeta")
        .withIndex("by_meta", (q) => q.eq("metaId", meta._id))
        .collect();
      aportesPorMeta.set(meta._id as string, aportes);
    }
    for (const meta of metas.filter((m) => m.ativa)) {
      if (meta.valorAlvo <= 0) continue;
      const atingiu = meta.valorAtual >= meta.valorAlvo;
      if (!atingiu) continue;
      const aportes = aportesPorMeta.get(meta._id as string) ?? [];
      const aportouNoMes = aportes.some((a) => a.data.slice(0, 7) === mes);
      if (!aportouNoMes) continue;
      if (meta.tipoEspecial === "reserva_emergencia") {
        vitorias.push({
          tipo: "reserva_completa",
          titulo: "Reserva de Emergencia completa",
          descricao: `Meta de ${formatCentavos(meta.valorAlvo)} atingida. Tranquilidade desbloqueada!`,
          valor: meta.valorAlvo,
        });
      } else {
        vitorias.push({
          tipo: "meta_atingida",
          titulo: `Meta atingida: ${meta.titulo}`,
          descricao: `Voces juntaram ${formatCentavos(meta.valorAlvo)}. Hora de comemorar.`,
          valor: meta.valorAlvo,
        });
      }
    }

    // 3) Dividas quitadas no mes (registrou pagamento neste mes que zerou saldo)
    const pagamentosPorDivida = new Map<string, Doc<"pagamentosDividas">[]>();
    for (const p of pagamentosDividasMes) {
      const key = p.dividaId as string;
      const arr = pagamentosPorDivida.get(key) ?? [];
      arr.push(p);
      pagamentosPorDivida.set(key, arr);
    }
    for (const divida of dividas) {
      // divida nao ativa + tem pagamento no mes que zerou
      if (divida.ativa) continue;
      const pags = pagamentosPorDivida.get(divida._id as string) ?? [];
      if (pags.length === 0) continue;
      const zerouNoMes = pags.some((p) => p.saldoAposPagamento <= 0);
      if (!zerouNoMes) continue;
      vitorias.push({
        tipo: "divida_quitada",
        titulo: `Divida quitada: ${divida.nome}`,
        descricao: `Voces liquidaram ${formatCentavos(divida.valorOriginal)} em ${divida.totalParcelas} parcelas.`,
        valor: divida.valorOriginal,
      });
    }

    // -------------------------------------------------------------
    // INDICADORES (poupanca, comprometimento, diasReserva)
    // -------------------------------------------------------------
    const despesaFixaPaga = dMes
      .filter((d) => d.tipo === "fixa" && baixasAtual.pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesaNoMes(d, mes), 0);

    let poupancaPercentValor = 0;
    let poupancaStatus: StatusIndicador = "amarelo";
    if (receitasAtual > 0) {
      poupancaPercentValor = ((receitasAtual - despesasAtual) / receitasAtual) * 100;
      if (poupancaPercentValor >= 20) poupancaStatus = "verde";
      else if (poupancaPercentValor >= 10) poupancaStatus = "amarelo";
      else poupancaStatus = "vermelho";
    }

    let comprometimentoValor = 0;
    let comprometimentoStatus: StatusIndicador = "amarelo";
    if (receitasAtual > 0) {
      comprometimentoValor = (despesaFixaPaga / receitasAtual) * 100;
      if (comprometimentoValor <= 50) comprometimentoStatus = "verde";
      else if (comprometimentoValor <= 70) comprometimentoStatus = "amarelo";
      else comprometimentoStatus = "vermelho";
    }

    // Saldo total das contas ativas + media despesas 3m -> dias reserva
    const ativas = contas.filter((c) => c.ativa);
    let saldoTotal = 0;
    for (const c of ativas) {
      saldoTotal += await calcularSaldoContaInterno(ctx, c._id, familyId);
    }
    // Media despesas dos 3 meses anteriores (nao inclui o atual)
    let mediaDespesas3m = 0;
    {
      let total = 0;
      const N = 3;
      for (let i = 1; i <= N; i++) {
        const m = shiftMonth(mes, -i);
        total += despesas
          .filter((d) => isDespesaInMes(d, m))
          .reduce((s, d) => s + valorDespesaNoMes(d, m), 0);
      }
      mediaDespesas3m = Math.round(total / N);
    }
    const despesaDiaria = mediaDespesas3m > 0 ? Math.round(mediaDespesas3m / 30) : 0;

    let diasReservaValor: number;
    let diasReservaStatus: StatusIndicador;
    if (despesaDiaria <= 0) {
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

    // -------------------------------------------------------------
    // ATENCOES
    // -------------------------------------------------------------
    const atencoes: MoneyDateData["atencoes"] = [];

    // 1) Categorias estouradas (do orcamento) - somente mae/orfa, consolidado
    const realizadoPorCat = new Map<string, number>();
    for (const d of dMes) {
      const k = d.categoriaId as string;
      realizadoPorCat.set(k, (realizadoPorCat.get(k) ?? 0) + valorDespesaNoMes(d, mes));
    }
    const limitePorCat = new Map<string, number>();
    for (const l of limites) limitePorCat.set(l.categoriaId as string, l.valorLimite);

    const filhasPorPai = new Map<string, Doc<"categorias">[]>();
    for (const c of categorias) {
      if (c.tipo !== "despesa") continue;
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!filhasPorPai.has(k)) filhasPorPai.set(k, []);
        filhasPorPai.get(k)!.push(c);
      }
    }
    const idsConsiderados = new Set<string>();
    for (const c of categorias) {
      if (c.tipo !== "despesa") continue;
      if (!c.categoriaPaiId) idsConsiderados.add(c._id as string);
      else if (c.categoriaPaiId && !catMap.has(c.categoriaPaiId as string)) {
        idsConsiderados.add(c._id as string);
      }
    }
    type CatEstouradaInfo = {
      categoriaId: string;
      nome: string;
      realizado: number;
      limite: number;
      percentual: number;
    };
    const estouradas: CatEstouradaInfo[] = [];
    for (const id of idsConsiderados) {
      const cat = catMap.get(id);
      if (!cat) continue;
      const filhas = filhasPorPai.get(id) ?? [];
      const realizadoProprio = realizadoPorCat.get(id) ?? 0;
      const realizadoFilhas = filhas.reduce(
        (s, f) => s + (realizadoPorCat.get(f._id as string) ?? 0),
        0
      );
      const realizado = realizadoProprio + realizadoFilhas;
      const limiteProprio = limitePorCat.get(id);
      const limiteFilhas = filhas.reduce(
        (s, f) => s + (limitePorCat.get(f._id as string) ?? 0),
        0
      );
      const limite = limiteProprio ?? limiteFilhas;
      if (limite <= 0) continue;
      const pct = (realizado / limite) * 100;
      if (pct < 100) continue;
      estouradas.push({
        categoriaId: id,
        nome: cat.nome,
        realizado,
        limite,
        percentual: Math.round(pct),
      });
    }
    estouradas
      .sort((a, b) => b.percentual - a.percentual)
      .forEach((e) => {
        const excesso = e.realizado - e.limite;
        atencoes.push({
          tipo: "categoria_estourada",
          titulo: `${e.nome} estourou ${e.percentual}%`,
          descricao: `Gastou ${formatCentavos(e.realizado)} de ${formatCentavos(e.limite)} (excedeu em ${formatCentavos(excesso)})`,
          valor: excesso,
        });
      });

    // 2) Objetivos com prazo vencido
    const hoje = todayISO();
    for (const meta of metas.filter((m) => m.ativa)) {
      if (!meta.prazo) continue;
      if (meta.prazo >= hoje) continue;
      if (meta.valorAtual >= meta.valorAlvo) continue;
      const restante = meta.valorAlvo - meta.valorAtual;
      atencoes.push({
        tipo: "objetivo_atrasado",
        titulo: `Objetivo atrasado: ${meta.titulo}`,
        descricao: `Prazo era ${formatDateBR(meta.prazo)} e ainda faltam ${formatCentavos(restante)}.`,
        valor: restante,
      });
    }

    // 3) Indicadores em vermelho / amarelo critico
    if (poupancaStatus === "vermelho") {
      atencoes.push({
        tipo: "saude_baixa",
        titulo: "Taxa de poupanca abaixo de 10%",
        descricao: `Voces pouparam apenas ${formatPercent(poupancaPercentValor)}% da receita este mes. Meta saudavel: >=20%.`,
      });
    }
    if (comprometimentoStatus === "vermelho") {
      atencoes.push({
        tipo: "saude_baixa",
        titulo: "Comprometimento com fixos acima de 70%",
        descricao: `Despesas fixas consumiram ${formatPercent(comprometimentoValor)}% da receita. Meta saudavel: <=50%.`,
      });
    }
    if (diasReservaStatus === "vermelho" && despesaDiaria > 0) {
      atencoes.push({
        tipo: "saude_baixa",
        titulo: "Reserva financeira baixa",
        descricao: `O saldo cobre apenas ${diasReservaValor} dias de despesas. Saudavel: >=180 dias.`,
      });
    }

    // -------------------------------------------------------------
    // DECISOES sugeridas
    // -------------------------------------------------------------
    const decisoes: MoneyDateData["decisoes"] = [];

    estouradas.forEach((e) => {
      decisoes.push({
        titulo: `Revisar orcamento de ${e.nome}`,
        sugestao: `A categoria estourou em ${e.percentual - 100}%. Avaliem se o limite precisa subir ou se ha gastos para cortar.`,
      });
    });

    for (const meta of metas.filter((m) => m.ativa)) {
      if (!meta.prazo) continue;
      if (meta.prazo >= hoje) continue;
      if (meta.valorAtual >= meta.valorAlvo) continue;
      decisoes.push({
        titulo: `Decidir prazo de "${meta.titulo}"`,
        sugestao: `Prazo venceu em ${formatDateBR(meta.prazo)}. Mantem prazo (aumentando aporte) ou estende?`,
      });
    }

    // Reserva < 6 meses (180 dias)
    if (despesaDiaria > 0 && diasReservaValor < 180 && diasReservaValor !== 999) {
      decisoes.push({
        titulo: "Aumentar aporte da Reserva de Emergencia",
        sugestao: `A reserva atual cobre ${diasReservaValor} dias. Meta saudavel: 180 dias (6 meses). Avaliem aumentar o aporte mensal.`,
      });
    }

    // Divida cara (taxa > 5% am ou equivalente)
    for (const divida of dividas.filter((d) => d.ativa)) {
      const taxaMensal =
        divida.taxaPeriodicidade === "mensal"
          ? divida.taxaJuros
          : Math.pow(1 + divida.taxaJuros / 100, 1 / 12) * 100 - 100;
      if (taxaMensal > 5) {
        decisoes.push({
          titulo: `Avaliar quitacao antecipada de ${divida.nome}`,
          sugestao: `Juros de ${taxaMensal.toFixed(1).replace(".", ",")}% ao mes — saldo devedor ${formatCentavos(divida.saldoDevedor)}. Vale comparar com aporte em reserva.`,
        });
      }
    }

    return {
      mes,
      mesAnterior,
      semComparativo,
      resumo,
      vitorias,
      atencoes,
      decisoes,
      indicadores: {
        poupancaPercent: Math.round(poupancaPercentValor * 10) / 10,
        comprometimentoFixo: Math.round(comprometimentoValor * 10) / 10,
        diasReserva: diasReservaValor,
      },
    };
  },
});

// ---------------- Helpers de formatacao (server-side) ----------------

function formatCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatPercent(valor: number): string {
  return (Math.round(valor * 10) / 10).toFixed(1).replace(".", ",");
}
