import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser, logExclusao } from "../_helpers";
import { resolverCartaoEscrita } from "./cartoes";

// ===== Helpers de recorrencia =====

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

// Aplica overrides (se houver) sobre os campos do registro para um mes alvo.
// Retorna o item original (sem mutar) com possiveis substituicoes em valor/descricao/dataVencimento.
function aplicarOverrideDespesa<
  T extends {
    valor: number;
    descricao: string;
    dataVencimento: string;
    overrides?: Array<{
      mes: string;
      valor?: number;
      descricao?: string;
      dataVencimento?: string;
      excluida?: boolean;
    }>;
  }
>(d: T, mes: string): T {
  const ov = (d.overrides ?? []).find((o) => o.mes === mes);
  if (!ov) return d;
  return {
    ...d,
    valor: ov.valor ?? d.valor,
    descricao: ov.descricao ?? d.descricao,
    dataVencimento: ov.dataVencimento ?? d.dataVencimento,
  };
}

// Checa se a despesa tem override marcado como excluída para o mês.
function despesaExcluidaNoMes(
  d: { overrides?: Array<{ mes: string; excluida?: boolean }> },
  mes: string
): boolean {
  return !!(d.overrides ?? []).find((o) => o.mes === mes && o.excluida === true);
}

// Determina se uma despesa do tipo `fixa` deve aparecer no mes alvo,
// considerando periodicidade (mensal | anual | sazonal). Default: mensal.
function fixaInMes(
  d: { dataVencimento: string; periodicidade?: "mensal" | "anual" | "sazonal"; mesesSazonais?: number[] },
  mes: string
): boolean {
  const origMes = d.dataVencimento.slice(0, 7);
  if (mes < origMes) return false;
  const periodicidade = d.periodicidade ?? "mensal";
  if (periodicidade === "mensal") return true;
  const mesAlvoNum = Number(mes.slice(5, 7));
  if (periodicidade === "anual") {
    const mesOrigemNum = Number(origMes.slice(5, 7));
    return mesOrigemNum === mesAlvoNum;
  }
  // sazonal
  const meses = d.mesesSazonais ?? [];
  return meses.includes(mesAlvoNum);
}

// Lista despesas do mês (YYYY-MM), incluindo projeção virtual de fixas/parceladas
export const listByMonth = query({
  args: { sessionToken: v.string(), mes: v.string() }, // "YYYY-MM"
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [all, pagamentos] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pagamentosDespesas").withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes)).collect(),
    ]);
    const pagoMap = new Map(pagamentos.map((p) => [p.despesaId as string, p]));

    const result: Array<Omit<typeof all[number], "pago" | "dataPagamento"> & { _projectedMes: string; _parcela?: number; pago: boolean; dataPagamento?: string }> = [];
    for (const d of all) {
      // Pula se excluída especificamente neste mês
      if (despesaExcluidaNoMes(d, mes)) continue;
      const origMes = d.dataVencimento.slice(0, 7);
      const pagamento = pagoMap.get(d._id as string);
      // Conta EFETIVA: quando pago, a conta escolhida na efetivação (pagamento.contaId)
      // sobrescreve a do cadastro — mantém esta lista alinhada com lancamentos.listByMonth
      // e com o cálculo de saldo em contas.ts.
      const baseOverride = {
        pago: !!pagamento,
        dataPagamento: pagamento?.dataPagamento,
        contaId: pagamento?.contaId ?? d.contaId,
      };
      if (d.tipo === "avulsa") {
        if (origMes === mes) {
          const dProj = aplicarOverrideDespesa(d, mes);
          result.push({ ...dProj, ...baseOverride, _projectedMes: mes });
        }
      } else if (d.tipo === "fixa") {
        if (fixaInMes(d, mes)) {
          const dProj = aplicarOverrideDespesa(d, mes);
          const dia = dProj.dataVencimento.slice(8, 10);
          result.push({ ...dProj, ...baseOverride, _projectedMes: mes, dataVencimento: `${mes}-${dia}` });
        }
      } else if (d.tipo === "parcelada") {
        const totalParcelas = d.totalParcelas ?? 1;
        const parcelaInicial = d.parcelaAtual ?? 1;
        const offset = monthDiff(origMes, mes);
        const parcelaNoMes = parcelaInicial + offset;
        if (offset >= 0 && parcelaNoMes <= totalParcelas) {
          const dProj = aplicarOverrideDespesa(d, mes);
          const dia = dProj.dataVencimento.slice(8, 10);
          result.push({
            ...dProj,
            ...baseOverride,
            _projectedMes: mes,
            _parcela: parcelaNoMes,
            dataVencimento: `${mes}-${dia}`,
          });
        }
      }
    }
    return result.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  },
});

