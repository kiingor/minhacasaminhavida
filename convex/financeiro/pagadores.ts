import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

const PALETA = [
  "#6366F1", "#F97316", "#06B6D4", "#EF4444", "#EC4899", "#8B5CF6",
  "#10B981", "#F59E0B", "#64748B", "#14B8A6", "#84CC16", "#3B82F6",
];

function normalizarChave(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

function corPorIndice(i: number): string {
  return PALETA[i % PALETA.length];
}

export const list = query({
  args: { sessionToken: v.string(), incluirInativos: v.optional(v.boolean()) },
  handler: async (ctx, { sessionToken, incluirInativos }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const all = await ctx.db
      .query("pagadores")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const visiveis = incluirInativos ? all : all.filter((p) => p.ativo);
    return visiveis.sort((a, b) => (a.apelido ?? a.nome).localeCompare(b.apelido ?? b.nome));
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    apelido: v.optional(v.string()),
    tipo: v.union(v.literal("pessoa_fisica"), v.literal("pessoa_juridica"), v.literal("outro")),
    documento: v.optional(v.string()),
    cor: v.string(),
    icone: v.optional(v.string()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (!args.nome.trim()) throw new Error("Nome obrigatório");
    return await ctx.db.insert("pagadores", {
      ...args,
      nome: args.nome.trim(),
      ativo: true,
      familyId: user.familyId,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("pagadores"),
    nome: v.optional(v.string()),
    apelido: v.optional(v.string()),
    tipo: v.optional(v.union(v.literal("pessoa_fisica"), v.literal("pessoa_juridica"), v.literal("outro"))),
    documento: v.optional(v.string()),
    cor: v.optional(v.string()),
    icone: v.optional(v.string()),
    observacao: v.optional(v.string()),
    ativo: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const p = await ctx.db.get(id);
    if (!p || p.familyId !== user.familyId) throw new Error("Não encontrado");
    const patch: Record<string, unknown> = { ...rest };
    if (typeof patch.nome === "string") patch.nome = (patch.nome as string).trim();
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("pagadores") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const p = await ctx.db.get(id);
    if (!p || p.familyId !== user.familyId) throw new Error("Não encontrado");
    const vinculadas = await ctx.db
      .query("receitas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();
    const temVinculo = vinculadas.some((r) => r.pagadorId === id);
    if (temVinculo) {
      await ctx.db.patch(id, { ativo: false });
      return { arquivado: true };
    }
    await ctx.db.delete(id);
    return { arquivado: false };
  },
});

export const contagemLegado = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [receitas, pagadores] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pagadores").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const chavesExistentes = new Set(pagadores.map((p) => normalizarChave(p.nome)));
    const nomesLegado = new Set<string>();
    let pendentes = 0;
    for (const r of receitas) {
      if (r.pagadorId) continue;
      const nome = (r.pagadorNome ?? "").trim();
      if (!nome) continue;
      const chave = normalizarChave(nome);
      if (!chavesExistentes.has(chave)) nomesLegado.add(nome);
      pendentes++;
    }
    return { nomesDistintos: nomesLegado.size, receitasPendentes: pendentes };
  },
});

export const migrarPagadoresLegados = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    const [receitas, pagadoresExistentes] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pagadores").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const chaveToId = new Map<string, string>();
    for (const p of pagadoresExistentes) {
      chaveToId.set(normalizarChave(p.nome), p._id);
    }

    let pagadoresCriados = 0;
    let receitasAtualizadas = 0;
    let receitasSemPagador = 0;
    let corIdx = pagadoresExistentes.length;

    for (const r of receitas) {
      if (r.pagadorId) continue;
      const nome = (r.pagadorNome ?? "").trim();
      if (!nome) {
        receitasSemPagador++;
        continue;
      }
      const chave = normalizarChave(nome);
      let pagadorId = chaveToId.get(chave);
      if (!pagadorId) {
        const novoId = await ctx.db.insert("pagadores", {
          nome,
          tipo: "outro",
          cor: corPorIndice(corIdx++),
          ativo: true,
          familyId: user.familyId,
        });
        chaveToId.set(chave, novoId);
        pagadorId = novoId;
        pagadoresCriados++;
      }
      await ctx.db.patch(r._id, { pagadorId: pagadorId as any });
      receitasAtualizadas++;
    }

    return { pagadoresCriados, receitasAtualizadas, receitasSemPagador };
  },
});
