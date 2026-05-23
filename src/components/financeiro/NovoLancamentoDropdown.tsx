"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ArrowDownRight, ArrowUpRight, ArrowLeftRight, ChevronDown,
} from "lucide-react";

type Tipo = "despesa" | "receita" | "transferencia";

interface Props {
  onSelecionar: (tipo: Tipo) => void;
}

const OPCOES: Array<{
  tipo: Tipo;
  label: string;
  descricao: string;
  Icon: typeof ArrowDownRight;
}> = [
  { tipo: "despesa",       label: "Despesa",       descricao: "Saída de dinheiro",         Icon: ArrowDownRight },
  { tipo: "receita",       label: "Receita",       descricao: "Entrada de dinheiro",       Icon: ArrowUpRight },
  { tipo: "transferencia", label: "Transferência", descricao: "Movimentação entre contas", Icon: ArrowLeftRight },
];

export function NovoLancamentoDropdown({ onSelecionar }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  function selecionar(tipo: Tipo) {
    setAberto(false);
    onSelecionar(tipo);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-coral-500 text-white text-sm font-semibold hover:bg-coral-600 shadow-pop transition-all"
        aria-label="Novo lançamento"
        aria-expanded={aberto}
        aria-haspopup="menu"
      >
        <Plus size={16} />
        <span>Novo</span>
        <ChevronDown size={13} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden z-30 max-md:bottom-full max-md:top-auto max-md:mt-0 max-md:mb-2"
          >
            {OPCOES.map((o) => (
              <button
                key={o.tipo}
                role="menuitem"
                onClick={() => selecionar(o.tipo)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-cream-100 text-ink-700 flex items-center justify-center shrink-0">
                  <o.Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900">{o.label}</div>
                  <div className="text-[11px] text-ink-400">{o.descricao}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
