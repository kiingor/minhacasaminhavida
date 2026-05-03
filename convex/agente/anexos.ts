import { v } from "convex/values";
import { mutation, query, internalQuery } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

export const gerarUrlUpload = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await getCurrentUser(ctx, sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

// Resolve URL temporária para exibir um anexo no chat.
export const obterUrlAnexo = query({
  args: { sessionToken: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { sessionToken, storageId }) => {
    await getCurrentUser(ctx, sessionToken);
    return await ctx.storage.getUrl(storageId);
  },
});

// Retorna URL temporária do arquivo no storage (usada pelo core do agente
// para baixar e converter em base64 ao montar a chamada da Anthropic API).
export const _getStorageUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
