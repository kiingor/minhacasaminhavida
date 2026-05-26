"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { TOOL_DEFS, executarTool, type ToolExecCtx } from "./tools";
import { montarPromptTitulo, montarSystemPrompt } from "./prompts";

// Agente IA via API compatível OpenAI (usa OmniRouter por padrão).
// Migrado de Anthropic Claude para OpenAI — tool use vira function calling,
// images viram image_url, PDFs são desabilitados (envie como imagem).
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const MODEL = "gpt-4o";
const MODEL_TITULO = "gpt-4o-mini";
const MAX_TOOL_ITERATIONS = 8;
const MAX_HISTORICO_MENSAGENS = 30;

type AnexoInput = {
  tipo: "imagem" | "pdf" | "audio";
  storageId: Id<"_storage">;
  nome: string;
  mediaType: string;
};

// Content parts no formato OpenAI Chat Completions.
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ContentPart[] }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

interface OpenAIChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
}

interface OpenAIResponse {
  id: string;
  choices: OpenAIChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// Converte TOOL_DEFS (formato Anthropic) -> formato OpenAI function calling
function toOpenAITools(): Array<{
  type: "function";
  function: { name: string; description: string; parameters: object };
}> {
  return TOOL_DEFS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as object,
    },
  }));
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no servidor");
    const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const chatUrl = `${baseUrl}/chat/completions`;

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
      } else if (a.tipo === "pdf") {
        // PDFs nativos não são suportados pela maioria dos endpoints OpenAI-compatible.
        // Por ora, anota como nota no texto e segue. Usuário pode converter em imagem.
        anexosProcessados.push({ ...a });
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
    const pdfsNotas = anexosProcessados
      .filter((a) => a.tipo === "pdf")
      .map((a) => `[PDF anexado: "${a.nome}" — leitura de PDF temporariamente indisponível, peça ao usuário pra enviar como imagem ou copiar o texto.]`);
    if (pdfsNotas.length > 0) {
      mensagemTextoFinal = [mensagemTextoFinal, ...pdfsNotas].filter(Boolean).join("\n");
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

    // 6) Montar mensagens no formato OpenAI Chat Completions
    // Mensagens assistant que usaram tools viram dois "turnos" no formato OpenAI:
    //   assistant: { content: null, tool_calls: [...] }
    //   tool:      { role: "tool", tool_call_id: X, content: result }   (uma por tool_call)
    //   assistant: { content: "texto final" }
    const hojeISO = new Date().toISOString().slice(0, 10);
    const mesAtual = hojeISO.slice(0, 7);
    const systemPrompt = montarSystemPrompt({
      hojeISO,
      mesAtual,
      nomeUsuario: user.name,
      canal: conversa.canal,
    });

    const messages: OpenAIMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const m of ultimas) {
      if (m.role === "assistant") {
        let toolUses: Array<{ id: string; name: string; input: unknown }> = [];
        let toolResults: Array<{ tool_use_id: string; content: string; is_error?: boolean }> = [];
        if (m.toolUseBlocks) {
          try { toolUses = JSON.parse(m.toolUseBlocks); } catch {}
        }
        if (m.toolResultBlocks) {
          try { toolResults = JSON.parse(m.toolResultBlocks); } catch {}
        }

        if (toolUses.length > 0) {
          messages.push({
            role: "assistant",
            content: null,
            tool_calls: toolUses.map((t) => ({
              id: t.id,
              type: "function" as const,
              function: { name: t.name, arguments: JSON.stringify(t.input ?? {}) },
            })),
          });
          for (const tr of toolResults) {
            messages.push({
              role: "tool",
              tool_call_id: tr.tool_use_id,
              content: tr.content,
            });
          }
        }

        if (m.content) {
          messages.push({ role: "assistant", content: m.content });
        }
      } else {
        if (m.content) {
          messages.push({ role: "user", content: m.content });
        }
      }
    }

    // Mensagem atual do usuário (com imagens em image_url)
    const contentParts: ContentPart[] = [];
    for (const a of anexosProcessados) {
      if (a.tipo === "imagem" && a.base64) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${a.mediaType};base64,${a.base64}`,
            detail: "auto",
          },
        });
      }
      // PDFs são tratados via nota textual em mensagemTextoFinal acima.
    }
    if (mensagemTextoFinal) {
      contentParts.push({ type: "text", text: mensagemTextoFinal });
    }
    // Se só tem texto, manda string simples (mais compatível com endpoints variados)
    if (contentParts.length === 1 && contentParts[0].type === "text") {
      messages.push({ role: "user", content: contentParts[0].text });
    } else {
      messages.push({ role: "user", content: contentParts });
    }

    // 7) Tools no formato OpenAI
    const tools = toOpenAITools();

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
    const acumuladoToolUse: Array<{ id: string; name: string; input: unknown }> = [];
    const acumuladoToolResults: Array<{ tool_use_id: string; content: string; is_error?: boolean }> = [];

    while (iter < MAX_TOOL_ITERATIONS) {
      iter++;
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          tools,
          tool_choice: "auto",
          messages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`OpenAI API ${resp.status}: ${err}`);
      }

      const data = (await resp.json()) as OpenAIResponse;
      const choice = data.choices?.[0];
      if (!choice) throw new Error("OpenAI: resposta sem choices");
      const message = choice.message;

      // Texto da rodada (pode ser null em tool_calls only)
      const textoDessaRodada = (message.content ?? "").trim();
      if (textoDessaRodada) {
        finalText = finalText ? `${finalText}\n${textoDessaRodada}` : textoDessaRodada;
      }

      const toolCalls = message.tool_calls ?? [];

      if (choice.finish_reason === "tool_calls" && toolCalls.length > 0) {
        // Adiciona o assistant turn com tool_calls
        messages.push({
          role: "assistant",
          content: message.content ?? null,
          tool_calls: toolCalls,
        });

        for (const tc of toolCalls) {
          let parsedInput: unknown = {};
          try { parsedInput = JSON.parse(tc.function.arguments || "{}"); } catch {}
          acumuladoToolUse.push({ id: tc.id, name: tc.function.name, input: parsedInput });

          const result = await executarTool(tc.function.name, (parsedInput as Record<string, unknown>) ?? {}, execCtx);
          const conteudo = result.ok
            ? JSON.stringify(result.data ?? { ok: true })
            : `Erro: ${result.error ?? "desconhecido"}`;

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: conteudo,
          });
          acumuladoToolResults.push({
            tool_use_id: tc.id,
            content: conteudo,
            is_error: !result.ok,
          });
        }
        continue;
      }

      // stop, length ou content_filter — sair do loop
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
        const tituloResp = await fetch(chatUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL_TITULO,
            max_tokens: 30,
            messages: [
              { role: "user", content: montarPromptTitulo(mensagemTextoFinal) },
            ],
          }),
        });
        if (tituloResp.ok) {
          const tdata = (await tituloResp.json()) as OpenAIResponse;
          const titulo = tdata.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
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
