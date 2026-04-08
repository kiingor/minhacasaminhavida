"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatBRL } from "@/lib/formatters";

interface Props {
  data: { label: string; valor: number; cor: string }[];
}

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Sem dados</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={55}
          paddingAngle={2}
        >
          {data.map((d, i) => <Cell key={i} fill={d.cor} />)}
        </Pie>
        <Tooltip
          formatter={(v: number) => formatBRL(v)}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
