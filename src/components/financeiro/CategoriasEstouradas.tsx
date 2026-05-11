"use client";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";
import { formatBRL } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";

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
      <section aria-labelledby="estouradas" className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
            <PartyPopper size={14} className="text-emerald-500" aria-hidden />
            <h2 id="estouradas">Categorias que estouraram o orçamento</h2>
          </div>
          <Link
            href="/financeiro/orcamento"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver orçamento <ArrowRight size={12} />
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Nenhuma categoria estourou o limite neste mês — parabéns!
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="estouradas" className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <AlertTriangle size={14} className="text-danger" aria-hidden />
          <h2 id="estouradas">Categorias que estouraram o orçamento</h2>
          <span className="text-xs text-slate-400 normal-case font-normal">({data.length})</span>
        </div>
        <Link
          href="/financeiro/orcamento"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver orçamento <ArrowRight size={12} />
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {data.map((c, i) => {
          const Icon = iconeDaCategoria(c.icone);
          const excedido = c.realizado - c.limite;
          return (
            <motion.li
              key={c.categoriaId}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="py-2.5 flex items-center gap-3"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${c.cor}20`, color: c.cor }}
              >
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.nome}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatBRL(c.realizado)} / {formatBRL(c.limite)}
                  {excedido > 0 && (
                    <span className="text-danger"> · +{formatBRL(excedido)}</span>
                  )}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                {c.percentual}%
              </span>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
