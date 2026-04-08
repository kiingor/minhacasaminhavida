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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
          formatter={(v: number) => [`${v} XP`]}
        />
        <Legend />
        {pessoasXp.map((p) => (
          <Line
            key={p.id}
            type="monotone"
            dataKey={p.nome}
            stroke={p.cor}
            strokeWidth={2.5}
            dot={{ r: 4, fill: p.cor }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
