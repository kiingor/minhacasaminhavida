"use client";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUp, PartyPopper } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

interface Item {
  categoriaId: string;
  nome: string;
  cor: string;
  icone?: string;
  realizado: number;
  limite: number;
  percentual: number;
}

interface Props {
  data?: Item[];
}

export function CategoriasEstouradas({ data }: Props) {
  if (!data) return null;

  if (data.length === 0) {
    return (
      <Card as="section" aria-labelledby="estouradas">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          <PartyPopper size={14} aria-hidden />
          <h2 id="estouradas">Categorias que estouraram</h2>
        </div>
        <p className="mt-2 text-sm text-ink-400">Nenhum estouro neste mês — parabéns!</p>
      </Card>
    );
  }

  return (
    <Card as="section" aria-labelledby="estouradas">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          <AlertTriangle size={14} aria-hidden />
          <h2 id="estouradas">Categorias que estouraram</h2>
        </div>
        <span className="text-xs text-ink-300">{data.length}</span>
      </div>
      <ul className="mt-3 divide-y divide-cream-200">
        {data.map((c, i) => {
          const Icon = iconeDaCategoria(c.icone);
          return (
            <motion.li
              key={c.categoriaId}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="py-2.5 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center shrink-0 text-ink-700">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate text-ink-900">{c.nome}</div>
                <div className="text-xs text-ink-400 font-mono">{formatBRL(c.realizado)} de {formatBRL(c.limite)}</div>
              </div>
              <Pill tone="dark">
                <ArrowUp size={11} />{c.percentual}%
              </Pill>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
