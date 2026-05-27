import { v } from "convex/values";
import { query, mutation, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id } from "../_generated/dataModel";

const TIPO_CONTA = v.union(
  v.literal("corrente"),
  v.literal("poupanca"),
  v.literal("dinheiro"),
  v.literal("aplicacao")
);

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const all = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    return all.sort((a, b) => {
      if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  },
});

export const getById = query({
  args: { sessionToken: v.string(), id: v.id("contas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conta = await ctx.db.get(id);
    if (!conta || conta.familyId !== user.familyId) throw new Error("Conta não encontrada");
    return conta;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    tipo: TIPO_CONTA,
    banco: v.optional(v.string()),
    saldoInicial: v.number(),
    saldoManual: v.optional(v.number()),
    cor: v.string(),
    icone: v.string(),
    ativa: v.boolean(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (!args.nome.trim()) throw new Error("Informe o nome da conta");
    return await ctx.db.insert("contas", {
      ...args,
      familyId: user.familyId,
      criadoPor: user._id,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("contas"),
    nome: v.optional(v.string()),
    tipo: v.optional(TIPO_CONTA),
    banco: v.optional(v.string()),
    saldoInicial: v.optional(v.number()),
    saldoManual: v.optional(v.number()),
    cor: v.optional(v.string()),
    icone: v.optional(v.string()),
    ativa: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conta = await ctx.db.get(id);
    if (!conta || conta.familyId !== user.familyId) throw new Error("Conta não encontrada");
    if (rest.nome !== undefined && !rest.nome.trim()) throw new Error("Informe o nome da conta");
    // Ao mudar tipo de "aplicacao" para outro, limpa explicitamente o saldoManual no banco.
    if (rest.tipo !== undefined && rest.tipo !== "aplicacao" && conta.tipo === "aplicacao") {
      await ctx.db.patch(id, { ...rest, saldoManual: undefined });
      return;
    }
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("contas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conta = await ctx.db.get(id);
    if (!conta || conta.familyId !== user.familyId) throw new Error("Conta não encontrada");

    const todasDespesas = await ctx.db
      .query("despesas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();
    if (todasDespesas.some((d) => d.contaId === id)) {
      throw new Error("Esta conta tem lançamentos registrados e não pode ser excluída. Você pode desativá-la em vez disso.");
    }

    const todasReceitas = await ctx.db
      .query("receitas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();
    if (todasReceitas.some((r) => r.contaId === id)) {
      throw new Error("Esta conta tem lançamentos registrados e não pode ser excluída. Você pode desativá-la em vez disso.");
    }

    const transfs = await ctx.db
      .query("transferencias")
      .withIndex("by_family_data", (q) => q.eq("familyId", user.familyId))
      .collect();
    if (transfs.some((t) => t.contaOrigemId === id || t.contaDestinoId === id)) {
      throw new Error("Esta conta tem transferências registradas e não pode ser excluída. Você pode desativá-la em vez disso.");
    }

    await ctx.db.delete(id);
  },
});

interface SaldoDetalhado {
  saldoInicial: number;
  totalReceitas: number;
  totalDespesas: number;
  totalTransferenciasEntradas: number;
  totalTransferenciasSaidas: number;
  saldoCalculado: number;
  saldoFinal: number;
  ehManual: boolean;
  saldoManual?: number;
}

async function calcularSaldoConta(
  ctx: QueryCtx,
  contaId: Id<"contas">,
  familyId: string
): Promise<SaldoDetalhado> {
  const conta = await ctx.db.get(contaId);
  if (!conta || conta.familyId !== familyId) {
    throw new Error("Conta não encontrada");
  }

  // RECEITAS: iteramos TODOS os recebimentos da família e atribuímos
  // à conta efetiva = recebimento.contaId ?? receita.contaId (fallback legacy).
  // Assim a escolha de conta feita no momento do "Efetivar" sobrescreve a do cadastro.
  const todosRecebimentos = await ctx.db
    .query("recebimentosReceitas")
    .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId))
    .collect();

  let totalReceitas = 0;
  for (const rec of todosRecebimentos) {
    if (!rec.dataRecebimento) continue;
    const contaEfetiva = rec.contaId;
    let contaResolvida: Id<"contas"> | undefined = contaEfetiva;
    let receita = null as null | { valor: number; contaId?: Id<"contas"> };
    if (!contaResolvida) {
      const r = await ctx.db.get(rec.receitaId);
      if (!r) continue;
      receita = { valor: r.valor, contaId: r.contaId };
      contaResolvida = r.contaId;
    }
    if (contaResolvida !== contaId) continue;
    // Precisa do valor da receita pra fallback de valorRecebido
    if (!receita) {
      const r = await ctx.db.get(rec.receitaId);
      if (!r) continue;
      receita = { valor: r.valor, contaId: r.contaId };
    }
    totalReceitas += rec.valorRecebido ?? receita.valor;
  }

  // DESPESAS: idem — pagamento.contaId ?? despesa.contaId. Exclui despesas com cartao preenchido.
  const todosPagamentos = await ctx.db
    .query("pagamentosDespesas")
    .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId))
    .collect();

  let totalDespesas = 0;
  for (const p of todosPagamentos) {
    if (!p.dataPagamento) continue;
    const d = await ctx.db.get(p.despesaId);
    if (!d) continue;
    if (d.cartao) continue; // cartão não impacta saldo de conta
    const contaResolvida = p.contaId ?? d.contaId;
    if (contaResolvida !== contaId) continue;
    totalDespesas += p.valorPago ?? d.valor;
  }

  // Transferencias
  const transfs = await ctx.db
    .query("transferencias")
    .withIndex("by_family_data", (q) => q.eq("familyId", familyId))
    .collect();

  let totalTransferenciasEntradas = 0;
  let totalTransferenciasSaidas = 0;
  for (const t of transfs) {
    if (t.contaDestinoId === contaId) totalTransferenciasEntradas += t.valor;
    if (t.contaOrigemId === contaId) totalTransferenciasSaidas += t.valor;
  }

  const saldoCalculado =
    conta.saldoInicial +
    totalReceitas -
    totalDespesas +
    totalTransferenciasEntradas -
    totalTransferenciasSaidas;

  const ehManual = conta.tipo === "aplicacao" && conta.saldoManual !== undefined;
  const saldoFinal = ehManual ? (conta.saldoManual as number) : saldoCalculado;

  return {
    saldoInicial: conta.saldoInicial,
    totalReceitas,
    totalDespesas,
    totalTransferenciasEntradas,
    totalTransferenciasSaidas,
    saldoCalculado,
    saldoFinal,
    ehManual,
    saldoManual: conta.saldoManual,
  };
}

export const saldoDetalhado = query({
  args: { sessionToken: v.string(), contaId: v.id("contas") },
  handler: async (ctx, { sessionToken, contaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await calcularSaldoConta(ctx, contaId, user.familyId);
  },
});

export const saldoConsolidado = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const ativas = contas.filter((c) => c.ativa);
    let total = 0;
    for (const c of ativas) {
      const detalhe = await calcularSaldoConta(ctx, c._id, user.familyId);
      total += detalhe.saldoFinal;
    }
    return { total, totalContasAtivas: ativas.length };
  },
});

/**
 * Retorna lista de contas com saldo detalhado de cada uma. Usada na página de contas
 * para evitar N+1 queries no cliente.
 */
export const listComSaldos = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const contas = await ctx.db
      .query("contas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const ordenadas = contas.sort((a, b) => {
      if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    const result = [];
    for (const c of ordenadas) {
      const detalhe = await calcularSaldoConta(ctx, c._id, user.familyId);
      result.push({ ...c, saldo: detalhe });
    }
    return result;
  },
});

