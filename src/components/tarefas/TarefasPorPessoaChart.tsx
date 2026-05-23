"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  data: { nome: string; valor: number; cor: string }[];
}

export function TarefasPorPessoaChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="h-[220px] flex items-center justify-center text-ink-300 text-sm">Sem dados</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" barCategoryGap={16}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDE7DE" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nome" tick={{ fontSize: 12, fill: "#262626", fontWeight: 600 }} width={80} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 16, border: "1px solid #EDE7DE", boxShadow: "0 4px 16px rgba(15,15,15,0.06)" }}
          formatter={(v: number) => [`${v} tarefas`]}
          cursor={{ fill: "#FBF8F4" }}
        />
        <Bar dataKey="valor" radius={[0, 10, 10, 0]} maxBarSize={28}>
          {data.map((d, i) => <Cell key={i} fill={d.cor} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
