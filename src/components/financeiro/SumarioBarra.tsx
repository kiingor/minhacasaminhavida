"use client";
import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  totalSaidas: number;
  totalEntradas: number;
  saldo: number;
}

/**
 * Card de resumo dos lançamentos filtrados.
 * Layout: card unificado em 3 partes hierárquicas:
 *   - Esquerda: Saldo (grande, destaque)
 *   - Centro: Entradas + Saídas empilhadas
 *   - Direita: Contagem total
 */
export function SumarioBarra({ count, totalSaidas, totalEntradas, saldo }: Props) {
  const saldoNeg = saldo < 0;
  const saldoSinal = saldoNeg ? "-" : "+";

  return (
    <div className="rounded-3xl bg-white shadow-soft p-5 flex flex-col md:flex-row md:items-center gap-5">
      {/* Saldo — destaque */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          Saldo do período
        </div>
        <div className={cn(
          "font-display font-extrabold text-3xl md:text-4xl mt-1 leading-none font-mono tabular-nums",
          saldoNeg ? "text-coral-600" : "text-ink-900",
        )}>
          {saldoSinal}{formatBRL(Math.abs(saldo))}
        </div>
        <div className="text-[11px] text-ink-400 mt-1.5">
          {count === 0 ? "Nenhum lançamento" : count === 1 ? "1 lançamento" : `${count} lançamentos`}
        </div>
      </div>

      <div className="hidden md:block h-16 w-px bg-cream-200 shrink-0" />
      <div className="md:hidden h-px w-full bg-cream-200" />

      {/* Entradas + Saídas */}
      <div className="flex md:flex-col gap-4 md:gap-3 md:shrink-0 md:min-w-[180px]">
        <DetalheLinha
          icon={ArrowUpRight}
          label="Entradas"
          valor={`+${formatBRL(totalEntradas)}`}
        />
        <DetalheLinha
          icon={ArrowDownRight}
          label="Saídas"
          valor={`-${formatBRL(totalSaidas)}`}
        />
      </div>
    </div>
  );
}

function DetalheLinha({
  icon: Icon, label, valor,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-8 h-8 rounded-full bg-cream-100 text-ink-700 inline-flex items-center justify-center shrink-0">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">{label}</div>
        <div className="font-mono font-bold text-sm text-ink-900 tabular-nums truncate">{valor}</div>
      </div>
    </div>
  );
}
