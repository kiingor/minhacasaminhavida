"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Conversa = Doc<"conversasIA">;

function relativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `${dias}d`;
  if (dias < 30) return `${Math.floor(dias / 7)}sem`;
  return `${Math.floor(dias / 30)}mês`;
}

export function ChatLista({
  ativaId,
  onSelecionar,
  onCriar,
}: {
  ativaId: Id<"conversasIA"> | null;
  onSelecionar: (id: Id<"conversasIA">) => void;
  onCriar: () => Promise<void>;
}) {
  const token = useSessionToken();
  const conversas = useQuery(api.agente.conversas.list, token ? { sessionToken: token } : "skip");
  const remover = useMutation(api.agente.conversas.remover);
  const [criando, setCriando] = useState(false);
  const [removendoId, setRemovendoId] = useState<Id<"conversasIA"> | null>(null);

  async function handleNova() {
    if (criando) return;
    setCriando(true);
    try {
      await onCriar();
    } finally {
      setCriando(false);
    }
  }

  async function handleRemover() {
    if (!token || !removendoId) return;
    await remover({ sessionToken: token, id: removendoId });
    setRemovendoId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <button
        onClick={handleNova}
        disabled={criando}
        className="m-3 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {criando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Nova conversa
      </button>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {conversas === undefined ? (
          <div className="space-y-2 px-1">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : conversas.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-400">
            Sem conversas ainda. Crie uma nova!
          </div>
        ) : (
          <ul className="space-y-1">
            {conversas.map((c: Conversa) => {
              const ativa = ativaId === c._id;
              return (
                <li key={c._id}>
                  <div
                    className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                      ativa
                        ? "bg-primary/10 text-primary"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <button
                      onClick={() => onSelecionar(c._id)}
                      className="flex flex-1 items-center gap-2 text-left min-w-0"
                    >
                      <MessageSquare size={14} className="shrink-0 opacity-60" />
                      <span className="truncate">{c.titulo}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                        {relativo(c.ultimaMensagemEm)}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemovendoId(c._id);
                      }}
                      className="hidden rounded p-1 text-slate-400 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 sm:block"
                      aria-label="Remover conversa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!removendoId}
        onClose={() => setRemovendoId(null)}
        onConfirm={handleRemover}
        title="Excluir conversa"
        description="Tem certeza? Todas as mensagens e drafts serão removidos."
      />
    </div>
  );
}
