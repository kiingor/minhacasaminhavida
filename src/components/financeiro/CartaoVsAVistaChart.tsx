"use client";
import { CreditCard } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Card } from "@/components/ui/card";

interface Props {
  data?: { cartao: number; aVista: number };
}

export function CartaoVsAVistaChart({ data }: Props) {
  if (!data) return null;
  const total = data.cartao + data.aVista;
  if (total === 0) {
    return (
      <Card as="section" aria-labelledby="cartao-vista">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          <CreditCard size={14} aria-hidden />
          <h2 id="cartao-vista">Cartão vs À vista</h2>
        </div>
        <div className="mt-3 text-sm text-ink-400">Nenhuma despesa este mês</div>
      </Card>
    );
  }
  const pctCartao = Math.round((data.cartao / total) * 100);
  const pctVista = 100 - pctCartao;

  return (
    <Card as="section" aria-labelledby="cartao-vista">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
        <CreditCard size={14} aria-hidden />
        <h2 id="cartao-vista">Cartão vs À vista</h2>
      </div>

      <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-cream-200" role="img" aria-label={`${pctCartao}% cartão, ${pctVista}% à vista`}>
        {data.cartao > 0 && <div className="bg-ink-900" style={{ width: `${pctCartao}%` }} />}
        {data.aVista > 0 && <div className="bg-coral-500" style={{ width: `${pctVista}%` }} />}
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-ink-700"><span className="w-2.5 h-2.5 rounded-full bg-ink-900" /> Cartão</span>
          <span className="font-mono text-ink-500">{formatBRL(data.cartao)} · {pctCartao}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-ink-700"><span className="w-2.5 h-2.5 rounded-full bg-coral-500" /> À vista</span>
          <span className="font-mono text-ink-500">{formatBRL(data.aVista)} · {pctVista}%</span>
        </div>
      </div>
    </Card>
  );
}
