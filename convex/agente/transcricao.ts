"use node";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

// Transcreve um arquivo de áudio (MP3/M4A/OGG/WEBM/WAV) usando OpenAI Whisper.
// Retorna a transcrição em texto. Idioma forçado para PT-BR.
export const transcreverAudio = internalAction({
  args: {
    storageId: v.id("_storage"),
    mediaType: v.string(),
    nome: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, mediaType, nome }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY não configurada (necessária para transcrever áudios)");
    }

    const url = await ctx.runQuery(internal.agente.anexos._getStorageUrl, { storageId });
    if (!url) throw new Error("Áudio não encontrado no storage");

    const audioRes = await fetch(url);
    if (!audioRes.ok) throw new Error(`Falha ao baixar áudio: ${audioRes.status}`);
    const audioBlob = await audioRes.blob();

    const form = new FormData();
    form.append("file", audioBlob, nome ?? `audio.${extDeMedia(mediaType)}`);
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("response_format", "json");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Whisper falhou: ${resp.status} — ${err}`);
    }
    const data = (await resp.json()) as { text?: string };
    return data.text?.trim() ?? "";
  },
});

function extDeMedia(mt: string): string {
  if (mt.includes("mpeg") || mt.includes("mp3")) return "mp3";
  if (mt.includes("ogg")) return "ogg";
  if (mt.includes("webm")) return "webm";
  if (mt.includes("wav")) return "wav";
  if (mt.includes("m4a") || mt.includes("mp4")) return "m4a";
  return "mp3";
}
