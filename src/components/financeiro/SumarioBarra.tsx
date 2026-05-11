"use client";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface Props {
  count: number;
  totalSaidas: number;
  totalEntradas: number;
  saldo: number;
}

export function SumarioBarra({ count, totalSaidas, totalEntradas, saldo }: Props) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
      <div className="flex items-center gap-2 sm:flex-col sm:items-start">
        <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center sm:hidden">
          <Wallet size={14} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
            Itens
          </div>
          <div className="text-sm font-bold">{count}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-start">
        <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center sm:hidden">
          <TrendingUp size={14} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-medium">
            Entradas
          </div>
          <div className="text-sm font-mono font-semibold text-emerald-600">
            {formatBRL(totalEntradas)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-start">
        <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center sm:hidden">
          <TrendingDown size={14} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-rose-600 font-medium">
            Saídas
          </div>
          <div className="text-sm font-mono font-semibold text-rose-600">
            {formatBRL(totalSaidas)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-start">
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center sm:hidden ${
            saldo >= 0 ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-600"
          }`}
        >
          <Wallet size={14} />
        </div>
        <div>
          <div
            className={`text-[10px] uppercase tracking-wide font-medium ${
              saldo >= 0 ? "text-primary" : "text-amber-700"
            }`}
          >
            Saldo
          </div>
          <div
            className={`text-sm font-mono font-semibold ${
              saldo >= 0 ? "text-primary" : "text-amber-700"
            }`}
          >
            {formatBRL(saldo)}
          </div>
        </div>
      </div>
    </div>
  );
}
