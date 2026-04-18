import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

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
      const origMes = d.dataVencimento.slice(0, 7);
      const pagamento = pagoMap.get(d._id as string);
      const baseOverride = { pago: !!pagamento, dataPagamento: pagamento?.dataPagamento };
      if (d.tipo === "avulsa") {
        if (origMes === mes) result.push({ ...d, ...baseOverride, _projectedMes: mes });
      } else if (d.tipo === "fixa") {
        if (mes >= origMes) {
          const dia = d.dataVencimento.slice(8, 10);
          result.push({ ...d, ...baseOverride, _projectedMes: mes, dataVencimento: `${mes}-${dia}` });
        }
      } else if (d.tipo === "parcelada") {
        const totalParcelas = d.totalParcelas ?? 1;
        const parcelaInicial = d.parcelaAtual ?? 1;
        const offset = monthDiff(origMes, mes);
        const parcelaNoMes = parcelaInicial + offset;
        if (offset >= 0 && parcelaNoMes <= totalParcelas) {
          const dia = d.dataVencimento.slice(8, 10);
          result.push({
            ...d,
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

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export const create = mutation({
  args: {
    sessionToken: v.string(),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.optional(v.id("pessoas")),
    dataVencimento: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db.insert("despesas", {
      ...args,
      pago: false,
      criadoPor: user._id,
      familyId: user.familyId,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const togglePago = mutation({
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
      await ctx.db.delete(existente._id);
    } else {
      await ctx.db.insert("pagamentosDespesas", {
        despesaId: id,
        mes,
        dataPagamento: new Date().toISOString().slice(0, 10),
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
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
    dataVencimento: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("despesas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});
