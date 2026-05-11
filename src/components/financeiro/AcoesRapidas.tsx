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

/**
 * 4 botoes outline para as acoes mais usadas:
 * - Nova despesa, Nova receita, Transferencia: abrem os respectivos forms
 * - Mais: dropdown com opcoes adicionais (atalhos pra outros lancamentos no futuro)
 */
export function AcoesRapidas() {
  const [aberto, setAberto] = useState<FormAberto>(null);
  const [maisAberto, setMaisAberto] = useState(false);
  const maisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!maisAberto) return;
    const onClick = (e: MouseEvent) => {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) {
        setMaisAberto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaisAberto(false);
    };
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
        <BotaoAcao
          label="Nova despesa"
          Icon={ArrowDownCircle}
          cor="text-rose-600"
          onClick={() => abrir("despesa")}
        />
        <BotaoAcao
          label="Nova receita"
          Icon={ArrowUpCircle}
          cor="text-emerald-600"
          onClick={() => abrir("receita")}
        />
        <BotaoAcao
          label="Transferência"
          Icon={ArrowLeftRight}
          cor="text-violet-600"
          onClick={() => abrir("transferencia")}
        />
        <div className="relative" ref={maisRef}>
          <button
            type="button"
            onClick={() => setMaisAberto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={maisAberto}
            className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <MoreHorizontal size={16} className="text-slate-500" />
            <span>Mais</span>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform ${
                maisAberto ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {maisAberto && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-xl overflow-hidden z-30 max-md:bottom-full max-md:top-auto max-md:mt-0 max-md:mb-2"
              >
                <ItemMenu
                  Icon={ArrowDownCircle}
                  cor="text-rose-600 bg-rose-100"
                  label="Despesa"
                  descricao="Saída de dinheiro"
                  onClick={() => abrir("despesa")}
                />
                <ItemMenu
                  Icon={ArrowUpCircle}
                  cor="text-emerald-600 bg-emerald-100"
                  label="Receita"
                  descricao="Entrada de dinheiro"
                  onClick={() => abrir("receita")}
                />
                <ItemMenu
                  Icon={ArrowLeftRight}
                  cor="text-violet-600 bg-violet-100"
                  label="Transferência"
                  descricao="Entre contas"
                  onClick={() => abrir("transferencia")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {aberto === "despesa" && <DespesaForm onClose={() => setAberto(null)} />}
      {aberto === "receita" && <ReceitaForm onClose={() => setAberto(null)} />}
      {aberto === "transferencia" && (
        <TransferenciaForm onClose={() => setAberto(null)} />
      )}
    </>
  );
}

function BotaoAcao({
  label,
  Icon,
  cor,
  onClick,
}: {
  label: string;
  Icon: typeof ArrowDownCircle;
  cor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <Icon size={16} className={`${cor} shrink-0`} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ItemMenu({
  Icon,
  cor,
  label,
  descricao,
  onClick,
}: {
  Icon: typeof ArrowDownCircle;
  cor: string;
  label: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-[11px] text-slate-500">{descricao}</div>
      </div>
    </button>
  );
}
