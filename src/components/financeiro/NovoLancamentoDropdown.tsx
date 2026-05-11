"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  ChevronDown,
} from "lucide-react";

type Tipo = "despesa" | "receita" | "transferencia";

interface Props {
  onSelecionar: (tipo: Tipo) => void;
}

const OPCOES: Array<{
  tipo: Tipo;
  label: string;
  descricao: string;
  cor: string;
  Icon: typeof ArrowDownCircle;
}> = [
  {
    tipo: "despesa",
    label: "Despesa",
    descricao: "Saída de dinheiro",
    cor: "text-rose-600 bg-rose-100",
    Icon: ArrowDownCircle,
  },
  {
    tipo: "receita",
    label: "Receita",
    descricao: "Entrada de dinheiro",
    cor: "text-emerald-600 bg-emerald-100",
    Icon: ArrowUpCircle,
  },
  {
    tipo: "transferencia",
    label: "Transferência",
    descricao: "Movimentação entre contas",
    cor: "text-violet-600 bg-violet-100",
    Icon: ArrowLeftRight,
  },
];

export function NovoLancamentoDropdown({ onSelecionar }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
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
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        aria-label="Novo lançamento"
        aria-expanded={aberto}
        aria-haspopup="menu"
      >
        <Plus size={16} />
        <span>Novo</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-xl overflow-hidden z-30 max-md:bottom-full max-md:top-auto max-md:mt-0 max-md:mb-2"
          >
            {OPCOES.map((o) => (
              <button
                key={o.tipo}
                role="menuitem"
                onClick={() => selecionar(o.tipo)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${o.cor}`}>
                  <o.Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{o.label}</div>
                  <div className="text-[11px] text-slate-500">{o.descricao}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
