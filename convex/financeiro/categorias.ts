import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const list = query({
  args: { sessionToken: v.string(), tipo: v.optional(v.union(v.literal("despesa"), v.literal("receita"))) },
  handler: async (ctx, { sessionToken, tipo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (tipo) {
      return await ctx.db
        .query("categorias")
        .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", tipo))
        .collect();
    }
    return await ctx.db
      .query("categorias")
      .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    tipo: v.union(v.literal("despesa"), v.literal("receita")),
    icone: v.string(),
    cor: v.string(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db.insert("categorias", { ...args, familyId: user.familyId });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("categorias"),
    nome: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cat = await ctx.db.get(id);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("categorias") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cat = await ctx.db.get(id);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});

// Seed de categorias padrão
export const seedDefaults = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const existing = await ctx.db
      .query("categorias")
      .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId))
      .first();
    if (existing) return;

    const despesas = [
      { nome: "Moradia", icone: "Home", cor: "#6366F1" },
      { nome: "Alimentação", icone: "UtensilsCrossed", cor: "#F97316" },
      { nome: "Transporte", icone: "Car", cor: "#06B6D4" },
      { nome: "Saúde", icone: "HeartPulse", cor: "#EF4444" },
      { nome: "Lazer", icone: "Gamepad2", cor: "#EC4899" },
      { nome: "Educação", icone: "GraduationCap", cor: "#8B5CF6" },
      { nome: "Mercado", icone: "ShoppingCart", cor: "#10B981" },
      { nome: "Outros", icone: "Package", cor: "#64748B" },
    ];
    const receitas = [
      { nome: "Salário", icone: "Briefcase", cor: "#10B981" },
      { nome: "Freelance", icone: "Laptop", cor: "#06B6D4" },
      { nome: "Investimentos", icone: "TrendingUp", cor: "#F59E0B" },
      { nome: "Outros", icone: "Plus", cor: "#64748B" },
    ];

    for (const c of despesas) {
      await ctx.db.insert("categorias", { ...c, tipo: "despesa", familyId: user.familyId });
    }
    for (const c of receitas) {
      await ctx.db.insert("categorias", { ...c, tipo: "receita", familyId: user.familyId });
    }
  },
});
