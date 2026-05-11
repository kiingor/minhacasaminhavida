"use client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

export interface CategoriaVariacaoItem {
  categoriaId: string;
  nome: string;
  cor: string;
  icone?: string;
  atual: number;
  anterior: number;
  variacao: number;
  percentual: number;
}

interface Props {
  itens: CategoriaVariacaoItem[];
  modo: "cresceram" | "diminuiram";
  mesLabel: string;
  mesAnteriorLabel: string;
}

export function CategoriasVariacaoChart({ itens, modo, mesLabel, mesAnteriorLabel }: Props) {
  const isCresceram = modo === "cresceram";
  const Icon = isCresceram ? TrendingUp : TrendingDown;
  const corPrincipal = isCresceram ? "#F43F5E" : "#10B981";
  const titulo = isCresceram ? "Mais cresceram" : "Mais diminuíram";

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={18} style={{ color: corPrincipal }} />
          <h3 className="font-display font-bold text-base">{titulo}</h3>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">
          Nenhum dado pra comparar.
        </p>
      </div>
    );
  }

  // Para escala visual: pega o maior valor absoluto da variacao do conjunto.
  const maxVar = Math.max(...itens.map((i) => Math.abs(i.variacao)), 1);

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={18} style={{ color: corPrincipal }} />
          <h3 className="font-display font-bold text-base">{titulo}</h3>
        </div>
        <p className="text-xs text-slate-500">
          {mesAnteriorLabel} → {mesLabel}
        </p>
      </div>
      <ul className="divide-y">
        {itens.map((it, i) => {
          const pct = (Math.abs(it.variacao) / maxVar) * 100;
          const ArrowIcon = isCresceram ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.li
              key={it.categoriaId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: `${it.cor}20`, color: it.cor }}
                  >
                    {it.nome.charAt(0)}
                  </div>
                  <span className="font-medium text-sm truncate">{it.nome}</span>
                </div>
                <span
                  className="inline-flex items-center gap-0.5 text-xs font-bold shrink-0"
                  style={{ color: corPrincipal }}
                >
                  <ArrowIcon size={12} />
                  {isCresceram ? "+" : ""}
                  {it.percentual}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: it.cor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {mesAnteriorLabel}:{" "}
                  <span className="font-mono">{formatBRL(it.anterior)}</span>
                </span>
                <span>
                  {mesLabel}:{" "}
                  <span className="font-mono font-semibold text-slate-700">
                    {formatBRL(it.atual)}
                  </span>
                </span>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
