"use client";
import { CreditCard } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface Props {
  data?: { cartao: number; aVista: number };
}

export function CartaoVsAVistaChart({ data }: Props) {
  if (!data) return null;
  const total = data.cartao + data.aVista;
  if (total === 0) {
    return (
      <section aria-labelledby="cartao-vista" className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <CreditCard size={14} className="text-purple-600" aria-hidden />
          <h2 id="cartao-vista">Cartão vs À vista</h2>
        </div>
        <div className="mt-3 text-sm text-slate-400">Nenhuma despesa este mês</div>
      </section>
    );
  }
  const pctCartao = Math.round((data.cartao / total) * 100);
  const pctVista = 100 - pctCartao;

  return (
    <section aria-labelledby="cartao-vista" className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
        <CreditCard size={14} className="text-purple-600" aria-hidden />
        <h2 id="cartao-vista">Cartão vs À vista</h2>
      </div>

      <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-slate-100" role="img" aria-label={`${pctCartao}% cartão, ${pctVista}% à vista`}>
        {data.cartao > 0 && <div className="bg-purple-500" style={{ width: `${pctCartao}%` }} />}
        {data.aVista > 0 && <div className="bg-emerald-500" style={{ width: `${pctVista}%` }} />}
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Cartão</span>
          <span className="font-mono text-slate-700">{formatBRL(data.cartao)} · {pctCartao}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> À vista</span>
          <span className="font-mono text-slate-700">{formatBRL(data.aVista)} · {pctVista}%</span>
        </div>
      </div>
    </section>
  );
}
