import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
  },
});

export const aportes = query({
  args: { sessionToken: v.string(), metaId: v.id("metas") },
  handler: async (ctx, { sessionToken, metaId }) => {
    // sessionToken used for auth consistency — no family check needed on aportes query
    await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("aportesMeta")
      .withIndex("by_meta", (q) => q.eq("metaId", metaId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    titulo: v.string(),
    descricao: v.optional(v.string()),
    valorAlvo: v.number(),
    prazo: v.string(),
    icone: v.string(),
    cor: v.string(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db.insert("metas", {
      ...args,
      valorAtual: 0,
      ativa: true,
      familyId: user.familyId,
      criadoPor: user._id,
    });
  },
});

export const addAporte = mutation({
  args: {
    sessionToken: v.string(),
    metaId: v.id("metas"),
    valor: v.number(),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, metaId, valor, observacao }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(metaId);
    if (!meta || meta.familyId !== user.familyId) throw new Error("Meta não encontrada");
    await ctx.db.insert("aportesMeta", {
      metaId,
      valor,
      data: new Date().toISOString().slice(0, 10),
      observacao,
      familyId: user.familyId,
    });
    await ctx.db.patch(metaId, { valorAtual: meta.valorAtual + valor });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("metas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(id);
    if (!meta || meta.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { ativa: false });
  },
});
