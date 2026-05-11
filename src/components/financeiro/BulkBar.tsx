"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, CheckCircle2, Trash2, X, Loader2 } from "lucide-react";

interface Props {
  selecaoCount: number;
  podeReclassificar: boolean;
  podeMarcarEfetivado: boolean;
  onReclassificar: () => void;
  onMarcarEfetivado: () => void;
  onExcluir: () => void;
  onCancelar: () => void;
  processando: boolean;
}

export function BulkBar({
  selecaoCount,
  podeReclassificar,
  podeMarcarEfetivado,
  onReclassificar,
  onMarcarEfetivado,
  onExcluir,
  onCancelar,
  processando,
}: Props) {
  return (
    <AnimatePresence>
      {selecaoCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none"
        >
          <div
            role="toolbar"
            aria-label="Ações em massa"
            className="pointer-events-auto max-w-3xl mx-auto rounded-2xl bg-white border shadow-xl p-3 flex flex-wrap items-center gap-2"
          >
            <div className="flex items-center gap-2 mr-auto">
              <button
                onClick={onCancelar}
                disabled={processando}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Cancelar seleção"
              >
                <X size={16} />
              </button>
              <span className="text-sm font-medium text-slate-700">
                <span className="font-bold text-primary">{selecaoCount}</span>{" "}
                {selecaoCount === 1 ? "selecionado" : "selecionados"}
              </span>
            </div>

            <button
              onClick={onMarcarEfetivado}
              disabled={!podeMarcarEfetivado || processando}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Marcar selecionados como efetivado"
            >
              {processando ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span className="hidden sm:inline">Efetivar</span>
              <span className="sm:hidden">OK</span>
            </button>

            <button
              onClick={onReclassificar}
              disabled={!podeReclassificar || processando}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-primary/30 text-primary text-xs sm:text-sm font-medium hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Reclassificar selecionados"
            >
              {processando ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
              <span className="hidden sm:inline">Reclassificar</span>
              <span className="sm:hidden">Categ.</span>
            </button>

            <button
              onClick={onExcluir}
              disabled={processando}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-danger text-white text-xs sm:text-sm font-medium hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Excluir selecionados"
            >
              {processando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Excluir
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
