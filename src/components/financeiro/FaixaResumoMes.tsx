"use client";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface Resumo {
  aReceber: number;
  aPagar: number;
  economia: number;
}

interface Props {
  data: Resumo | undefined;
}

/**
 * Faixa numerica inline com 3 valores chave do mes: A Receber, A Pagar, Economia.
 * Sem cards individuais — apenas labels uppercase e valores em font-mono.
 * Posicionado logo abaixo do Hero (SaldoEfetivadoProjetadoCard).
 */
export function FaixaResumoMes({ data }: Props) {
  if (!data) {
    return <Skeleton className="h-12 rounded-xl" />;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 sm:gap-6">
      <Item
        label="A Receber"
        valor={data.aReceber}
        cor="text-emerald-600"
        Icon={TrendingUp}
      />
      <Item
        label="A Pagar"
        valor={data.aPagar}
        cor="text-rose-600"
        Icon={TrendingDown}
      />
      <Item
        label="Economia"
        valor={data.economia}
        cor={data.economia >= 0 ? "text-indigo-600" : "text-rose-600"}
        Icon={PiggyBank}
      />
    </div>
  );
}

function Item({
  label,
  valor,
  cor,
  Icon,
}: {
  label: string;
  valor: number;
  cor: string;
  Icon: typeof TrendingUp;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={14} className={`${cor} shrink-0`} aria-hidden />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium leading-tight">
          {label}
        </span>
        <span className={`font-mono font-semibold text-sm truncate ${cor}`}>
          {formatBRL(valor)}
        </span>
      </div>
    </div>
  );
}