// Validacao compartilhada para args de recorrencia.
function validarRecorrenciaDespesa(args: {
  tipo: "fixa" | "parcelada" | "avulsa";
  periodicidade?: "mensal" | "anual" | "sazonal";
  mesesSazonais?: number[];
}) {
  if (args.periodicidade && args.tipo !== "fixa") {
    throw new Error("Periodicidade só se aplica a despesas fixas (recorrentes).");
  }
  if (args.periodicidade === "sazonal") {
    const meses = args.mesesSazonais ?? [];
    if (meses.length === 0) {
      throw new Error("Selecione ao menos um mês para a recorrência sazonal.");
    }
    for (const m of meses) {
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new Error("Meses sazonais devem ser inteiros entre 1 e 12.");
      }
    }
  }
}

export const create = mutation({
  args: {
    sessionToken: v.string(),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.optional(v.id("pessoas")),
    contaId: v.optional(v.id("contas")),
    dataVencimento: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    cartaoId: v.optional(v.id("cartoes")),
    dataCompra: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())),
    observacao: v.optional(v.string()),
    // Quando true, já registra o pagamento (efetivado) no mês do vencimento.
    jaPago: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, jaPago, cartao, cartaoId, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cat = await ctx.db.get(args.categoriaId);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Categoria inválida");
    if (args.contaId) {
      const conta = await ctx.db.get(args.contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }
    if (args.pessoaId) {
      const pessoa = await ctx.db.get(args.pessoaId);
      if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");
    }
    validarRecorrenciaDespesa(args);
    // Ponto único de escrita: resolve nome+FK do cartão de forma consistente.
    const cartaoResolved = await resolverCartaoEscrita(ctx, user.familyId, { cartao, cartaoId });
    const despesaId = await ctx.db.insert("despesas", {
      ...args,
      ...cartaoResolved,
      pago: false,
      criadoPor: user._id,
      familyId: user.familyId,
      criadoEm: new Date().toISOString(),
    });
    // Lançamento "já pago": cria o registro de pagamento no mês do vencimento.
    // Não se aplica a compras no cartão — essas entram na fatura.
    if (jaPago && !cartaoResolved.cartao) {
      await ctx.db.insert("pagamentosDespesas", {
        despesaId,
        mes: args.dataVencimento.slice(0, 7),
        dataPagamento: new Date().toISOString().slice(0, 10),
        contaId: args.contaId,
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
    return despesaId;
  },
});

export const togglePago = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    mes: v.string(),
    // Conta da qual saiu o dinheiro NESTE pagamento.
    // Se undefined no novo pagamento, fica sem conta (cai no fallback despesa.contaId).
    contaId: v.optional(v.id("contas")),
  },
  handler: async (ctx, { sessionToken, id, mes, contaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");

    if (contaId) {
      const conta = await ctx.db.get(contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }

    const existente = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_despesa_mes", (q) => q.eq("despesaId", id).eq("mes", mes))
      .unique();

    if (existente) {
      await ctx.db.delete(existente._id);
    } else {
      await ctx.db.insert("pagamentosDespesas", {
        despesaId: id,
        mes,
        dataPagamento: new Date().toISOString().slice(0, 10),
        contaId,
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
  },
});

// Desfaz a efetivação (pagamento) de uma despesa em um mês específico.
// Delete-only e idempotente: se não houver pagamento, é no-op (seguro contra
// duplo-toque). Diferente de togglePago, NUNCA cria um pagamento.
export const desfazerEfetivacao = mutation({
  args: { sessionToken: v.string(), id: v.id("despesas"), mes: v.string() },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    const existente = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_despesa_mes", (q) => q.eq("despesaId", id).eq("mes", mes))
      .unique();
    if (existente) {
      // Apaga o comprovante do storage junto (evita arquivo órfão).
      if (existente.comprovanteStorageId) {
        await ctx.storage.delete(existente.comprovanteStorageId);
      }
      await ctx.db.delete(existente._id);
      return { desfeito: true };
    }
    return { desfeito: false };
  },
});

export const getById = query({
  args: { sessionToken: v.string(), id: v.id("despesas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    return d;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.optional(v.id("pessoas")),
    contaId: v.optional(v.id("contas")),
    dataVencimento: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    cartaoId: v.optional(v.id("cartoes")),
    dataCompra: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, cartao, cartaoId, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    const cat = await ctx.db.get(args.categoriaId);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Categoria inválida");
    if (args.contaId) {
      const conta = await ctx.db.get(args.contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }
    if (args.pessoaId) {
      const pessoa = await ctx.db.get(args.pessoaId);
      if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");
    }
    validarRecorrenciaDespesa(args);
    // Ponto único de escrita: mantém nome+FK do cartão alinhados também na edição.
    const cartaoResolved = await resolverCartaoEscrita(ctx, user.familyId, { cartao, cartaoId });
    await ctx.db.patch(id, { ...args, ...cartaoResolved });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("despesas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    // Cascade: remove pagamentos vinculados (e seus comprovantes no storage)
    // pra não deixar registros/arquivos órfãos nem inconsistência de saldo.
    const pagamentos = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_despesa_mes", (q) => q.eq("despesaId", id))
      .collect();
    for (const p of pagamentos) {
      if (p.comprovanteStorageId) await ctx.storage.delete(p.comprovanteStorageId);
      await ctx.db.delete(p._id);
    }
    await logExclusao(ctx, {
      entityType: "despesa",
      entityId: d._id as string,
      entityData: d,
      mutationCalled: "despesas.remove",
      familyId: user.familyId,
      userId: user._id,
    });
    await ctx.db.delete(id);
  },
});

// ===== Overrides por mes =====

export const setOverride = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    mes: v.string(), // YYYY-MM
    valor: v.optional(v.number()),
    descricao: v.optional(v.string()),
    dataVencimento: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, mes, valor, descricao, dataVencimento }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido (YYYY-MM)");

    const atuais = d.overrides ?? [];
    const semEsteMes = atuais.filter((o) => o.mes !== mes);
    // Se nada foi informado além do mês, remove o override existente.
    if (valor === undefined && descricao === undefined && dataVencimento === undefined) {
      await ctx.db.patch(id, { overrides: semEsteMes });
      return;
    }
    const novo: { mes: string; valor?: number; descricao?: string; dataVencimento?: string } = { mes };
    if (valor !== undefined) novo.valor = valor;
    if (descricao !== undefined) novo.descricao = descricao;
    if (dataVencimento !== undefined) novo.dataVencimento = dataVencimento;
    await ctx.db.patch(id, { overrides: [...semEsteMes, novo] });
  },
});

export const removerOverride = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    mes: v.string(),
  },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    const atuais = d.overrides ?? [];
    await ctx.db.patch(id, { overrides: atuais.filter((o) => o.mes !== mes) });
  },
});

