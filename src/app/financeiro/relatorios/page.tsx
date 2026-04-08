"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, BarChart3, Users } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";
import { formatBRL } from "@/lib/formatters";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border rounded-xl shadow-lg p-3 text-sm space-y-1">
      <div className="font-bold">{d.nome}</div>
      <div className="text-danger">Total: {formatBRL(d.total)}</div>
      <div className="text-success text-xs">Pago: {formatBRL(d.pagas)}</div>
      <div className="text-warning text-xs">Pendente: {formatBRL(d.pendentes)}</div>
    </div>
  );
}

export default function RelatoriosPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const dados = useQuery(api.financeiro.dashboardFinanceiro.gastosPorPessoa, token ? { sessionToken: token, mes } : "skip");

  const totalGeral = dados?.reduce((s, d) => s + d.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <BarChart3 size={28} className="text-primary" /> Relatório por Pessoa
          </h1>
          <p className="text-slate-500">Gastos de cada membro da família</p>
        </div>
        <MonthSelector mes={mes} onChange={setMes} />
      </div>

      {dados === undefined ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : dados.length === 0 ? (
        <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-2xl">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum gasto registrado neste mês.</p>
        </div>
      ) : (
        <>
          {/* Gráfico */}
          <div className="rounded-2xl bg-white border p-5 shadow-sm">
            <h2 className="font-display font-bold text-lg mb-4">Comparativo de gastos</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 12, fontWeight: 600 }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={36}>
                  {dados.map((entry, i) => (
                    <Cell key={i} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela detalhada */}
          <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Detalhamento</h2>
              <div className="text-sm text-slate-500">Total: <span className="font-mono font-bold text-danger">{formatBRL(totalGeral)}</span></div>
            </div>
            <ul className="divide-y">
              {dados.map((d, i) => {
                const pct = totalGeral > 0 ? Math.round((d.total / totalGeral) * 100) : 0;
                return (
                  <motion.li
                    key={d.pessoaId || "sem-pessoa"}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.cor }} />
                        <span className="font-medium">{d.nome}</span>
                        <span className="text-xs text-slate-400">{pct}% do total</span>
                      </div>
                      <span className="font-mono font-bold text-danger">{formatBRL(d.total)}</span>
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: d.cor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                      />
                    </div>
                    {/* Pago vs Pendente */}
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span className="text-success">✓ Pago: <span className="font-mono font-semibold">{formatBRL(d.pagas)}</span></span>
                      <span className="text-warning">⏳ Pendente: <span className="font-mono font-semibold">{formatBRL(d.pendentes)}</span></span>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
