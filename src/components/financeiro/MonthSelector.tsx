"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftMonth, monthLabelLong } from "@/lib/monthUtils";

interface Props {
  mes: string;
  onChange: (mes: string) => void;
}

export function MonthSelector({ mes, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-white p-1">
      <button
        onClick={() => onChange(shiftMonth(mes, -1))}
        className="p-1 rounded hover:bg-slate-100"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="px-3 text-sm font-medium capitalize min-w-[120px] text-center">
        {monthLabelLong(mes)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(mes, 1))}
        className="p-1 rounded hover:bg-slate-100"
        aria-label="Próximo mês"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
