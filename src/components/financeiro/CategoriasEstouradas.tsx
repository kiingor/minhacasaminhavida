"use client";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUp, PartyPopper } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";

interface Item {
  categoriaId: string;
  nome: string;
  cor: string;
  icone?: string;
  valorAtual: number;
  valorAnterior: number;
  variacao: number;
}

interface Props {
  data?: Item[];
}

export function CategoriasEstouradas({ data }: Props) {
  if (!data) return null;

  if (data.length === 0) {
    return (
      <section aria-labelledby="estouradas" className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <PartyPopper size={14} className="text-emerald-500" aria-hidden />
          <h2 id="estouradas">Categorias que estouraram</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">Nenhum estouro neste mês — parabéns!</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="estouradas" className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <AlertTriangle size={14} className="text-amber-500" aria-hidden />
          <h2 id="estouradas">Categorias que estouraram</h2>
        </div>
        <span className="text-xs text-slate-400">{data.length}</span>
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.cor}20`, color: c.cor }}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.nome}</div>
                <div className="text-xs text-slate-500 font-mono">{formatBRL(c.valorAtual)} · era {formatBRL(c.valorAnterior)}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold flex items-center gap-0.5">
                <ArrowUp size={11} />+{c.variacao}%
              </span>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