// Atualiza o saldo manual de uma conta de aplicacao e registra historico.
// Idempotencia por data: se ja existe registro nesse dia, atualiza ele.
// Se nao for passada data, usa hoje (UTC slice 0,10).
export const atualizarSaldoManual = mutation({
  args: {
    sessionToken: v.string(),
    contaId: v.id("contas"),
    novoSaldo: v.number(), // centavos
    data: v.optional(v.string()), // YYYY-MM-DD
  },
  handler: async (ctx, { sessionToken, contaId, novoSaldo, data }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conta = await ctx.db.get(contaId);
    if (!conta || conta.familyId !== user.familyId) {
      throw new Error("Conta não encontrada");
    }
    if (conta.tipo !== "aplicacao") {
      throw new Error("Atualização de saldo manual disponível apenas para contas de aplicação");
    }
    if (!Number.isFinite(novoSaldo) || novoSaldo < 0) {
      throw new Error("Informe um saldo válido (>= 0)");
    }

    const dataEfetiva = data ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEfetiva)) {
      throw new Error("Data inválida");
    }

    // 1) Atualiza saldo manual da conta (sempre vira o saldo vigente).
    await ctx.db.patch(contaId, { saldoManual: novoSaldo });

    // 2) Idempotencia: se ja tem registro nesse dia, atualiza valor; senao, cria.
    const existente = await ctx.db
      .query("historicoSaldoManual")
      .withIndex("by_conta_data", (q) => q.eq("contaId", contaId).eq("data", dataEfetiva))
      .unique();

    if (existente) {
      await ctx.db.patch(existente._id, { valor: novoSaldo });
      return { atualizado: true, registroId: existente._id };
    }

    const registroId = await ctx.db.insert("historicoSaldoManual", {
      contaId,
      valor: novoSaldo,
      data: dataEfetiva,
      familyId: user.familyId,
      criadoPor: user._id,
      criadoEm: new Date().toISOString(),
    });
    return { atualizado: false, registroId };
  },
});

