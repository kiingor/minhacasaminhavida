"use client";
import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMensagem } from "./ChatMensagem";
import { Draft } from "./DraftLancamentoCard";

const SUGESTOES = [
  "Quanto eu gastei este mês?",
  "Quais categorias mais gastei?",
  "Compara este mês com o mês passado",
  "Quais contas vencem nos próximos dias?",
];

export function ChatJanela({
  conversaId,
  enviando,
  onSugestao,
}: {
  conversaId: Id<"conversasIA">;
  enviando: boolean;
  onSugestao: (texto: string) => void;
}) {
  const token = useSessionToken();
  const mensagens = useQuery(
    api.agente.conversas.listMensagens,
    token ? { sessionToken: token, conversaId } : "skip"
  );
  const drafts = useQuery(
    api.agente.drafts.listByConversa,
    token ? { sessionToken: token, conversaId } : "skip"
  );

  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens?.length, enviando]);

  const draftsPorMensagem = new Map<string, Draft[]>();
  for (const d of drafts ?? []) {
    if (!d.mensagemId) continue;
    const arr = draftsPorMensagem.get(d.mensagemId) ?? [];
    arr.push({
      _id: d._id,
      tipo: d.tipo,
      resumo: d.resumo,
      status: d.status,
      erro: d.erro,
    });
    draftsPorMensagem.set(d.mensagemId, arr);
  }

  if (mensagens === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (mensagens.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <Sparkles size={26} />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-slate-800">
            Pronto para conversar sobre suas finanças
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pergunte qualquer coisa sobre seus gastos, receitas ou peça para lançar um pagamento.
          </p>
        </div>
        <div className="grid w-full max-w-md gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => onSugestao(s)}
              disabled={enviando}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50/40 p-4">
      {mensagens.map((m) => (
        <ChatMensagem
          key={m._id}
          msg={m}
          draftsDaMensagem={draftsPorMensagem.get(m._id) ?? []}
        />
      ))}
      {enviando && (
        <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Bot size={14} />
          </div>
          <Loader2 size={12} className="animate-spin" />
          Pensando...
        </div>
      )}
      <div ref={fimRef} />
    </div>
  );
}
