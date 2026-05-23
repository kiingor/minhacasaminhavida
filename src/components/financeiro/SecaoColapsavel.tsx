"use client";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface Props {
  titulo: string;
  defaultAberto?: boolean;
  mobileOnly?: boolean;
  contador?: number;
  children: ReactNode;
}

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
        <div className="md:hidden">
          <ToggleHeader titulo={titulo} contador={contador} aberto={aberto} onClick={() => setAberto((v) => !v)} />
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
        <div className="hidden md:block">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <ToggleHeader titulo={titulo} contador={contador} aberto={aberto} onClick={() => setAberto((v) => !v)} />
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
  titulo, contador, aberto, onClick,
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
      className="w-full flex items-center justify-between gap-2 px-4 h-10 rounded-full text-sm font-medium text-ink-700 hover:bg-white border border-transparent hover:border-cream-200 transition-all"
    >
      <span className="flex items-center gap-2">
        {titulo}
        {typeof contador === "number" && contador > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral-100 text-coral-700 font-bold">
            {contador}
          </span>
        )}
      </span>
      <ChevronDown size={16} className={`text-ink-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
    </button>
  );
}
