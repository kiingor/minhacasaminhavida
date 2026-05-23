"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatBRL } from "@/lib/formatters";

interface Props {
  data: { label: string; valor: number; cor: string }[];
}

const PALETTE = ["#FF6B47", "#F0512C", "#FFA88B", "#1A1A1A", "#5C5C5C", "#FFCBB7", "#8A8A8A", "#262626"];

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-ink-300 text-sm">Sem dados</div>;
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
          outerRadius={92}
          innerRadius={62}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip
          formatter={(v: number) => formatBRL(v)}
          contentStyle={{ borderRadius: 16, border: "1px solid #EDE7DE", boxShadow: "0 4px 16px rgba(15,15,15,0.06)", background: "#FFFFFF" }}
          labelStyle={{ color: "#0F0F0F", fontWeight: 600 }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: "#5C5C5C" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
