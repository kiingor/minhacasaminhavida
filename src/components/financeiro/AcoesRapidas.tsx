"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import { DespesaForm } from "./DespesaForm";
import { ReceitaForm } from "./ReceitaForm";
import { TransferenciaForm } from "./TransferenciaForm";

type FormAberto = "despesa" | "receita" | "transferencia" | null;

export function AcoesRapidas() {
  const [aberto, setAberto] = useState<FormAberto>(null);
  const [maisAberto, setMaisAberto] = useState(false);
  const maisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!maisAberto) return;
    const onClick = (e: MouseEvent) => {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) setMaisAberto(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMaisAberto(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [maisAberto]);

  function abrir(tipo: Exclude<FormAberto, null>) {
    setMaisAberto(false);
    setAberto(tipo);
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <BotaoAcao label="Nova despesa" Icon={ArrowDownCircle} onClick={() => abrir("despesa")} />
        <BotaoAcao label="Nova receita" Icon={ArrowUpCircle}   onClick={() => abrir("receita")} />
        <BotaoAcao label="Transferência" Icon={ArrowLeftRight} onClick={() => abrir("transferencia")} />
        <div className="relative" ref={maisRef}>
          <button
            type="button"
            onClick={() => setMaisAberto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={maisAberto}
            className="w-full inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-cream-200 bg-white text-sm font-medium text-ink-700 hover:bg-cream-50 transition-colors"
          >
            <MoreHorizontal size={16} className="text-ink-500" />
            <span>Mais</span>
            <ChevronDown size={12} className={`text-ink-400 transition-transform ${maisAberto ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {maisAberto && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden z-30 max-md:bottom-full max-md:top-auto max-md:mt-0 max-md:mb-2"
              >
                <ItemMenu Icon={ArrowDownCircle} label="Despesa"      descricao="Saída de dinheiro"  onClick={() => abrir("despesa")} />
                <ItemMenu Icon={ArrowUpCircle}   label="Receita"      descricao="Entrada de dinheiro" onClick={() => abrir("receita")} />
                <ItemMenu Icon={ArrowLeftRight}  label="Transferência" descricao="Entre contas"      onClick={() => abrir("transferencia")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {aberto === "despesa" && <DespesaForm onClose={() => setAberto(null)} />}
      {aberto === "receita" && <ReceitaForm onClose={() => setAberto(null)} />}
      {aberto === "transferencia" && <TransferenciaForm onClose={() => setAberto(null)} />}
    </>
  );
}

function BotaoAcao({ label, Icon, onClick }: { label: string; Icon: typeof ArrowDownCircle; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border border-cream-200 bg-white text-sm font-medium text-ink-700 hover:bg-cream-50 hover:border-coral-300 transition-colors"
    >
      <Icon size={16} className="text-ink-700 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ItemMenu({ Icon, label, descricao, onClick }: { Icon: typeof ArrowDownCircle; label: string; descricao: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 text-left transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-cream-100 text-ink-700 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        <div className="text-[11px] text-ink-400">{descricao}</div>
      </div>
    </button>
  );
}
