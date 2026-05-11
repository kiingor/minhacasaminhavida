import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const list = query({
  args: {
    sessionToken: v.string(),
    mes: v.optional(v.string()), // YYYY-MM
    contaId: v.optional(v.id("contas")),
  },
  handler: async (ctx, { sessionToken, mes, contaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    let q;
    if (mes) {
      const ini = `${mes}-01`;
      const fim = `${mes}-31`;
      q = ctx.db
        .query("transferencias")
        .withIndex("by_family_data", (idx) =>
          idx.eq("familyId", user.familyId).gte("data", ini).lte("data", fim)
        );
    } else {
      q = ctx.db
        .query("transferencias")
        .withIndex("by_family_data", (idx) => idx.eq("familyId", user.familyId));
    }

    let resultados = await q.collect();

    if (contaId) {
      resultados = resultados.filter(
        (t) => t.contaOrigemId === contaId || t.contaDestinoId === contaId
      );
    }

    return resultados.sort((a, b) => b.data.localeCompare(a.data));
  },
});

export const getById = query({
  args: { sessionToken: v.string(), id: v.id("transferencias") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const t = await ctx.db.get(id);
    if (!t || t.familyId !== user.familyId) throw new Error("Transferência não encontrada");
    return t;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    contaOrigemId: v.id("contas"),
    contaDestinoId: v.id("contas"),
    valor: v.number(),
    data: v.string(),
    descricao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    if (args.contaOrigemId === args.contaDestinoId) {
      throw new Error("Conta de origem e destino devem ser diferentes");
    }
    if (args.valor <= 0) {
      throw new Error("Valor deve ser maior que zero");
    }

    const origem = await ctx.db.get(args.contaOrigemId);
    if (!origem || origem.familyId !== user.familyId) {
      throw new Error("Conta de origem inválida");
    }
    const destino = await ctx.db.get(args.contaDestinoId);
    if (!destino || destino.familyId !== user.familyId) {
      throw new Error("Conta de destino inválida");
    }

    return await ctx.db.insert("transferencias", {
      ...args,
      familyId: user.familyId,
      criadoPor: user._id,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("transferencias") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const t = await ctx.db.get(id);
    if (!t || t.familyId !== user.familyId) throw new Error("Transferência não encontrada");
    await ctx.db.delete(id);
  },
});
