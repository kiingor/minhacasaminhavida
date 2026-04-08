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
    return <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Sem dados</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" barCategoryGap={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={70} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
          formatter={(v: number) => [`${v} tarefas`]}
        />
        <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.cor} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
