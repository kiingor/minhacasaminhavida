"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, X, Loader2, ArrowDownCircle, ArrowUpCircle, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";

type DraftStatus = "pendente" | "confirmado" | "cancelado";
type DraftTipo = "despesa" | "receita" | "marcar_paga" | "marcar_recebida";

export type Draft = {
  _id: Id<"draftsLancamento">;
  tipo: DraftTipo;
  resumo: string;
  status: DraftStatus;
  erro?: string;
};

export function DraftLancamentoCard({ draft }: { draft: Draft }) {
  const token = useSessionToken();
  const confirmar = useMutation(api.agente.drafts.confirmar);
  const cancelar = useMutation(api.agente.drafts.cancelar);
  const [loading, setLoading] = useState<"confirmar" | "cancelar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const isDespesa = draft.tipo === "despesa" || draft.tipo === "marcar_paga";
  const corBorda =
    draft.status === "confirmado"
      ? "border-emerald-300 bg-emerald-50/60"
      : draft.status === "cancelado"
      ? "border-slate-200 bg-slate-50/60"
      : isDespesa
      ? "border-rose-200 bg-rose-50/60"
      : "border-emerald-200 bg-emerald-50/60";

  async function handleConfirmar() {
    if (!token || loading) return;
    setLoading("confirmar");
    setErro(null);
    try {
      await confirmar({ sessionToken: token, id: draft._id });
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao confirmar");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelar() {
    if (!token || loading) return;
    setLoading("cancelar");
    setErro(null);
    try {
      await cancelar({ sessionToken: token, id: draft._id });
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao cancelar");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`rounded-lg border ${corBorda} p-3 text-sm`}>
      <div className="flex items-start gap-2">
        {draft.status === "confirmado" ? (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : draft.status === "cancelado" ? (
          <XCircle size={18} className="mt-0.5 shrink-0 text-slate-400" />
        ) : isDespesa ? (
          <ArrowDownCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
        ) : (
          <ArrowUpCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {draft.status === "confirmado"
              ? "Lançamento criado"
              : draft.status === "cancelado"
              ? "Cancelado"
              : "Confirmar lançamento"}
          </div>
          <div className="mt-0.5 break-words text-slate-800">{draft.resumo}</div>
          {erro && <div className="mt-1 text-xs text-danger">{erro}</div>}
          {draft.status === "cancelado" && draft.erro && (
            <div className="mt-1 text-xs text-slate-500">{draft.erro}</div>
          )}
        </div>
      </div>

      {draft.status === "pendente" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleConfirmar}
            disabled={!!loading}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-60"
          >
            {loading === "confirmar" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirmar
          </button>
          <button
            onClick={handleCancelar}
            disabled={!!loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading === "cancelar" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
