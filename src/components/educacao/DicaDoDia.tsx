"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";
import { dicaDoDia, type Dica } from "@/lib/educacao/dicas";

interface DicaDoDiaProps {
  className?: string;
  /** Quando true, renderiza variante compacta (banner horizontal, line-clamp-2). */
  compact?: boolean;
}

/**
 * Card pequeno com a "dica do dia" — rotativa, deterministica pela data.
 *
 * Renderiza vazio no SSR e popula no cliente para evitar mismatch
 * (datas no servidor podem diferir do cliente em fuso/horario).
 *
 * `compact`: banner horizontal min-h-[72px] com line-clamp-2, indicado para
 * rodape de paginas onde a dica nao e o foco principal.
 */
export function DicaDoDia({ className = "", compact = false }: DicaDoDiaProps) {
  const [dica, setDica] = React.useState<Dica | null>(null);

  React.useEffect(() => {
    setDica(dicaDoDia(new Date()));
  }, []);

  if (!dica) {
    // Placeholder com mesma altura aproximada — evita CLS.
    return (
      <div
        className={`rounded-2xl bg-amber-50/50 border border-amber-100 p-4 ${
          compact ? "min-h-[72px]" : "min-h-[112px]"
        } ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 px-4 py-3 min-h-[72px] ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Lightbulb size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                Dica do dia
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-snug line-clamp-2">
              {dica.texto}
            </p>
          </div>
          <Link
            href={dica.saibaMais ?? "/aprender"}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-700 hover:text-amber-800 shrink-0"
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <Lightbulb size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-0.5">
            Dica do dia
          </div>
          <p className="text-sm text-slate-700 leading-snug">{dica.texto}</p>

          <div className="flex items-center justify-between gap-2 mt-2.5">
            <span className="text-[10px] text-slate-400">Nova dica amanha</span>
            {dica.saibaMais ? (
              <Link
                href={dica.saibaMais}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Saiba mais <ArrowRight size={12} />
              </Link>
            ) : (
              <Link
                href="/aprender"
                className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Aprender mais <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
