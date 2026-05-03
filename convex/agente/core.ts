"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { TOOL_DEFS, executarTool, type ToolExecCtx } from "./tools";
import { montarPromptTitulo, montarSystemPrompt } from "./prompts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 8;
const MAX_HISTORICO_MENSAGENS = 30;

type AnexoInput = {
  tipo: "imagem" | "pdf" | "audio";
  storageId: Id<"_storage">;
  nome: string;
  mediaType: string;
};

type ContentBlock =
  | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: any }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

interface AnthropicMessage {
  role: "user" | "assistant";
  content: ContentBlock[] | string;
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
}

export const processar = action({
  args: {
    sessionToken: v.string(),
    conversaId: v.id("conversasIA"),
    mensagem: v.string(),
    anexos: v.optional(
      v.array(
        v.object({
          tipo: v.union(v.literal("imagem"), v.literal("pdf"), v.literal("audio")),
          storageId: v.id("_storage"),
          nome: v.string(),
          mediaType: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, { sessionToken, conversaId, mensagem, anexos }) => {
    // 1) Validar sessão
    const user = await ctx.runQuery(internal.auth.getUserByToken, { sessionToken });
    if (!user) throw new Error("Não autenticado");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada no servidor");

    // 2) Validar conversa pertence à família
    const conversa = await ctx.runQuery(internal.agente.conversas._getConversaInternal, {
      conversaId,
    });
    if (!conversa || conversa.familyId !== user.familyId) {
      throw new Error("Conversa não encontrada");
    }

    // 3) Pré-processar anexos
    const anexosProcessados: Array<AnexoInput & { transcricao?: string; base64?: string }> = [];
    for (const a of anexos ?? []) {
      if (a.tipo === "audio") {
        const transcricao = await ctx.runAction(internal.agente.transcricao.transcreverAudio, {
          storageId: a.storageId,
          mediaType: a.mediaType,
          nome: a.nome,
        });
        anexosProcessados.push({ ...a, transcricao });
      } else {
        const url = await ctx.runQuery(internal.agente.anexos._getStorageUrl, {
          storageId: a.storageId,
        });
        if (!url) throw new Error(`Anexo ${a.nome} não encontrado no storage`);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Falha ao baixar anexo ${a.nome}`);
        const buf = new Uint8Array(await resp.arrayBuffer());
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) {
          bin += String.fromCharCode(...buf.subarray(i, i + chunk));
        }
        anexosProcessados.push({ ...a, base64: btoa(bin) });
      }
    }

    // 4) Persistir mensagem do user
    let mensagemTextoFinal = mensagem.trim();
    const transcricoes = anexosProcessados
      .filter((a) => a.tipo === "audio" && a.transcricao)
      .map((a) => `[Áudio transcrito: "${a.transcricao}"]`);
    if (transcricoes.length > 0) {
      mensagemTextoFinal = [mensagemTextoFinal, ...transcricoes].filter(Boolean).join("\n");
    }
    if (!mensagemTextoFinal && (anexos?.length ?? 0) > 0) {
      mensagemTextoFinal = "(usuário enviou anexos, sem texto adicional)";
    }

    const mensagemIdUsuario = await ctx.runMutation(
      internal.agente.conversas._inserirMensagemInternal,
      {
        conversaId,
        role: "user",
        content: mensagemTextoFinal,
        anexos:
          (anexos?.length ?? 0) > 0
            ? anexosProcessados.map((a) => ({
                tipo: a.tipo,
                storageId: a.storageId,
                nome: a.nome,
                mediaType: a.mediaType,
                transcricao: a.transcricao,
              }))
            : undefined,
        familyId: user.familyId,
      }
    );

    // 5) Carregar histórico (últimas N msgs, exceto a recém-inserida)
    const historico = await ctx.runQuery(internal.agente.conversas._listMensagensInternal, {
      conversaId,
    });
    const historicoSemAtual = historico.filter((m) => m._id !== mensagemIdUsuario);
    const ultimas = historicoSemAtual.slice(-MAX_HISTORICO_MENSAGENS);

    // 6) Montar mensagens para Anthropic
    const messages: AnthropicMessage[] = [];
    for (const m of ultimas) {
      // Histórico: incluímos tool_use/tool_result se houver, para coerência do contexto
      if (m.role === "assistant") {
        const blocks: ContentBlock[] = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        if (m.toolUseBlocks) {
          try {
            const arr = JSON.parse(m.toolUseBlocks);
            for (const t of arr) blocks.push({ type: "tool_use", id: t.id, name: t.name, input: t.input });
          } catch {}
        }
        if (blocks.length > 0) messages.push({ role: "assistant", content: blocks });
      } else {
        const blocks: ContentBlock[] = [];
        if (m.toolResultBlocks) {
          try {
            const arr = JSON.parse(m.toolResultBlocks);
            for (const t of arr)
              blocks.push({
                type: "tool_result",
                tool_use_id: t.tool_use_id,
                content: t.content,
                is_error: t.is_error,
              });
          } catch {}
        }
        if (m.content) blocks.push({ type: "text", text: m.content });
        if (blocks.length > 0) messages.push({ role: "user", content: blocks });
      }
    }

    // Mensagem atual do usuário (com anexos visuais)
    const conteudoAtual: ContentBlock[] = [];
    for (const a of anexosProcessados) {
      if (a.tipo === "imagem" && a.base64) {
        conteudoAtual.push({
          type: "image",
          source: { type: "base64", media_type: a.mediaType, data: a.base64 },
        });
      } else if (a.tipo === "pdf" && a.base64) {
        conteudoAtual.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: a.base64 },
        });
      }
    }
    if (mensagemTextoFinal) {
      conteudoAtual.push({ type: "text", text: mensagemTextoFinal });
    }
    messages.push({ role: "user", content: conteudoAtual });

    // 7) System prompt + tools
    const hojeISO = new Date().toISOString().slice(0, 10);
    const mesAtual = hojeISO.slice(0, 7);
    const systemPrompt = montarSystemPrompt({
      hojeISO,
      mesAtual,
      nomeUsuario: user.name,
      canal: conversa.canal,
    });

    // Aplicamos cache_control no último bloco de system para habilitar prompt caching.
    const systemBlocks = [
      { type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } },
    ];

    // Anexar cache_control também na última definição de tool
    const tools = TOOL_DEFS.map((t, i) =>
      i === TOOL_DEFS.length - 1
        ? { ...t, cache_control: { type: "ephemeral" as const } }
        : t
    );

    const execCtx: ToolExecCtx = {
      ctx,
      sessionToken,
      conversaId,
      mensagemId: mensagemIdUsuario,
      familyId: user.familyId,
      userId: user._id,
    };

    // 8) Tool loop
    let iter = 0;
    let finalText = "";
    const acumuladoToolUse: Array<{ id: string; name: string; input: any }> = [];
    const acumuladoToolResults: Array<{ tool_use_id: string; content: string; is_error?: boolean }> = [];

    while (iter < MAX_TOOL_ITERATIONS) {
      iter++;
      const resp = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "pdfs-2024-09-25",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: systemBlocks,
          tools,
          messages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Anthropic API ${resp.status}: ${err}`);
      }

      const data = (await resp.json()) as AnthropicResponse;

      // Coletar texto e tool_use blocks
      const textoDessaRodada = data.content
        .filter((b) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim();
      const toolUses = data.content.filter((b) => b.type === "tool_use") as Array<{
        type: "tool_use";
        id: string;
        name: string;
        input: any;
      }>;

      if (textoDessaRodada) {
        finalText = finalText ? `${finalText}\n${textoDessaRodada}` : textoDessaRodada;
      }

      if (data.stop_reason === "tool_use" && toolUses.length > 0) {
        // Adiciona resposta do assistente (texto + tool_use) no histórico de mensagens p/ próximo turno
        messages.push({ role: "assistant", content: data.content });

        const toolResultsBlocks: ContentBlock[] = [];
        for (const tu of toolUses) {
          acumuladoToolUse.push({ id: tu.id, name: tu.name, input: tu.input });
          const result = await executarTool(tu.name, tu.input ?? {}, execCtx);
          const conteudo = result.ok
            ? JSON.stringify(result.data ?? { ok: true })
            : `Erro: ${result.error ?? "desconhecido"}`;
          const block = {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: conteudo,
            is_error: !result.ok,
          };
          toolResultsBlocks.push(block);
          acumuladoToolResults.push({
            tool_use_id: tu.id,
            content: conteudo,
            is_error: !result.ok,
          });
        }
        messages.push({ role: "user", content: toolResultsBlocks });
        continue;
      }

      // end_turn ou max_tokens — sair do loop
      break;
    }

    if (!finalText) {
      finalText = "(sem resposta)";
    }

    // 9) Persistir resposta do assistente
    await ctx.runMutation(internal.agente.conversas._inserirMensagemInternal, {
      conversaId,
      role: "assistant",
      content: finalText,
      toolUseBlocks: acumuladoToolUse.length > 0 ? JSON.stringify(acumuladoToolUse) : undefined,
      toolResultBlocks:
        acumuladoToolResults.length > 0 ? JSON.stringify(acumuladoToolResults) : undefined,
      familyId: user.familyId,
    });

    // 10) Se for 1ª mensagem da conversa, gerar título
    if (historicoSemAtual.length === 0 && conversa.titulo === "Nova conversa") {
      try {
        const tituloResp = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 30,
            messages: [
              {
                role: "user",
                content: montarPromptTitulo(mensagemTextoFinal),
              },
            ],
          }),
        });
        if (tituloResp.ok) {
          const tdata = (await tituloResp.json()) as { content: Array<{ type: string; text: string }> };
          const titulo = tdata.content[0]?.text?.trim().replace(/^["']|["']$/g, "");
          if (titulo) {
            await ctx.runMutation(internal.agente.conversas._atualizarTituloInternal, {
              conversaId,
              titulo,
            });
          }
        }
      } catch {
        // título é cosmético — falha silenciosa
      }
    }

    return { ok: true };
  },
});
