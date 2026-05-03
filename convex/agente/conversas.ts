import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conversas = await ctx.db
      .query("conversasIA")
      .withIndex("by_family_atualizada", (q) => q.eq("familyId", user.familyId))
      .order("desc")
      .collect();
    return conversas.filter((c) => !c.arquivada);
  },
});

export const get = query({
  args: { sessionToken: v.string(), id: v.id("conversasIA") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) return null;
    return c;
  },
});

export const listMensagens = query({
  args: { sessionToken: v.string(), conversaId: v.id("conversasIA") },
  handler: async (ctx, { sessionToken, conversaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conversa = await ctx.db.get(conversaId);
    if (!conversa || conversa.familyId !== user.familyId) return [];
    const msgs = await ctx.db
      .query("mensagensIA")
      .withIndex("by_conversa", (q) => q.eq("conversaId", conversaId))
      .collect();
    return msgs.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  },
});

export const criar = mutation({
  args: { sessionToken: v.string(), titulo: v.optional(v.string()) },
  handler: async (ctx, { sessionToken, titulo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const agora = new Date().toISOString();
    return await ctx.db.insert("conversasIA", {
      titulo: titulo ?? "Nova conversa",
      familyId: user.familyId,
      pessoaId: user.pessoaId,
      canal: "web",
      ultimaMensagemEm: agora,
      arquivada: false,
      criadoPor: user._id,
      criadoEm: agora,
    });
  },
});

export const atualizarTitulo = mutation({
  args: { sessionToken: v.string(), id: v.id("conversasIA"), titulo: v.string() },
  handler: async (ctx, { sessionToken, id, titulo }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { titulo });
  },
});

export const arquivar = mutation({
  args: { sessionToken: v.string(), id: v.id("conversasIA") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { arquivada: true });
  },
});

export const remover = mutation({
  args: { sessionToken: v.string(), id: v.id("conversasIA") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");

    const msgs = await ctx.db
      .query("mensagensIA")
      .withIndex("by_conversa", (q) => q.eq("conversaId", id))
      .collect();
    for (const m of msgs) {
      if (m.anexos) {
        for (const a of m.anexos) {
          try {
            await ctx.storage.delete(a.storageId);
          } catch {}
        }
      }
      await ctx.db.delete(m._id);
    }

    const drafts = await ctx.db
      .query("draftsLancamento")
      .withIndex("by_conversa", (q) => q.eq("conversaId", id))
      .collect();
    for (const d of drafts) await ctx.db.delete(d._id);

    await ctx.db.delete(id);
  },
});

// ====== Internas (chamadas pelo core do agente) ======

export const _getConversaInternal = internalQuery({
  args: { conversaId: v.id("conversasIA") },
  handler: async (ctx, { conversaId }) => {
    return await ctx.db.get(conversaId);
  },
});

export const _listMensagensInternal = internalQuery({
  args: { conversaId: v.id("conversasIA") },
  handler: async (ctx, { conversaId }) => {
    const msgs = await ctx.db
      .query("mensagensIA")
      .withIndex("by_conversa", (q) => q.eq("conversaId", conversaId))
      .collect();
    return msgs.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  },
});

export const _inserirMensagemInternal = internalMutation({
  args: {
    conversaId: v.id("conversasIA"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolUseBlocks: v.optional(v.string()),
    toolResultBlocks: v.optional(v.string()),
    anexos: v.optional(
      v.array(
        v.object({
          tipo: v.union(v.literal("imagem"), v.literal("pdf"), v.literal("audio")),
          storageId: v.id("_storage"),
          nome: v.string(),
          mediaType: v.string(),
          transcricao: v.optional(v.string()),
        })
      )
    ),
    familyId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("mensagensIA", {
      ...args,
      criadoEm: new Date().toISOString(),
    });
    await ctx.db.patch(args.conversaId, { ultimaMensagemEm: new Date().toISOString() });
    return id;
  },
});

export const _atualizarTituloInternal = internalMutation({
  args: { conversaId: v.id("conversasIA"), titulo: v.string() },
  handler: async (ctx, { conversaId, titulo }) => {
    await ctx.db.patch(conversaId, { titulo: titulo.slice(0, 80) });
  },
});
