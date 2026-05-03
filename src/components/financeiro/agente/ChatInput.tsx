"use client";
import { useRef, useState, useEffect } from "react";
import { Send, Paperclip, Mic, Loader2, Square } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { AnexoLocal, AnexoPreview } from "./AnexoPreview";

const MAX_ANEXOS = 5;
const MAX_TAM_BYTES = 15 * 1024 * 1024; // 15 MB

export function ChatInput({
  onEnviar,
  enviando,
}: {
  onEnviar: (
    texto: string,
    anexos: Array<{
      tipo: "imagem" | "pdf" | "audio";
      storageId: string;
      nome: string;
      mediaType: string;
    }>
  ) => Promise<void>;
  enviando: boolean;
}) {
  const token = useSessionToken();
  const gerarUrlUpload = useMutation(api.agente.anexos.gerarUrlUpload);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const [uploadando, setUploadando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 200)}px`;
  }, [texto]);

  function adicionarArquivos(files: FileList | null) {
    if (!files) return;
    setErro(null);
    const novos: AnexoLocal[] = [];
    for (const f of Array.from(files)) {
      if (anexos.length + novos.length >= MAX_ANEXOS) {
        setErro(`Máximo ${MAX_ANEXOS} anexos por mensagem`);
        break;
      }
      if (f.size > MAX_TAM_BYTES) {
        setErro(`${f.name} é muito grande (máx 15 MB)`);
        continue;
      }
      const tipo = detectarTipo(f.type, f.name);
      if (!tipo) {
        setErro(`Tipo não suportado: ${f.name}`);
        continue;
      }
      novos.push({
        tipo,
        file: f,
        nome: f.name,
        mediaType: f.type || mediaTypeFallback(tipo),
        url: URL.createObjectURL(f),
      });
    }
    setAnexos((prev) => [...prev, ...novos]);
  }

  function removerAnexo(idx: number) {
    setAnexos((prev) => {
      const c = [...prev];
      const removido = c.splice(idx, 1)[0];
      if (removido) URL.revokeObjectURL(removido.url);
      return c;
    });
  }

  async function iniciarGravacao() {
    if (anexos.length >= MAX_ANEXOS) {
      setErro(`Máximo ${MAX_ANEXOS} anexos por mensagem`);
      return;
    }
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: mr.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type });
        setAnexos((prev) => [
          ...prev,
          {
            tipo: "audio",
            file,
            nome: file.name,
            mediaType: file.type,
            url: URL.createObjectURL(file),
          },
        ]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setGravando(true);
    } catch {
      setErro("Não foi possível acessar o microfone");
    }
  }

  function pararGravacao() {
    recRef.current?.stop();
    recRef.current = null;
    setGravando(false);
  }

  async function enviar() {
    if (!token || enviando || uploadando) return;
    const txt = texto.trim();
    if (!txt && anexos.length === 0) return;

    setUploadando(true);
    setErro(null);
    try {
      const anexosUpload: Array<{
        tipo: "imagem" | "pdf" | "audio";
        storageId: string;
        nome: string;
        mediaType: string;
      }> = [];
      for (const a of anexos) {
        const url = await gerarUrlUpload({ sessionToken: token });
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": a.mediaType },
          body: a.file,
        });
        if (!resp.ok) throw new Error(`Falha ao enviar ${a.nome}`);
        const data = (await resp.json()) as { storageId: string };
        anexosUpload.push({
          tipo: a.tipo,
          storageId: data.storageId,
          nome: a.nome,
          mediaType: a.mediaType,
        });
      }

      // Reset visual antes de chamar a action (que pode demorar)
      anexos.forEach((a) => URL.revokeObjectURL(a.url));
      setTexto("");
      setAnexos([]);

      await onEnviar(txt, anexosUpload);
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao enviar");
    } finally {
      setUploadando(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  const desabilitado = enviando || uploadando;

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {anexos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {anexos.map((a, i) => (
            <AnexoPreview key={i} anexo={a} onRemove={() => removerAnexo(i)} />
          ))}
        </div>
      )}
      {erro && <div className="mb-2 text-xs text-danger">{erro}</div>}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={desabilitado || gravando}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          aria-label="Anexar arquivo"
          title="Anexar imagem ou PDF"
        >
          <Paperclip size={18} />
        </button>
        <button
          type="button"
          onClick={gravando ? pararGravacao : iniciarGravacao}
          disabled={desabilitado}
          className={`rounded-lg p-2 transition-colors disabled:opacity-40 ${
            gravando
              ? "bg-rose-500 text-white hover:bg-rose-600 animate-pulse"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
          aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
          title={gravando ? "Parar gravação" : "Gravar áudio"}
        >
          {gravando ? <Square size={16} /> : <Mic size={18} />}
        </button>

        <textarea
          ref={taRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKey}
          placeholder={
            gravando
              ? "Gravando áudio... clique no quadrado para parar"
              : "Pergunte sobre suas finanças ou peça para lançar algo..."
          }
          disabled={desabilitado || gravando}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
        />

        <button
          type="button"
          onClick={enviar}
          disabled={desabilitado || gravando || (!texto.trim() && anexos.length === 0)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
          aria-label="Enviar"
        >
          {desabilitado ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

function detectarTipo(mt: string, nome: string): "imagem" | "pdf" | "audio" | null {
  if (mt.startsWith("image/")) return "imagem";
  if (mt === "application/pdf" || nome.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mt.startsWith("audio/")) return "audio";
  return null;
}

function mediaTypeFallback(t: "imagem" | "pdf" | "audio"): string {
  if (t === "imagem") return "image/jpeg";
  if (t === "pdf") return "application/pdf";
  return "audio/webm";
}
