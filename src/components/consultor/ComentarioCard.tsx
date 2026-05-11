"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, Trash2, RotateCcw, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { useSession, useSessionToken } from "@/contexts/SessionContext";
import { formatTempoRelativo } from "@/lib/formatters";
import { Id } from "../../../convex/_generated/dataModel";

interface Comentario {
  _id: Id<"comentariosConsultor">;
  consultorId: Id<"users">;
  contextoTela: string;
  texto: string;
  resolvido: boolean;
  criadoEm: string;
  atualizadoEm: string;
  nomeConsultor?: string;
}

interface Props {
  comentario: Comentario;
  showContexto?: boolean;
}

export function ComentarioCard({ comentario, showContexto }: Props) {
  const token = useSessionToken();
  const { session } = useSession();
  const resolver = useMutation(api.consultor.resolverComentario);
  const remover = useMutation(api.consultor.removerComentario);
  const [busy, setBusy] = useState(false);

  // V1: so consultor pode excluir (mutation valida que e o autor).
  // Cliente pode resolver/reabrir (validado no backend).
  const podeExcluir = session?.role === "consultor";

  async function toggleResolvido() {
    if (!token || busy) return;
    setBusy(true);
    try {
      await resolver({ sessionToken: token, id: comentario._id });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemover() {
    if (!token || busy) return;
    if (!window.confirm("Excluir este comentário?")) return;
    setBusy(true);
    try {
      await remover({ sessionToken: token, id: comentario._id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover");
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition-colors ${
        comentario.resolvido
          ? "bg-slate-50 border-slate-200 opacity-70"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            comentario.resolvido ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
          }`}
        >
          {comentario.resolvido ? <Check size={16} /> : <MessageCircle size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">
              {comentario.nomeConsultor ?? "Consultor"}
            </span>
            <span className="text-xs text-slate-400">
              {formatTempoRelativo(comentario.criadoEm)}
            </span>
            {comentario.resolvido && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Resolvido
              </span>
            )}
          </div>
          {showContexto && (
            <div className="text-[11px] text-slate-400 font-mono mb-1 truncate">
              {comentario.contextoTela}
            </div>
          )}
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
            {comentario.texto}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 justify-end">
        <button
          onClick={toggleResolvido}
          disabled={busy}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          {comentario.resolvido ? (
            <>
              <RotateCcw size={12} /> Reabrir
            </>
          ) : (
            <>
              <Check size={12} /> Resolver
            </>
          )}
        </button>
        {podeExcluir && (
          <button
            onClick={handleRemover}
            disabled={busy}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-md text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            <Trash2 size={12} /> Excluir
          </button>
        )}
      </div>
    </motion.div>
  );
}
