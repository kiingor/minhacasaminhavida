"use client";
import { useQuery } from "convex/react";
import { Image as ImageIcon, FileText, Mic, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";

export type AnexoLocal = {
  tipo: "imagem" | "pdf" | "audio";
  file: File;
  url: string; // ObjectURL para preview
  nome: string;
  mediaType: string;
};

export function AnexoPreview({
  anexo,
  onRemove,
}: {
  anexo: AnexoLocal;
  onRemove?: () => void;
}) {
  return (
    <div className="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
      {anexo.tipo === "imagem" ? (
        <img src={anexo.url} alt={anexo.nome} className="h-8 w-8 rounded object-cover" />
      ) : anexo.tipo === "pdf" ? (
        <FileText size={16} className="text-rose-500" />
      ) : (
        <Mic size={16} className="text-violet-500" />
      )}
      <span className="max-w-[140px] truncate text-slate-700">{anexo.nome}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-danger"
          aria-label="Remover anexo"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export function AnexoPersistido({
  anexo,
}: {
  anexo: {
    tipo: "imagem" | "pdf" | "audio";
    nome: string;
    transcricao?: string;
    storageId: Id<"_storage">;
  };
}) {
  const token = useSessionToken();
  const url = useQuery(
    api.agente.anexos.obterUrlAnexo,
    token && (anexo.tipo === "imagem" || anexo.tipo === "pdf")
      ? { sessionToken: token, storageId: anexo.storageId }
      : "skip"
  );

  if (anexo.tipo === "imagem") {
    if (!url) return <div className="h-24 w-32 animate-pulse rounded-lg bg-slate-100" />;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={anexo.nome}
        className="max-h-48 max-w-full rounded-lg border border-slate-200"
      />
    );
  }
  if (anexo.tipo === "pdf") {
    return (
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50"
      >
        <FileText size={14} className="text-rose-500" />
        <span className="font-medium text-slate-700">{anexo.nome}</span>
        <span className="text-slate-400">PDF</span>
      </a>
    );
  }
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs max-w-md">
      <div className="mb-1 flex items-center gap-2 font-medium text-violet-700">
        <Mic size={14} /> Áudio enviado
      </div>
      {anexo.transcricao && (
        <div className="text-slate-700">
          <span className="text-slate-400">Transcrição:</span> &ldquo;{anexo.transcricao}&rdquo;
        </div>
      )}
    </div>
  );
}

export function IconePorTipo({ tipo }: { tipo: "imagem" | "pdf" | "audio" }) {
  if (tipo === "imagem") return <ImageIcon size={14} />;
  if (tipo === "pdf") return <FileText size={14} />;
  return <Mic size={14} />;
}
