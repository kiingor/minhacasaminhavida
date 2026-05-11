import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

// ============================================================================
// MARCO 3.C - Notificacoes inteligentes (V1: in-app)
// ============================================================================

const TIPO_NOTIFICACAO = v.union(
  v.literal("orcamento_80"),
  v.literal("orcamento_estourado"),
  v.literal("vencimento_amanha"),
  v.literal("meta_atingida"),
  v.literal("resumo_semanal"),
  v.literal("money_date"),
  v.literal("divida_quitada"),
  v.literal("reserva_completa")
);

const PREFS_DEFAULT = {
  orcamento80: true,
  vencimentoAmanha: true,
  metaAtingida: true,
  resumoSemanal: true,
  moneyDate: true,
  canalEmail: false, // V1: stub
  canalPush: false, // V1: stub
} as const;

// ==================== Queries ====================

export const list = query({
  args: {
    sessionToken: v.string(),
    apenasNaoLidas: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, apenasNaoLidas, limit }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const max = typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50;

    if (apenasNaoLidas) {
      const naoLidas = await ctx.db
        .query("notificacoes")
        .withIndex("by_user_lida", (q) => q.eq("userId", user._id).eq("lida", false))
        .order("desc")
        .take(max);
      return naoLidas;
    }

    const todas = await ctx.db
      .query("notificacoes")
      .withIndex("by_user_criada", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(max);
    return todas;
  },
});

export const countNaoLidas = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const naoLidas = await ctx.db
      .query("notificacoes")
      .withIndex("by_user_lida", (q) => q.eq("userId", user._id).eq("lida", false))
      .collect();
    return naoLidas.length;
  },
});

export const preferencias = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const existente = await ctx.db
      .query("preferenciasNotificacao")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existente) {
      return {
        orcamento80: existente.orcamento80,
        vencimentoAmanha: existente.vencimentoAmanha,
        metaAtingida: existente.metaAtingida,
        resumoSemanal: existente.resumoSemanal,
        moneyDate: existente.moneyDate,
        canalEmail: existente.canalEmail,
        canalPush: existente.canalPush,
      };
    }

    return { ...PREFS_DEFAULT };
  },
});

// ==================== Mutations ====================

export const marcarLida = mutation({
  args: { sessionToken: v.string(), id: v.id("notificacoes") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const n = await ctx.db.get(id);
    if (!n || n.userId !== user._id) {
      throw new Error("Notificação não encontrada.");
    }
    if (!n.lida) {
      await ctx.db.patch(id, { lida: true });
    }
    return null;
  },
});

export const marcarTodasLidas = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const naoLidas = await ctx.db
      .query("notificacoes")
      .withIndex("by_user_lida", (q) => q.eq("userId", user._id).eq("lida", false))
      .collect();
    for (const n of naoLidas) {
      await ctx.db.patch(n._id, { lida: true });
    }
    return naoLidas.length;
  },
});

export const remover = mutation({
  args: { sessionToken: v.string(), id: v.id("notificacoes") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const n = await ctx.db.get(id);
    if (!n || n.userId !== user._id) {
      throw new Error("Notificação não encontrada.");
    }
    await ctx.db.delete(id);
    return null;
  },
});

export const removerTodas = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const todas = await ctx.db
      .query("notificacoes")
      .withIndex("by_user_criada", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of todas) {
      await ctx.db.delete(n._id);
    }
    return todas.length;
  },
});

export const atualizarPreferencias = mutation({
  args: {
    sessionToken: v.string(),
    orcamento80: v.optional(v.boolean()),
    vencimentoAmanha: v.optional(v.boolean()),
    metaAtingida: v.optional(v.boolean()),
    resumoSemanal: v.optional(v.boolean()),
    moneyDate: v.optional(v.boolean()),
    canalEmail: v.optional(v.boolean()),
    canalPush: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.sessionToken);
    const agora = new Date().toISOString();

    const existente = await ctx.db
      .query("preferenciasNotificacao")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const patch: Record<string, unknown> = { atualizadoEm: agora };
    if (typeof args.orcamento80 === "boolean") patch.orcamento80 = args.orcamento80;
    if (typeof args.vencimentoAmanha === "boolean") patch.vencimentoAmanha = args.vencimentoAmanha;
    if (typeof args.metaAtingida === "boolean") patch.metaAtingida = args.metaAtingida;
    if (typeof args.resumoSemanal === "boolean") patch.resumoSemanal = args.resumoSemanal;
    if (typeof args.moneyDate === "boolean") patch.moneyDate = args.moneyDate;
    if (typeof args.canalEmail === "boolean") patch.canalEmail = args.canalEmail;
    if (typeof args.canalPush === "boolean") patch.canalPush = args.canalPush;

    if (existente) {
      await ctx.db.patch(existente._id, patch);
      return existente._id;
    }

    return await ctx.db.insert("preferenciasNotificacao", {
      userId: user._id,
      familyId: user.familyId,
      orcamento80: args.orcamento80 ?? PREFS_DEFAULT.orcamento80,
      vencimentoAmanha: args.vencimentoAmanha ?? PREFS_DEFAULT.vencimentoAmanha,
      metaAtingida: args.metaAtingida ?? PREFS_DEFAULT.metaAtingida,
      resumoSemanal: args.resumoSemanal ?? PREFS_DEFAULT.resumoSemanal,
      moneyDate: args.moneyDate ?? PREFS_DEFAULT.moneyDate,
      canalEmail: args.canalEmail ?? PREFS_DEFAULT.canalEmail,
      canalPush: args.canalPush ?? PREFS_DEFAULT.canalPush,
      atualizadoEm: agora,
    });
  },
});