// Retorna ate `meses` snapshots do historico de saldo manual da conta.
// Inclui ate o ultimo registro de cada mes nos ultimos N meses (calendar).
export const historicoSaldoAplicacao = query({
  args: {
    sessionToken: v.string(),
    contaId: v.id("contas"),
    meses: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, contaId, meses }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conta = await ctx.db.get(contaId);
    if (!conta || conta.familyId !== user.familyId) {
      throw new Error("Conta não encontrada");
    }

    const N = typeof meses === "number" && meses > 0 ? Math.min(meses, 24) : 12;

    const todos = await ctx.db
      .query("historicoSaldoManual")
      .withIndex("by_conta_data", (q) => q.eq("contaId", contaId))
      .collect();

    // Calcula limite inferior: N meses atras a partir de hoje.
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - (N - 1), 1);
    const inicioISO = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-01`;

    const filtrados = todos
      .filter((h) => h.data >= inicioISO)
      .sort((a, b) => a.data.localeCompare(b.data));

    return filtrados.map((h) => ({ data: h.data, valor: h.valor }));
  },
});

/**
 * Diagnóstico completo de saldos.
 * Retorna breakdown por conta + lançamentos efetivados que NÃO afetam saldo
 * (sem contaId no pagamento/recebimento NEM na despesa/receita original).
 *
 * Útil pra entender por que "saldo do período" ≠ "saldo efetivo".
 */
export const diagnostico = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const familyId = user.familyId;

    // Carrega tudo de uma vez
    const [contas, todosPagamentos, todosRecebimentos, todasDespesas, todasReceitas] =
      await Promise.all([
        ctx.db.query("contas").withIndex("by_family", (q) => q.eq("familyId", familyId)).collect(),
        ctx.db.query("pagamentosDespesas").withIndex("by_familia_mes", (q) => q.eq("familyId", familyId)).collect(),
        ctx.db.query("recebimentosReceitas").withIndex("by_familia_mes", (q) => q.eq("familyId", familyId)).collect(),
        ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", familyId)).collect(),
        ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", familyId)).collect(),
      ]);

    const despesaMap = new Map(todasDespesas.map((d) => [d._id as string, d]));
    const receitaMap = new Map(todasReceitas.map((r) => [r._id as string, r]));

    // Por conta: breakdown
    const breakdownPorConta = await Promise.all(
      contas.map(async (c) => {
        const detalhe = await calcularSaldoConta(ctx, c._id, familyId);
        return {
          _id: c._id,
          nome: c.nome,
          tipo: c.tipo,
          banco: c.banco,
          cor: c.cor,
          icone: c.icone,
          ativa: c.ativa,
          saldoInicial: detalhe.saldoInicial,
          totalReceitas: detalhe.totalReceitas,
          totalDespesas: detalhe.totalDespesas,
          totalTransferenciasEntradas: detalhe.totalTransferenciasEntradas,
          totalTransferenciasSaidas: detalhe.totalTransferenciasSaidas,
          saldoFinal: detalhe.saldoFinal,
          ehManual: detalhe.ehManual,
          saldoManual: detalhe.saldoManual,
        };
      })
    );

    // Pagamentos sem conta resolvida (nem no pagamento, nem na despesa)
    const pagamentosSemConta: Array<{
      _id: string;
      despesaId: string;
      descricao: string;
      valor: number;
      dataPagamento: string;
      mes: string;
      cartao?: string;
    }> = [];
    let valorSemContaDespesas = 0;
    for (const p of todosPagamentos) {
      if (!p.dataPagamento) continue;
      const d = despesaMap.get(p.despesaId as string);
      if (!d) continue;
      if (d.cartao) continue; // cartão é tratado separadamente
      const contaResolvida = p.contaId ?? d.contaId;
      if (contaResolvida) continue; // tem conta — já entra no saldo
      const valor = p.valorPago ?? d.valor;
      pagamentosSemConta.push({
        _id: p._id as string,
        despesaId: p.despesaId as string,
        descricao: d.descricao,
        valor,
        dataPagamento: p.dataPagamento,
        mes: p.mes,
        cartao: d.cartao,
      });
      valorSemContaDespesas += valor;
    }

    // Recebimentos sem conta resolvida
    const recebimentosSemConta: Array<{
      _id: string;
      receitaId: string;
      descricao: string;
      valor: number;
      dataRecebimento: string;
      mes: string;
    }> = [];
    let valorSemContaReceitas = 0;
    for (const rec of todosRecebimentos) {
      if (!rec.dataRecebimento) continue;
      const r = receitaMap.get(rec.receitaId as string);
      if (!r) continue;
      const contaResolvida = rec.contaId ?? r.contaId;
      if (contaResolvida) continue;
      const valor = rec.valorRecebido ?? r.valor;
      recebimentosSemConta.push({
        _id: rec._id as string,
        receitaId: rec.receitaId as string,
        descricao: r.descricao,
        valor,
        dataRecebimento: rec.dataRecebimento,
        mes: rec.mes,
      });
      valorSemContaReceitas += valor;
    }

    // Despesas de cartão efetivadas (não impactam saldo de conta — entram em fatura)
    let valorPagoEmCartao = 0;
    let qtdPagoEmCartao = 0;
    for (const p of todosPagamentos) {
      if (!p.dataPagamento) continue;
      const d = despesaMap.get(p.despesaId as string);
      if (!d || !d.cartao) continue;
      valorPagoEmCartao += p.valorPago ?? d.valor;
      qtdPagoEmCartao += 1;
    }

    // Total consolidado
    const totalSaldoFinal = breakdownPorConta
      .filter((c) => c.ativa)
      .reduce((s, c) => s + c.saldoFinal, 0);
    const totalSaldoInicial = breakdownPorConta
      .filter((c) => c.ativa)
      .reduce((s, c) => s + c.saldoInicial, 0);

    return {
      contas: breakdownPorConta.sort((a, b) => {
        if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
        return a.nome.localeCompare(b.nome, "pt-BR");
      }),
      pagamentosSemConta: pagamentosSemConta.sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento)),
      recebimentosSemConta: recebimentosSemConta.sort((a, b) => b.dataRecebimento.localeCompare(a.dataRecebimento)),
      resumo: {
        totalSaldoFinal,
        totalSaldoInicial,
        qtdContasAtivas: breakdownPorConta.filter((c) => c.ativa).length,
        valorSemContaDespesas,
        qtdSemContaDespesas: pagamentosSemConta.length,
        valorSemContaReceitas,
        qtdSemContaReceitas: recebimentosSemConta.length,
        impactoSemContaLiquido: valorSemContaReceitas - valorSemContaDespesas,
        valorPagoEmCartao,
        qtdPagoEmCartao,
      },
    };
  },
});
