"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";

interface Props {
  mes: string; // YYYY-MM atual
  meses?: number; // default 6
}

const MESES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatMesLabel(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_LABEL[m - 1]}/${String(y).slice(2)}`;
}

function formatYAxis(v: number): string {
  if (v >= 1000_00) return `R$${Math.round(v / 1000_00)}k`;
  if (v >= 1_00) return `R$${Math.round(v / 1_00)}`;
  return `R$0`;
}

export function FluxoCaixaCard({ mes, meses = 6 }: Props) {
  const token = useSessionToken();
  const evolucao = useQuery(
    api.financeiro.dashboardFinanceiro.evolucaoReceitasDespesas,
    token ? { sessionToken: token, mesAtual: mes } : "skip"
  );

  const dados = useMemo(() => {
    if (!evolucao) return [];
    // evolucao retorna 12 meses (mais antigo → mais recente). Pega os últimos N.
    return evolucao.slice(-meses).map((d) => ({
      mes: formatMesLabel(d.mes),
      Receitas: d.receitas,
      Despesas: d.despesas,
      saldo: d.saldo,
    }));
  }, [evolucao, meses]);

  const totais = useMemo(() => {
    const totR = dados.reduce((s, d) => s + d.Receitas, 0);
    const totD = dados.reduce((s, d) => s + d.Despesas, 0);
    return { totR, totD, saldo: totR - totD };
  }, [dados]);

  if (evolucao === undefined) {
    return <Skeleton className="h-80 rounded-2xl" />;
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="font-display font-bold text-base text-ink-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-coral-500" />
            Fluxo de caixa
            <span className="text-xs font-normal text-ink-400">— últimos {meses} meses</span>
          </h2>
          <div className="flex items-center gap-3 mt-1 text-[11px]">
            <span className="inline-flex items-center gap-1 text-ink-600">
              <ArrowUpRight size={11} className="text-ink-900" />
              <span className="font-mono font-semibold">{formatBRL(totais.totR)}</span> entradas
            </span>
            <span className="inline-flex items-center gap-1 text-ink-600">
              <ArrowDownRight size={11} className="text-coral-500" />
              <span className="font-mono font-semibold">{formatBRL(totais.totD)}</span> saídas
            </span>
          </div>
        </div>
        <Link
          href="/financeiro/relatorios"
          className="text-xs text-coral-600 hover:underline font-medium"
        >
          Ver detalhe →
        </Link>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E8E2DB" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="mes"
              stroke="#7A7268"
              fontSize={11}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#7A7268"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={50}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 107, 71, 0.06)" }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E8E2DB",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(15, 15, 15, 0.08)",
              }}
              formatter={(v: number) => formatBRL(v)}
              labelStyle={{ color: "#0F0F0F", fontWeight: 600, marginBottom: 4 }}
            />
            <Bar dataKey="Receitas" fill="#0F0F0F" radius={[6, 6, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Despesas" fill="#C4BDB4" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-ink-900" aria-hidden /> Receita
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cream-400" aria-hidden /> Despesas
        </span>
      </div>
    </Card>
  );
}
