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

export function FaixaResumoMes({ data }: Props) {
  if (!data) return <Skeleton className="h-12 rounded-2xl" />;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-3 py-2 sm:gap-8">
      <Item label="A Receber" valor={data.aReceber}  Icon={TrendingUp} />
      <Item label="A Pagar"   valor={data.aPagar}    Icon={TrendingDown} sign="-" />
      <Item label="Economia"  valor={data.economia}  Icon={PiggyBank}    sign={data.economia < 0 ? "-" : "+"} />
    </div>
  );
}

function Item({
  label, valor, Icon, sign,
}: {
  label: string;
  valor: number;
  Icon: typeof TrendingUp;
  sign?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 w-7 h-7 rounded-full bg-cream-100 text-ink-700 inline-flex items-center justify-center">
        <Icon size={13} aria-hidden />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold leading-tight">{label}</span>
        <span className="font-mono font-bold text-sm truncate text-ink-900">
          {sign ?? ""}{formatBRL(Math.abs(valor))}
        </span>
      </div>
    </div>
  );
}
