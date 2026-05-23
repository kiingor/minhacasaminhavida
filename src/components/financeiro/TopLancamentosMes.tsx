"use client";
import { motion } from "framer-motion";
import { Trophy, Receipt, Check, Clock } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";

export interface TopLancamento {
  despesaId: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  pago: boolean;
  categoriaId: string;
  categoriaNome: string;
  categoriaCor: string;
  categoriaIcone?: string;
  pessoaId?: string;
  pessoaNome?: string;
  pessoaCor?: string;
}

interface Props {
  itens: TopLancamento[];
  titulo?: string;
}

export function TopLancamentosMes({ itens, titulo = "Top 5 maiores lançamentos do mês" }: Props) {
  if (itens.length === 0) {
    return (
      <div className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-amber-500" />
          <h3 className="font-display font-bold text-base">{titulo}</h3>
        </div>
        <div className="text-center text-sm text-slate-400 py-6">
          <Receipt size={28} className="mx-auto mb-2 opacity-40" />
          <p>Sem lançamentos neste mês.</p>
        </div>
      </div>
    );
  }

  const maior = itens[0]?.valor ?? 0;

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div className="p-4 border-b flex items-center gap-2">
        <Trophy size={18} className="text-amber-500" />
        <h3 className="font-display font-bold text-base">{titulo}</h3>
      </div>
      <ul className="divide-y">
        {itens.map((it, i) => {
          const pct = maior > 0 ? Math.round((it.valor / maior) * 100) : 0;
          return (
            <motion.li
              key={it.despesaId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-3 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: `${it.categoriaCor}20`,
                    color: it.categoriaCor,
                  }}
                  aria-hidden
                >
                  <span className="font-display">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{it.descricao}</span>
                    <span className="font-mono font-bold text-danger text-sm shrink-0">
                      {formatBRL(it.valor)}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: it.categoriaCor }}
                      />
                      {it.categoriaNome}
                    </span>
                    {it.pessoaNome && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: it.pessoaCor ?? "#94A3B8" }}
                        />
                        {it.pessoaNome}
                      </span>
                    )}
                    <span>{formatDate(it.dataVencimento)}</span>
                    {it.pago ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600">
                        <Check size={11} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-600">
                        <Clock size={11} /> A pagar
                      </span>
                    )}
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: it.categoriaCor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                    />
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