// Exclui uma despesa recorrente/parcelada APENAS no mês informado.
// Cria/atualiza um override { mes, excluida: true } sem deletar a despesa do banco.
// Também remove qualquer pagamento associado a esse mês.
export const excluirNoMes = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    mes: v.string(), // YYYY-MM
  },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrada");
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido (YYYY-MM)");
    if (d.tipo === "avulsa") {
      // Avulsa só existe em 1 mês — exclui de vez
      await logExclusao(ctx, {
        entityType: "despesa",
        entityId: d._id as string,
        entityData: d,
        mutationCalled: "despesas.excluirNoMes (avulsa→delete completo)",
        contexto: `mes=${mes}`,
        familyId: user.familyId,
        userId: user._id,
      });
      await ctx.db.delete(id);
      return;
    }

    const atuais = d.overrides ?? [];
    const semEsteMes = atuais.filter((o) => o.mes !== mes);
    const overrideAtual = atuais.find((o) => o.mes === mes);
    const novo = { ...(overrideAtual ?? { mes }), mes, excluida: true };
    // Audita override (recuperável)
    await logExclusao(ctx, {
      entityType: "override_excluida",
      entityId: d._id as string,
      entityData: { despesaId: d._id, titulo: d.descricao, valor: d.valor, tipo: d.tipo, mes },
      mutationCalled: "despesas.excluirNoMes",
      contexto: `mes=${mes}`,
      familyId: user.familyId,
      userId: user._id,
    });
    await ctx.db.patch(id, { overrides: [...semEsteMes, novo] });

    // Remove pagamento desse mês, se existir
    const pag = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_despesa_mes", (q) => q.eq("despesaId", id).eq("mes", mes))
      .unique();
    if (pag) await ctx.db.delete(pag._id);
  },
});
