"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatBRL } from "@/lib/formatters";
import { monthLabel } from "@/lib/monthUtils";

interface Props {
  data: { mes: string; despesas: number; receitas: number; saldo: number }[];
}

export function HistoryChart({ data }: Props) {
  const formatted = data.map((d) => ({ ...d, mesLabel: monthLabel(d.mes) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} barCategoryGap={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 100 / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: number) => formatBRL(v)}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
        />
        <Legend />
        <Bar dataKey="receitas" fill="#10B981" radius={[6, 6, 0, 0]} name="Receitas" />
        <Bar dataKey="despesas" fill="#F43F5E" radius={[6, 6, 0, 0]} name="Despesas" />
      </BarChart>
    </ResponsiveContainer>
  );
}
