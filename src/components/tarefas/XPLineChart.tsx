"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface PessoaXp {
  id: string;
  nome: string;
  cor: string;
  xpPorDia: { dia: string; xp: number }[];
}

interface Props {
  dias: string[];
  pessoasXp: PessoaXp[];
}

function diaLabel(iso: string): string {
  const [, , d] = iso.split("-");
  const dow = new Date(iso).toLocaleDateString("pt-BR", { weekday: "short" });
  return `${dow.slice(0, 3)} ${d}`;
}

export function XPLineChart({ dias, pessoasXp }: Props) {
  const data = dias.map((dia) => {
    const row: Record<string, string | number> = { dia: diaLabel(dia) };
    pessoasXp.forEach((p) => {
      row[p.nome] = p.xpPorDia.find((x) => x.dia === dia)?.xp ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDE7DE" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 16, border: "1px solid #EDE7DE", boxShadow: "0 4px 16px rgba(15,15,15,0.06)" }}
          formatter={(v: number) => [`${v} XP`]}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#5C5C5C" }} />
        {pessoasXp.map((p) => (
          <Line
            key={p.id}
            type="monotone"
            dataKey={p.nome}
            stroke={p.cor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: p.cor, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
