import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("cartoes")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    bandeira: v.optional(v.string()),
    cor: v.string(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db.insert("cartoes", { ...args, familyId: user.familyId });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("cartoes"),
    nome: v.optional(v.string()),
    bandeira: v.optional(v.string()),
    cor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("cartoes") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});
