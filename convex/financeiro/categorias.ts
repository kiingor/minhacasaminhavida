import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id } from "../_generated/dataModel";

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

// Lista plana com indicador de nivel (1=mae, 2=filha) para uso em selects.
// Mantém ordem: cada mae seguida das suas filhas (alfabetico).
export const listFlat = query({
  args: { sessionToken: v.string(), tipo: v.optional(v.union(v.literal("despesa"), v.literal("receita"))) },
  handler: async (ctx, { sessionToken, tipo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const todas = tipo
      ? await ctx.db
          .query("categorias")
          .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", tipo))
          .collect()
      : await ctx.db
          .query("categorias")
          .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId))
          .collect();

    const maes = todas
      .filter((c) => !c.categoriaPaiId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const porPai = new Map<string, typeof todas>();
    for (const c of todas) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!porPai.has(k)) porPai.set(k, []);
        porPai.get(k)!.push(c);
      }
    }
    for (const arr of porPai.values()) arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const result: Array<{
      _id: Id<"categorias">;
      nome: string;
      tipo: "despesa" | "receita";
      icone: string;
      cor: string;
      categoriaPaiId?: Id<"categorias">;
      nivel: 1 | 2;
    }> = [];
    for (const m of maes) {
      result.push({
        _id: m._id,
        nome: m.nome,
        tipo: m.tipo,
        icone: m.icone,
        cor: m.cor,
        categoriaPaiId: m.categoriaPaiId,
        nivel: 1,
      });
      const filhas = porPai.get(m._id as string) ?? [];
      for (const f of filhas) {
        result.push({
          _id: f._id,
          nome: f.nome,
          tipo: f.tipo,
          icone: f.icone,
          cor: f.cor,
          categoriaPaiId: f.categoriaPaiId,
          nivel: 2,
        });
      }
    }
    // Filhas órfãs (pai removido) aparecem ao final como nivel 1 para não sumirem.
    const orfas = todas.filter(
      (c) => c.categoriaPaiId && !maes.find((m) => m._id === c.categoriaPaiId)
    );
    for (const o of orfas) {
      result.push({
        _id: o._id,
        nome: o.nome,
        tipo: o.tipo,
        icone: o.icone,
        cor: o.cor,
        categoriaPaiId: undefined,
        nivel: 1,
      });
    }
    return result;
  },
});

// Estrutura de árvore: cada mãe traz array `subcategorias`.
export const tree = query({
  args: { sessionToken: v.string(), tipo: v.optional(v.union(v.literal("despesa"), v.literal("receita"))) },
  handler: async (ctx, { sessionToken, tipo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const todas = tipo
      ? await ctx.db
          .query("categorias")
          .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", tipo))
          .collect()
      : await ctx.db
          .query("categorias")
          .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId))
          .collect();

    const maes = todas
      .filter((c) => !c.categoriaPaiId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const porPai = new Map<string, typeof todas>();
    for (const c of todas) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!porPai.has(k)) porPai.set(k, []);
        porPai.get(k)!.push(c);
      }
    }

    return maes.map((m) => ({
      ...m,
      subcategorias: (porPai.get(m._id as string) ?? []).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      ),
    }));
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    tipo: v.union(v.literal("despesa"), v.literal("receita")),
    icone: v.string(),
    cor: v.string(),
    categoriaPaiId: v.optional(v.id("categorias")),
  },
  handler: async (ctx, { sessionToken, categoriaPaiId, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (categoriaPaiId) {
      const pai = await ctx.db.get(categoriaPaiId);
      if (!pai || pai.familyId !== user.familyId) {
        throw new Error("Categoria pai inválida");
      }
      if (pai.categoriaPaiId) {
        throw new Error("Subcategoria não pode ter outra subcategoria como pai (máx. 2 níveis).");
      }
      if (pai.tipo !== args.tipo) {
        throw new Error("Subcategoria deve ter o mesmo tipo da categoria pai.");
      }
    }
    return await ctx.db.insert("categorias", {
      ...args,
      categoriaPaiId: categoriaPaiId,
      familyId: user.familyId,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("categorias"),
    nome: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
    // Pode mover entre pais (ou tornar mae passando null/undefined explicitamente).
    categoriaPaiId: v.optional(v.union(v.id("categorias"), v.null())),
  },
  handler: async (ctx, { sessionToken, id, categoriaPaiId, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cat = await ctx.db.get(id);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Não encontrado");

    const patch: Partial<{
      nome: string;
      icone: string;
      cor: string;
      categoriaPaiId: Id<"categorias"> | undefined;
    }> = {};
    if (rest.nome !== undefined) patch.nome = rest.nome;
    if (rest.icone !== undefined) patch.icone = rest.icone;
    if (rest.cor !== undefined) patch.cor = rest.cor;

    if (categoriaPaiId !== undefined) {
      if (categoriaPaiId === null) {
        patch.categoriaPaiId = undefined;
      } else {
        if (categoriaPaiId === id) {
          throw new Error("Categoria não pode ser pai de si mesma.");
        }
        const pai = await ctx.db.get(categoriaPaiId);
        if (!pai || pai.familyId !== user.familyId) {
          throw new Error("Categoria pai inválida");
        }
        if (pai.categoriaPaiId) {
          throw new Error("Subcategoria não pode ter outra subcategoria como pai (máx. 2 níveis).");
        }
        if (pai.tipo !== cat.tipo) {
          throw new Error("Subcategoria deve ter o mesmo tipo da categoria pai.");
        }
        // Se a categoria atual já é pai de outras (tem filhas), bloquear movê-la sob outra (criaria 3 níveis).
        const filhas = await ctx.db
          .query("categorias")
          .withIndex("by_family_pai", (q) =>
            q.eq("familyId", user.familyId).eq("categoriaPaiId", id)
          )
          .collect();
        if (filhas.length > 0) {
          throw new Error("Esta categoria possui subcategorias e não pode virar filha de outra.");
        }
        patch.categoriaPaiId = categoriaPaiId;
      }
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("categorias") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cat = await ctx.db.get(id);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Não encontrado");

    // Bloquear remoção de categoria mãe com filhas
    const filhas = await ctx.db
      .query("categorias")
      .withIndex("by_family_pai", (q) =>
        q.eq("familyId", user.familyId).eq("categoriaPaiId", id)
      )
      .collect();
    if (filhas.length > 0) {
      throw new Error(
        "Esta categoria possui subcategorias. Remova ou mova as subcategorias antes."
      );
    }
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
      { nome: "Outros", icone: "Package", cor: "#64748B" },
    ];

    for (const c of despesas) {
      await ctx.db.insert("categorias", { ...c, tipo: "despesa", familyId: user.familyId });
    }
    for (const c of receitas) {
      await ctx.db.insert("categorias", { ...c, tipo: "receita", familyId: user.familyId });
    }
  },
});
