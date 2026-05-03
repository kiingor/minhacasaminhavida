import { httpRouter } from "convex/server";

const http = httpRouter();

// ============================================================
// FASE 2 (não implementado): Webhook Evolution API (WhatsApp)
// ============================================================
// O core do Agente já é canal-agnóstico (convex/agente/core.ts).
// Para plugar o WhatsApp via Evolution API basta:
//
// 1. Criar tabela `vinculosCanal` (numero ↔ pessoaId/familyId/sessionToken).
// 2. Registrar httpAction abaixo (POST /webhook/evolution).
// 3. No handler:
//      - Validar assinatura/token do webhook
//      - Identificar usuário pelo `from` (número)
//      - Para mídias: baixar via URL temporária da Evolution e fazer upload
//        ao ctx.storage para reaproveitar o pipeline de anexos
//      - Chamar ctx.runAction(api.agente.core.processar, {...}) com canal: "whatsapp"
//      - Buscar a última mensagem do assistant via query
//      - Enviar de volta ao usuário via REST da Evolution API
//
// Esqueleto:
//
// import { httpAction } from "./_generated/server";
// import { api } from "./_generated/api";
//
// http.route({
//   path: "/webhook/evolution",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {
//     const payload = await request.json();
//     // const numero = payload.data.key.remoteJid;
//     // const texto = payload.data.message.conversation;
//     // ... resolve sessionToken/conversaId via vinculosCanal
//     // await ctx.runAction(api.agente.core.processar, { ... });
//     return new Response(JSON.stringify({ ok: true }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   }),
// });

export default http;
