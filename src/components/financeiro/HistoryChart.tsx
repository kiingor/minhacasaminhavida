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
      <BarChart data={formatted} barCategoryGap={16}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDE7DE" vertical={false} />
        <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8A8A8A" }} tickFormatter={(v) => `${(v / 100 / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => formatBRL(v)}
          contentStyle={{ borderRadius: 16, border: "1px solid #EDE7DE", boxShadow: "0 4px 16px rgba(15,15,15,0.06)" }}
          cursor={{ fill: "#FBF8F4" }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#5C5C5C" }} />
        <Bar dataKey="receitas" fill="#FF6B47" radius={[8, 8, 0, 0]} name="Receitas" />
        <Bar dataKey="despesas" fill="#1A1A1A" radius={[8, 8, 0, 0]} name="Despesas" />
      </BarChart>
    </ResponsiveContainer>
  );
}
