"use client";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface Props {
  titulo: string;
  /** Quando true, secao comeca aberta. Default: false. */
  defaultAberto?: boolean;
  /** Quando true, comportamento colapsavel so aplica em mobile; em md+ sempre visivel. */
  mobileOnly?: boolean;
  /** Label opcional para mostrar quantos itens estao escondidos. */
  contador?: number;
  children: ReactNode;
}

/**
 * Wrapper generico para secoes colapsaveis. Usa um botao ghost com ChevronDown
 * rotacionado e AnimatePresence para transicao suave de altura.
 *
 * Padroes:
 * - Sem `mobileOnly`: collapse em todos os breakpoints
 * - Com `mobileOnly`: collapse so em mobile; em md+ a secao fica sempre visivel
 *   e o toggle some
 */
export function SecaoColapsavel({
  titulo,
  defaultAberto = false,
  mobileOnly = false,
  contador,
  children,
}: Props) {
  const [aberto, setAberto] = useState(defaultAberto);

  if (mobileOnly) {
    return (
      <div>
        {/* Mobile: toggle */}
        <div className="md:hidden">
          <ToggleHeader
            titulo={titulo}
            contador={contador}
            aberto={aberto}
            onClick={() => setAberto((v) => !v)}
          />
          <AnimatePresence initial={false}>
            {aberto && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3">{children}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Desktop: sempre visivel, sem toggle */}
        <div className="hidden md:block">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <ToggleHeader
        titulo={titulo}
        contador={contador}
        aberto={aberto}
        onClick={() => setAberto((v) => !v)}
      />
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleHeader({
  titulo,
  contador,
  aberto,
  onClick,
}: {
  titulo: string;
  contador?: number;
  aberto: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
    >
      <span className="flex items-center gap-2">
        {titulo}
        {typeof contador === "number" && contador > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
            {contador}
          </span>
        )}
      </span>
      <ChevronDown
        size={16}
        className={`text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`}
      />
    </button>
  );
}
