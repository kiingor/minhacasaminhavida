"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarX, Trash2, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type EscopoExclusao = "mes" | "todos";

interface ExcluirLancamentoDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (escopo: EscopoExclusao) => Promise<void> | void;
  /** Tipo do lançamento (despesa/receita/transferencia) */
  tipo: "despesa" | "receita" | "transferencia";
  /** Tipo original (fixa/parcelada/avulsa) — só faz sentido pra despesa/receita */
  tipoOriginal?: "fixa" | "parcelada" | "avulsa";
  /** Mês corrente em formato 'MMM/AAAA' (ex: 'Mai/2026') */
  mesLabel: string;
  /** Descrição curta para identificar o lançamento */
  descricao?: string;
}

export function ExcluirLancamentoDialog({
  open,
  onClose,
  onConfirm,
  tipo,
  tipoOriginal,
  mesLabel,
  descricao,
}: ExcluirLancamentoDialogProps) {
  const [processando, setProcessando] = useState<EscopoExclusao | null>(null);

  // Avulsa ou transferência só tem 1 mês — pula a pergunta
  const ehUnicoMes = tipo === "transferencia" || tipoOriginal === "avulsa";

  async function executar(escopo: EscopoExclusao) {
    setProcessando(escopo);
    try {
      await onConfirm(escopo);
      onClose();
    } finally {
      setProcessando(null);
    }
  }

  const labelTipo =
    tipo === "despesa" ? "despesa" :
    tipo === "receita" ? "receita" :
    "transferência";

  return (
    <Dialog open={open} onClose={onClose} title={`Excluir ${labelTipo}`}>
      <div className="space-y-4">
        {descricao && (
          <div className="rounded-2xl bg-cream-100 px-4 py-3 text-sm">
            <span className="text-ink-500">Lançamento: </span>
            <span className="font-medium text-ink-900">{descricao}</span>
          </div>
        )}

        {ehUnicoMes ? (
          <>
            <div className="flex items-start gap-3 text-sm text-ink-600">
              <AlertTriangle size={18} className="text-coral-500 mt-0.5 shrink-0" />
              <p>Essa ação não pode ser desfeita.</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose} disabled={!!processando}>
                Cancelar
              </Button>
              <Button variant="dark" onClick={() => executar("todos")} disabled={!!processando}>
                {processando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Excluir
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 text-sm text-ink-600">
              <AlertTriangle size={18} className="text-coral-500 mt-0.5 shrink-0" />
              <p>
                Essa {labelTipo} é <b>{tipoOriginal === "parcelada" ? "parcelada" : "recorrente"}</b> —
                ela aparece em <b>vários meses</b>. Escolha o escopo da exclusão.
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                disabled={!!processando}
                onClick={() => executar("mes")}
                className="w-full text-left rounded-2xl border border-cream-300 bg-white hover:border-coral-300 hover:bg-cream-50 transition-colors p-3 flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center shrink-0">
                  {processando === "mes" ? <Loader2 size={16} className="animate-spin" /> : <CalendarX size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900">Ocultar só em {mesLabel}</div>
                  <div className="text-xs text-ink-500">
                    Mantém em todos os outros meses · pode ser desfeito
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={!!processando}
                onClick={() => executar("todos")}
                className="w-full text-left rounded-2xl border-2 border-ink-900 bg-ink-900/5 hover:bg-ink-900/10 transition-colors p-3 flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0">
                  {processando === "todos" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900 inline-flex items-center gap-1.5">
                    Apagar de todos os meses
                    <AlertTriangle size={12} className="text-coral-600" />
                  </div>
                  <div className="text-xs text-ink-600">
                    Remove a {labelTipo} <b>por completo</b> — some de todos os meses
                    {tipoOriginal === "parcelada" ? " (todas as parcelas)" : " (passados e futuros)"}
                  </div>
                </div>
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={onClose} disabled={!!processando}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
