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

function TooltipCustom({ active, payload }: { active?: boolean; payload?: Array<{ payload: Item }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border rounded-xl shadow-lg p-3 text-sm space-y-1">
      <div className="font-bold">{d.nome}</div>
      <div className="text-success">Total: {formatBRL(d.total)}</div>
      <div className="text-xs text-slate-500">{d.percentual}% · {d.qtd} receita(s)</div>
    </div>
  );
}

export function TopPagadoresChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Sem receitas neste mês</div>;
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fontWeight: 600 }} width={100} />
          <Tooltip content={<TooltipCustom />} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {data.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
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
