"use client";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { formatBRL } from "@/lib/formatters";
import { monthLabel } from "@/lib/monthUtils";

interface Props {
  data: { mes: string; saldoTotal: number; dividasAtivas: number }[];
}

export function CurvaQuitacaoChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
        Sem dividas ativas para projetar
      </div>
    );
  }
  const formatted = data.map((d) => ({ ...d, mesLabel: monthLabel(d.mes) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="curvaSaldoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="mesLabel"
          tick={{ fontSize: 11 }}
          interval={Math.max(0, Math.floor(formatted.length / 8))}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `R$${(v / 100 / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v: number, name) => {
            if (name === "Saldo devedor") return [formatBRL(v), name];
            return [v, name];
          }}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
          labelClassName="text-xs"
        />
        <Area
          type="monotone"
          dataKey="saldoTotal"
          name="Saldo devedor"
          stroke="#F43F5E"
          strokeWidth={2}
          fill="url(#curvaSaldoFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
