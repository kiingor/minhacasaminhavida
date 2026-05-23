"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftMonth, monthLabelLong } from "@/lib/monthUtils";

interface Props {
  mes: string;
  onChange: (mes: string) => void;
}

export function MonthSelector({ mes, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white border border-cream-200 shadow-soft p-1">
      <button
        onClick={() => onChange(shiftMonth(mes, -1))}
        className="w-9 h-9 rounded-full hover:bg-cream-100 text-ink-500 flex items-center justify-center transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="px-3 text-sm font-semibold capitalize min-w-[130px] text-center text-ink-900">
        {monthLabelLong(mes)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(mes, 1))}
        className="w-9 h-9 rounded-full hover:bg-cream-100 text-ink-500 flex items-center justify-center transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
