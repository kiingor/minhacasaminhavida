import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export const listByMonth = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const all = await ctx.db
      .query("receitas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();

    const result: Array<typeof all[number] & { _projectedMes: string; _parcela?: number }> = [];
    for (const r of all) {
      const origMes = r.dataPrevisao.slice(0, 7);
      if (r.tipo === "avulsa") {
        if (origMes === mes) result.push({ ...r, _projectedMes: mes });
      } else if (r.tipo === "fixa") {
        if (mes >= origMes) {
          const dia = r.dataPrevisao.slice(8, 10);
          result.push({ ...r, _projectedMes: mes, dataPrevisao: `${mes}-${dia}` });
        }
      } else if (r.tipo === "parcelada") {
        const totalParcelas = r.totalParcelas ?? 1;
        const offset = monthDiff(origMes, mes);
        if (offset >= 0 && offset < totalParcelas) {
          const dia = r.dataPrevisao.slice(8, 10);
          result.push({
            ...r,
            _projectedMes: mes,
            _parcela: (r.parcelaAtual ?? 1) + offset,
            dataPrevisao: `${mes}-${dia}`,
          });
        }
      }
    }
    return result.sort((a, b) => a.dataPrevisao.localeCompare(b.dataPrevisao));
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.id("pessoas"),
    pagadorNome: v.optional(v.string()),
    dataPrevisao: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db.insert("receitas", {
      ...args,
      recebido: false,
      criadoPor: user._id,
      familyId: user.familyId,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const toggleRecebido = mutation({
  args: { sessionToken: v.string(), id: v.id("receitas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, {
      recebido: !r.recebido,
      dataRecebimento: !r.recebido ? new Date().toISOString().slice(0, 10) : undefined,
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("receitas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});
