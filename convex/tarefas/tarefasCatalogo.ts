import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const list = query({
  args: { sessionToken: v.string(), categoria: v.optional(v.string()) },
  handler: async (ctx, { sessionToken, categoria }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (categoria) {
      return await ctx.db
        .query("tarefasCatalogo")
        .withIndex("by_family_categoria", (q) => q.eq("familyId", user.familyId).eq("categoria", categoria))
        .collect();
    }
    const all = await ctx.db
      .query("tarefasCatalogo")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    return all.filter((t) => t.ativa);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    descricao: v.optional(v.string()),
    icone: v.string(),
    cor: v.string(),
    categoria: v.string(),
    tempoExecucaoMinutos: v.number(),
    xpBase: v.number(),
    dificuldade: v.union(v.literal("facil"), v.literal("media"), v.literal("dificil")),
    recorrencia: v.optional(
      v.union(v.literal("diaria"), v.literal("semanal"), v.literal("mensal"), v.literal("pontual"))
    ),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db.insert("tarefasCatalogo", { ...args, ativa: true, familyId: user.familyId });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("tarefasCatalogo"),
    nome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
    categoria: v.optional(v.string()),
    tempoExecucaoMinutos: v.optional(v.number()),
    xpBase: v.optional(v.number()),
    dificuldade: v.optional(v.union(v.literal("facil"), v.literal("media"), v.literal("dificil"))),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const t = await ctx.db.get(id);
    if (!t || t.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("tarefasCatalogo") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const t = await ctx.db.get(id);
    if (!t || t.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { ativa: false });
  },
});

// ===== SEED =====
type SeedItem = {
  nome: string;
  icone: string;
  categoria: string;
  cor: string;
  tempoExecucaoMinutos: number;
  dificuldade: "facil" | "media" | "dificil";
  xpBase: number;
};

const SEED: SeedItem[] = [
  // Limpeza
  { nome: "Varrer a casa", icone: "Sparkles", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 15, dificuldade: "facil", xpBase: 15 },
  { nome: "Passar pano no chão", icone: "Droplets", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 20, dificuldade: "media", xpBase: 40 },
  { nome: "Limpar banheiro", icone: "Bath", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 25, dificuldade: "media", xpBase: 40 },
  { nome: "Tirar o lixo", icone: "Trash2", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 5, dificuldade: "facil", xpBase: 15 },
  { nome: "Organizar o quarto", icone: "BedDouble", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 15, dificuldade: "facil", xpBase: 15 },
  { nome: "Arrumar a cama", icone: "Bed", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 5, dificuldade: "facil", xpBase: 15 },
  { nome: "Tirar pó dos móveis", icone: "Feather", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 15, dificuldade: "facil", xpBase: 15 },
  { nome: "Limpeza pesada do banheiro", icone: "SprayCan", categoria: "Limpeza", cor: "#06B6D4", tempoExecucaoMinutos: 45, dificuldade: "dificil", xpBase: 80 },

  // Cozinha
  { nome: "Lavar louça", icone: "Utensils", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 20, dificuldade: "media", xpBase: 40 },
  { nome: "Preparar almoço", icone: "ChefHat", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 45, dificuldade: "dificil", xpBase: 80 },
  { nome: "Preparar jantar", icone: "ChefHat", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 40, dificuldade: "dificil", xpBase: 80 },
  { nome: "Preparar café da manhã", icone: "Coffee", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 15, dificuldade: "facil", xpBase: 15 },
  { nome: "Limpar fogão", icone: "Flame", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 15, dificuldade: "media", xpBase: 40 },
  { nome: "Limpar geladeira", icone: "Refrigerator", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 30, dificuldade: "media", xpBase: 40 },
  { nome: "Organizar despensa", icone: "Package", categoria: "Cozinha", cor: "#F97316", tempoExecucaoMinutos: 20, dificuldade: "facil", xpBase: 15 },

  // Roupas
  { nome: "Colocar roupa pra lavar", icone: "WashingMachine", categoria: "Roupas", cor: "#8B5CF6", tempoExecucaoMinutos: 10, dificuldade: "facil", xpBase: 15 },
  { nome: "Estender roupa", icone: "Shirt", categoria: "Roupas", cor: "#8B5CF6", tempoExecucaoMinutos: 15, dificuldade: "facil", xpBase: 15 },
  { nome: "Recolher roupa do varal", icone: "Shirt", categoria: "Roupas", cor: "#8B5CF6", tempoExecucaoMinutos: 10, dificuldade: "facil", xpBase: 15 },
  { nome: "Dobrar roupas", icone: "Shirt", categoria: "Roupas", cor: "#8B5CF6", tempoExecucaoMinutos: 20, dificuldade: "media", xpBase: 40 },
  { nome: "Passar roupas", icone: "Zap", categoria: "Roupas", cor: "#8B5CF6", tempoExecucaoMinutos: 40, dificuldade: "dificil", xpBase: 80 },
  { nome: "Guardar roupas", icone: "Archive", categoria: "Roupas", cor: "#8B5CF6", tempoExecucaoMinutos: 15, dificuldade: "facil", xpBase: 15 },

  // Pets
  { nome: "Alimentar pet", icone: "Bone", categoria: "Pets", cor: "#EC4899", tempoExecucaoMinutos: 5, dificuldade: "facil", xpBase: 15 },
  { nome: "Passear com pet", icone: "Dog", categoria: "Pets", cor: "#EC4899", tempoExecucaoMinutos: 30, dificuldade: "media", xpBase: 40 },
  { nome: "Limpar caixa de areia", icone: "Cat", categoria: "Pets", cor: "#EC4899", tempoExecucaoMinutos: 10, dificuldade: "facil", xpBase: 15 },

  // Jardim
  { nome: "Regar plantas", icone: "Flower2", categoria: "Jardim", cor: "#10B981", tempoExecucaoMinutos: 10, dificuldade: "facil", xpBase: 15 },
  { nome: "Capinar jardim", icone: "Shovel", categoria: "Jardim", cor: "#10B981", tempoExecucaoMinutos: 30, dificuldade: "media", xpBase: 40 },

  // Compras / outros
  { nome: "Fazer compras do mercado", icone: "ShoppingCart", categoria: "Compras", cor: "#3B82F6", tempoExecucaoMinutos: 60, dificuldade: "media", xpBase: 40 },
  { nome: "Pagar contas", icone: "Wallet", categoria: "Compras", cor: "#3B82F6", tempoExecucaoMinutos: 20, dificuldade: "facil", xpBase: 15 },
  { nome: "Levar crianças à escola", icone: "School", categoria: "Compras", cor: "#3B82F6", tempoExecucaoMinutos: 20, dificuldade: "facil", xpBase: 15 },
];

export const seedDefaults = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const existing = await ctx.db
      .query("tarefasCatalogo")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .first();
    if (existing) return { skipped: true };

    for (const t of SEED) {
      await ctx.db.insert("tarefasCatalogo", {
        ...t,
        recorrencia: "pontual",
        ativa: true,
        familyId: user.familyId,
      });
    }
    return { inserted: SEED.length };
  },
});
