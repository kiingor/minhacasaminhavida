"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, CheckCircle2, Trash2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  selecaoCount, podeReclassificar, podeMarcarEfetivado,
  onReclassificar, onMarcarEfetivado, onExcluir, onCancelar, processando,
}: Props) {
  return (
    <AnimatePresence>
      {selecaoCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-24 md:bottom-6 left-0 right-0 z-40 px-3 pointer-events-none"
        >
          <div
            role="toolbar"
            aria-label="Ações em massa"
            className="pointer-events-auto max-w-3xl mx-auto rounded-full bg-ink-900 text-white shadow-card p-1.5 pl-4 flex items-center gap-2"
          >
            <button
              onClick={onCancelar}
              disabled={processando}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
              aria-label="Cancelar seleção"
            >
              <X size={16} />
            </button>
            <span className="text-sm font-medium mr-auto">
              <span className="font-bold text-coral-400">{selecaoCount}</span>{" "}
              <span className="hidden sm:inline">{selecaoCount === 1 ? "selecionado" : "selecionados"}</span>
            </span>

            <BulkAction
              onClick={onMarcarEfetivado}
              disabled={!podeMarcarEfetivado || processando}
              processando={processando}
              icon={CheckCircle2}
              label="Efetivar"
              labelShort="OK"
            />

            <BulkAction
              onClick={onReclassificar}
              disabled={!podeReclassificar || processando}
              processando={processando}
              icon={Tag}
              label="Reclassificar"
              labelShort="Categ."
            />

            <BulkAction
              onClick={onExcluir}
              disabled={processando}
              processando={processando}
              icon={Trash2}
              label="Excluir"
              labelShort="Excluir"
              tone="coral"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BulkAction({
  onClick, disabled, processando, icon: Icon, label, labelShort, tone = "ghost",
}: {
  onClick: () => void;
  disabled: boolean;
  processando: boolean;
  icon: typeof CheckCircle2;
  label: string;
  labelShort: string;
  tone?: "ghost" | "coral";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
        tone === "coral"
          ? "bg-coral-500 hover:bg-coral-600 text-white"
          : "bg-white/10 hover:bg-white/20 text-white",
      )}
      aria-label={label}
    >
      {processando ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{labelShort}</span>
    </button>
  );
}
