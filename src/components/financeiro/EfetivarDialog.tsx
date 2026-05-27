"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Check, Wallet, Ban, Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";
import { getIconeConta } from "@/components/financeiro/ContaForm";

interface EfetivarDialogProps {
  open: boolean;
  onClose: () => void;
  /** Callback com contaId selecionada (ou null para "sem conta"). Processando = true => spinner no botão. */
  onConfirm: (contaId: Id<"contas"> | null) => Promise<void> | void;
  /** Quantidade de lançamentos sendo efetivados (1 = single, >1 = bulk). */
  quantidade: number;
  /** Valor total agregado (opcional). */
  valorTotal?: number;
  /** Tipo dominante: "despesa" | "receita" | "misto". Muda o copy. */
  tipo: "despesa" | "receita" | "misto";
  /** Conta sugerida (do cadastro). Vem preselecionada. */
  contaSugeridaId?: Id<"contas">;
}

export function EfetivarDialog({
  open,
  onClose,
  onConfirm,
  quantidade,
  valorTotal,
  tipo,
  contaSugeridaId,
}: EfetivarDialogProps) {
  const token = useSessionToken();
  const contas = useQuery(
    api.financeiro.contas.list,
    token && open ? { sessionToken: token } : "skip"
  );

  const ativas = useMemo(
    () => (contas ?? []).filter((c) => c.ativa),
    [contas]
  );

  const [selectedId, setSelectedId] = useState<Id<"contas"> | null | "_init">("_init");
  const [processando, setProcessando] = useState(false);

  // Inicializa seleção quando dialog abre OU quando as contas chegam
  useEffect(() => {
    if (!open) return;
    if (selectedId !== "_init") return;
    if (ativas.length === 0) {
      setSelectedId(null);
      return;
    }
    if (contaSugeridaId && ativas.some((c) => c._id === contaSugeridaId)) {
      setSelectedId(contaSugeridaId);
    } else {
      setSelectedId(ativas[0]._id);
    }
  }, [open, ativas, contaSugeridaId, selectedId]);

  // Reseta seleção quando fecha
  useEffect(() => {
    if (!open) {
      setSelectedId("_init");
      setProcessando(false);
    }
  }, [open]);

  async function handleConfirm() {
    if (selectedId === "_init") return;
    setProcessando(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } catch (err) {
      // erro fica visível no callsite — fechamos o dialog mesmo assim seria ruim
      setProcessando(false);
      console.error(err);
    }
  }

  const tituloPergunta =
    tipo === "receita"
      ? quantidade === 1
        ? "Em qual conta foi recebido?"
        : "Em qual conta foram recebidos?"
      : tipo === "despesa"
      ? quantidade === 1
        ? "De qual conta saiu o pagamento?"
        : "De qual conta saíram os pagamentos?"
      : "Qual conta foi usada?";

  const cta =
    tipo === "receita"
      ? quantidade === 1
        ? "Confirmar recebimento"
        : `Confirmar ${quantidade} recebimentos`
      : tipo === "despesa"
      ? quantidade === 1
        ? "Confirmar pagamento"
        : `Confirmar ${quantidade} pagamentos`
      : quantidade === 1
      ? "Confirmar efetivação"
      : `Confirmar ${quantidade} efetivações`;

  return (
    <Dialog open={open} onClose={onClose} title={tituloPergunta}>
      <div className="space-y-4">
        {/* Resumo */}
        <div className="rounded-2xl bg-cream-100 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-ink-600">
            {quantidade === 1 ? "1 lançamento" : `${quantidade} lançamentos`}
          </span>
          {typeof valorTotal === "number" && (
            <span className="font-mono font-bold text-ink-900">
              {formatBRL(valorTotal)}
            </span>
          )}
        </div>

        {/* Lista de contas */}
        {contas === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : ativas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-300 px-4 py-6 text-center">
            <Wallet size={32} className="mx-auto mb-2 text-ink-400" />
            <p className="text-sm text-ink-600">
              Nenhuma conta ativa cadastrada. Você pode confirmar sem vincular conta.
            </p>
          </div>
        ) : (
          <div className="max-h-[40vh] overflow-y-auto -mx-1 px-1 space-y-2">
            {ativas.map((c) => {
              const Icon = getIconeConta(c.icone);
              const selecionado = selectedId === c._id;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setSelectedId(c._id)}
                  className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                    selecionado
                      ? "border-coral-500 bg-coral-50 shadow-pop"
                      : "border-cream-300 bg-white hover:border-cream-400"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${c.cor}20`, color: c.cor }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink-900 truncate">{c.nome}</div>
                    {c.banco && (
                      <div className="text-xs text-ink-500 truncate">{c.banco}</div>
                    )}
                  </div>
                  {selecionado && (
                    <div className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Opção: sem conta vinculada */}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                selectedId === null
                  ? "border-ink-900 bg-ink-50 shadow-pop"
                  : "border-cream-300 bg-white hover:border-cream-400"
              }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-cream-200 text-ink-500">
                <Ban size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900">Sem conta vinculada</div>
                <div className="text-xs text-ink-500">
                  Não impacta saldo de nenhuma conta
                </div>
              </div>
              {selectedId === null && (
                <div className="w-6 h-6 rounded-full bg-ink-900 text-white flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedId === "_init" || processando}
          >
            {processando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {cta}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
