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
    const [all, recebimentos] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("recebimentosReceitas").withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes)).collect(),
    ]);
    const recMap = new Map(recebimentos.map((r) => [r.receitaId as string, r]));

    const result: Array<Omit<typeof all[number], "recebido" | "dataRecebimento"> & { _projectedMes: string; _parcela?: number; recebido: boolean; dataRecebimento?: string }> = [];
    for (const r of all) {
      const origMes = r.dataPrevisao.slice(0, 7);
      const rec = recMap.get(r._id as string);
      const baseOverride = { recebido: !!rec, dataRecebimento: rec?.dataRecebimento };
      if (r.tipo === "avulsa") {
        if (origMes === mes) result.push({ ...r, ...baseOverride, _projectedMes: mes });
      } else if (r.tipo === "fixa") {
        if (mes >= origMes) {
          const dia = r.dataPrevisao.slice(8, 10);
          result.push({ ...r, ...baseOverride, _projectedMes: mes, dataPrevisao: `${mes}-${dia}` });
        }
      } else if (r.tipo === "parcelada") {
        const totalParcelas = r.totalParcelas ?? 1;
        const offset = monthDiff(origMes, mes);
        if (offset >= 0 && offset < totalParcelas) {
          const dia = r.dataPrevisao.slice(8, 10);
          result.push({
            ...r,
            ...baseOverride,
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
    pagadorId: v.optional(v.id("pagadores")),
    pagadorNome: v.optional(v.string()),
    dataPrevisao: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (args.pagadorId) {
      const p = await ctx.db.get(args.pagadorId);
      if (!p || p.familyId !== user.familyId) throw new Error("Pagador inválido");
    }
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
  args: { sessionToken: v.string(), id: v.id("receitas"), mes: v.string() },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");

    const existente = await ctx.db
      .query("recebimentosReceitas")
      .withIndex("by_receita_mes", (q) => q.eq("receitaId", id).eq("mes", mes))
      .unique();

    if (existente) {
      await ctx.db.delete(existente._id);
    } else {
      await ctx.db.insert("recebimentosReceitas", {
        receitaId: id,
        mes,
        dataRecebimento: new Date().toISOString().slice(0, 10),
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("receitas"),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.id("pessoas"),
    pagadorId: v.optional(v.id("pagadores")),
    pagadorNome: v.optional(v.string()),
    dataPrevisao: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    if (args.pagadorId) {
      const p = await ctx.db.get(args.pagadorId);
      if (!p || p.familyId !== user.familyId) throw new Error("Pagador inválido");
    }
    await ctx.db.patch(id, args);
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
