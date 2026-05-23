"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatBRL } from "@/lib/formatters";

interface Item {
  key: string;
  nome: string;
  cor: string;
  total: number;
  qtd: number;
  percentual: number;
}

interface Props {
  data: Item[];
}

const PALETTE = ["#FF6B47", "#1A1A1A", "#F0512C", "#5C5C5C", "#FFA88B"];

function TooltipCustom({ active, payload }: { active?: boolean; payload?: Array<{ payload: Item }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-3 text-sm space-y-1">
      <div className="font-bold text-ink-900">{d.nome}</div>
      <div className="text-coral-600 font-mono">Total: {formatBRL(d.total)}</div>
      <div className="text-xs text-ink-400">{d.percentual}% · {d.qtd} receita(s)</div>
    </div>
  );
}

export function TopPagadoresChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-ink-300 text-sm">Sem receitas neste mês</div>;
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#EDE7DE" />
          <XAxis type="number" tickFormatter={(v) => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fontWeight: 600, fill: "#262626" }} width={100} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipCustom />} cursor={{ fill: "#FBF8F4" }} />
          <Bar dataKey="total" radius={[0, 10, 10, 0]} maxBarSize={28}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Top pagadores do mês</caption>
        <thead><tr><th>Pagador</th><th>Valor</th><th>Percentual</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}><td>{d.nome}</td><td>{formatBRL(d.total)}</td><td>{d.percentual}%</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
