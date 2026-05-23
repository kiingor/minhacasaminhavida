"use client";
import { motion } from "framer-motion";
import { Wallet, PiggyBank, Banknote, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatBRL } from "@/lib/formatters";

interface Composicao {
  correntes: number;
  poupancas: number;
  dinheiro: number;
  aplicacoes: number;
  total: number;
}

interface Props {
  composicao: Composicao;
}

const TIPOS = [
  { key: "correntes" as const, label: "Conta corrente", cor: "#6366F1", Icon: Wallet },
  { key: "poupancas" as const, label: "Poupança", cor: "#10B981", Icon: PiggyBank },
  { key: "dinheiro" as const, label: "Dinheiro", cor: "#F59E0B", Icon: Banknote },
  { key: "aplicacoes" as const, label: "Aplicações", cor: "#8B5CF6", Icon: TrendingUp },
];

interface PieTooltipPayload {
  payload: { label: string; valor: number; cor: string };
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PieTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-md px-3 py-2 text-xs">
      <div className="font-medium" style={{ color: d.cor }}>
        {d.label}
      </div>
      <div className="font-mono font-bold text-slate-800">{formatBRL(d.valor)}</div>
    </div>
  );
}

export function ComposicaoPatrimonioChart({ composicao }: Props) {
  const itens = TIPOS.map((t) => ({
    label: t.label,
    valor: composicao[t.key],
    cor: t.cor,
    Icon: t.Icon,
    key: t.key,
  })).filter((i) => i.valor !== 0);

  if (composicao.total === 0 && itens.length === 0) {
    return (
      <div className="rounded-2xl bg-white border p-5 shadow-sm">
        <h3 className="font-display font-bold text-base mb-2">Composição do patrimônio</h3>
        <p className="text-sm text-slate-400 text-center py-6">
          Nenhum saldo nas contas ativas.
        </p>
      </div>
    );
  }

  // Para evitar fatias negativas distorcendo a pizza (saldos negativos),
  // usamos absoluto so na visualizacao da pizza, mantendo o valor real no tooltip e detalhes.
  const dadosPie = itens.map((i) => ({
    label: i.label,
    valor: Math.max(i.valor, 0),
    cor: i.cor,
  })).filter((i) => i.valor > 0);

  return (
    <div className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h3 className="font-display font-bold text-base">Composição do patrimônio</h3>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Total</div>
          <div
            className={`font-mono font-bold text-base ${
              composicao.total < 0 ? "text-danger" : "text-slate-800"
            }`}
          >
            {formatBRL(composicao.total)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-center">
        <div className="h-[200px]">
          {dadosPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPie}
                  dataKey="valor"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={2}
                  isAnimationActive
                >
                  {dadosPie.map((d, i) => (
                    <Cell key={i} fill={d.cor} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Sem saldos positivos
            </div>
          )}
        </div>

        <ul className="space-y-2">
          {itens.map((i, idx) => {
            const pct =
              composicao.total > 0
                ? Math.round((i.valor / composicao.total) * 100)
                : 0;
            const negativo = i.valor < 0;
            return (
              <motion.li
                key={i.key}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${i.cor}20`, color: i.cor }}
                >
                  <i.Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{i.label}</span>
                    <span
                      className={`font-mono text-sm ${
                        negativo ? "text-danger" : "text-slate-700"
                      }`}
                    >
                      {formatBRL(i.valor)}
                    </span>
                  </div>
                  {composicao.total > 0 && !negativo && (
                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden mt-1">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: i.cor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                      />
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {composicao.total > 0 && !negativo ? `${pct}% do total` : "—"}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
