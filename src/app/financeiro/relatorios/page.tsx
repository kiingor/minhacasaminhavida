"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, BarChart3, Users, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, Minus, ArrowUpCircle, ChevronDown, ChevronUp, Wallet, Layers } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { TopLancamentosMes } from "@/components/financeiro/TopLancamentosMes";
import { CategoriasVariacaoChart } from "@/components/financeiro/CategoriasVariacaoChart";
import { ComposicaoPatrimonioChart } from "@/components/financeiro/ComposicaoPatrimonioChart";
import { CategoryPieChart } from "@/components/financeiro/CategoryPieChart";
import { HistoryChart } from "@/components/financeiro/HistoryChart";
import { TopPagadoresChart } from "@/components/financeiro/TopPagadoresChart";
import { currentMonth, monthLabel } from "@/lib/monthUtils";
import { formatBRL } from "@/lib/formatters";

type TabType = "pessoas" | "categorias" | "evolucao" | "receitas" | "patrimonio" | "composicao";
type ReceitaSubMode = "pagador" | "categoria";
type RangeMeses = 6 | 12;

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { nome?: string; mes?: string; total?: number; pagas?: number; pendentes?: number; receitas?: number; despesas?: number; saldo?: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.nome) {
    return (
      <div className="bg-white border rounded-xl shadow-lg p-3 text-sm space-y-1">
        <div className="font-bold">{d.nome}</div>
        <div className="text-danger">Total: {formatBRL(d.total ?? 0)}</div>
        <div className="text-success text-xs">Pago: {formatBRL(d.pagas ?? 0)}</div>
        <div className="text-warning text-xs">Pendente: {formatBRL(d.pendentes ?? 0)}</div>
      </div>
    );
  }
  if (d.mes) {
    return (
      <div className="bg-white border rounded-xl shadow-lg p-3 text-sm space-y-1">
        <div className="font-bold">{monthLabel(d.mes)}</div>
        {d.receitas !== undefined && <div className="text-success">Receitas: {formatBRL(d.receitas)}</div>}
        {d.despesas !== undefined && <div className="text-danger">Despesas: {formatBRL(d.despesas)}</div>}
        {d.saldo !== undefined && <div className={d.saldo >= 0 ? "text-success font-bold" : "text-danger font-bold"}>Saldo: {formatBRL(d.saldo)}</div>}
      </div>
    );
  }
  return null;
}

export default function RelatoriosPage() {
  const token = useSessionToken();
  const searchParams = useSearchParams();
  const [mes, setMes] = useState(currentMonth());
  const [tab, setTab] = useState<TabType>("pessoas");
  const [receitaSubMode, setReceitaSubMode] = useState<ReceitaSubMode>("pagador");
  const [catExpanded, setCatExpanded] = useState<Record<string, boolean>>({});
  const [range, setRange] = useState<RangeMeses>(12);
  const [modoCatDespesa, setModoCatDespesa] = useState<"consolidado" | "detalhado">("consolidado");
  const [modoCatReceita, setModoCatReceita] = useState<"consolidado" | "detalhado">("consolidado");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "receitas") setTab("receitas");
    else if (t === "patrimonio") setTab("patrimonio");
    else if (t === "composicao") setTab("composicao");
  }, [searchParams]);

  const porPessoa = useQuery(api.financeiro.dashboardFinanceiro.gastosPorPessoa, token ? { sessionToken: token, mes } : "skip");
  const porCategoria = useQuery(api.financeiro.dashboardFinanceiro.evolucaoCategorias, token && tab === "categorias" ? { sessionToken: token, mesAtual: mes } : "skip");
  const evolucao = useQuery(
    api.financeiro.dashboardFinanceiro.historicoNMeses,
    token && tab === "evolucao" ? { sessionToken: token, mesAtual: mes, meses: range } : "skip"
  );
  const topLancamentos = useQuery(
    api.financeiro.dashboardFinanceiro.topLancamentosMes,
    token && tab === "evolucao" ? { sessionToken: token, mes, limit: 5 } : "skip"
  );
  const variacaoCategorias = useQuery(
    api.financeiro.dashboardFinanceiro.categoriasComparativo,
    token && tab === "evolucao" ? { sessionToken: token, mes, limit: 5 } : "skip"
  );
  const composicao = useQuery(
    api.financeiro.dashboardFinanceiro.composicaoPatrimonio,
    token && tab === "patrimonio" ? { sessionToken: token } : "skip"
  );
  const relatorioReceitas = useQuery(api.financeiro.dashboardFinanceiro.relatorioReceitas, token && tab === "receitas" ? { sessionToken: token, mes } : "skip");

  // Composicao do mes (charts movidos da home)
  const composicaoDespesas = useQuery(
    api.financeiro.dashboardFinanceiro.despesasPorCategoria,
    token && tab === "composicao" ? { sessionToken: token, mes, modo: modoCatDespesa } : "skip"
  );
  const composicaoReceitas = useQuery(
    api.financeiro.dashboardFinanceiro.receitasPorCategoria,
    token && tab === "composicao" ? { sessionToken: token, mes, modo: modoCatReceita } : "skip"
  );
  const composicaoHistorico = useQuery(
    api.financeiro.dashboardFinanceiro.historico6Meses,
    token && tab === "composicao" ? { sessionToken: token, mesAtual: mes } : "skip"
  );
  const composicaoTopPagadores = useQuery(
    api.financeiro.dashboardFinanceiro.receitasPorPagador,
    token && tab === "composicao" ? { sessionToken: token, mes, limit: 5 } : "skip"
  );

  const totalGeral = porPessoa?.reduce((s, d) => s + d.total, 0) ?? 0;

  const tabs: { value: TabType; label: string; icon: typeof Users }[] = [
    { value: "composicao", label: "Composição do mês", icon: Layers },
    { value: "pessoas", label: "Por Pessoa", icon: Users },
    { value: "categorias", label: "Por Categoria", icon: PieChart },
    { value: "evolucao", label: "Evolução", icon: TrendingUp },
    { value: "receitas", label: "Receitas", icon: ArrowUpCircle },
    { value: "patrimonio", label: "Patrimônio", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <BarChart3 size={28} className="text-primary" /> Relatórios
          </h1>
          <p className="text-slate-500">Análise detalhada das finanças</p>
        </div>
        <MonthSelector mes={mes} onChange={setMes} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              tab === t.value
                ? "border-primary bg-primary/5 text-primary"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Composicao do mes (charts movidos da home) */}
      {tab === "composicao" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="font-display font-bold text-lg">Despesas por Categoria</h2>
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  {(["consolidado", "detalhado"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModoCatDespesa(m)}
                      className={`px-2.5 py-1 capitalize transition-colors ${
                        modoCatDespesa === m
                          ? "bg-primary text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                      aria-pressed={modoCatDespesa === m}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {composicaoDespesas ? (
                <CategoryPieChart data={composicaoDespesas} />
              ) : (
                <Skeleton className="h-[280px]" />
              )}
            </div>
            <div className="rounded-2xl bg-white border p-5 shadow-sm">
              <h2 className="font-display font-bold text-lg mb-3">Últimos 6 meses</h2>
              {composicaoHistorico ? (
                <HistoryChart data={composicaoHistorico} />
              ) : (
                <Skeleton className="h-[280px]" />
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="font-display font-bold text-lg">Receitas por Categoria</h2>
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  {(["consolidado", "detalhado"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModoCatReceita(m)}
                      className={`px-2.5 py-1 capitalize transition-colors ${
                        modoCatReceita === m
                          ? "bg-success text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                      aria-pressed={modoCatReceita === m}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {composicaoReceitas ? (
                <CategoryPieChart data={composicaoReceitas} />
              ) : (
                <Skeleton className="h-[280px]" />
              )}
            </div>
            <div className="rounded-2xl bg-white border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-lg">Top Pagadores</h2>
                <Link
                  href="/financeiro/relatorios?tab=receitas"
                  className="text-xs text-primary hover:underline"
                >
                  Ver detalhe →
                </Link>
              </div>
              {composicaoTopPagadores ? (
                <TopPagadoresChart data={composicaoTopPagadores.itens} />
              ) : (
                <Skeleton className="h-[280px]" />
              )}
            </div>
          </div>
        </>
      )}

      {/* Tab: Pessoas */}
      {tab === "pessoas" && (
        <>
          {porPessoa === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          ) : porPessoa.length === 0 ? (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-2xl">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum gasto registrado neste mês.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white border p-5 shadow-sm">
                <h2 className="font-display font-bold text-lg mb-4">Comparativo de gastos</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porPessoa} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 12, fontWeight: 600 }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={36}>
                      {porPessoa.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg">Detalhamento</h2>
                  <div className="text-sm text-slate-500">Total: <span className="font-mono font-bold text-danger">{formatBRL(totalGeral)}</span></div>
                </div>
                <ul className="divide-y">
                  {porPessoa.map((d, i) => {
                    const pct = totalGeral > 0 ? Math.round((d.total / totalGeral) * 100) : 0;
                    return (
                      <motion.li key={d.pessoaId || "sem-pessoa"} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.cor }} />
                            <span className="font-medium">{d.nome}</span>
                            <span className="text-xs text-slate-400">{pct}% do total</span>
                          </div>
                          <span className="font-mono font-bold text-danger">{formatBRL(d.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                          <motion.div className="h-full rounded-full" style={{ background: d.cor }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span className="text-success">Pago: <span className="font-mono font-semibold">{formatBRL(d.pagas)}</span></span>
                          <span className="text-warning">Pendente: <span className="font-mono font-semibold">{formatBRL(d.pendentes)}</span></span>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </>
      )}

      {/* Tab: Categorias */}
      {tab === "categorias" && (
        <>
          {porCategoria === undefined ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
          ) : porCategoria.length === 0 ? (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-2xl">
              <PieChart size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma despesa nos últimos 3 meses.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-display font-bold text-lg">Gastos por Categoria (3 meses)</h2>
                <p className="text-xs text-slate-500">Comparando com o mês anterior</p>
              </div>
              <ul className="divide-y">
                {porCategoria.map((cat, i) => (
                  <motion.li key={cat.categoriaId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${cat.cor}20`, color: cat.cor }}>
                          {cat.nome.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium">{cat.nome}</span>
                          <div className="flex items-center gap-1 text-xs">
                            {cat.variacao > 5 ? (
                              <span className="text-danger flex items-center gap-0.5"><ArrowUpRight size={12} /> +{cat.variacao}%</span>
                            ) : cat.variacao < -5 ? (
                              <span className="text-success flex items-center gap-0.5"><ArrowDownRight size={12} /> {cat.variacao}%</span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-0.5"><Minus size={12} /> estável</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-danger">{formatBRL(cat.meses[2]?.valor ?? 0)}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      {cat.meses.map((m) => (
                        <span key={m.mes} className="flex-1 text-center">
                          <span className="block text-slate-400">{monthLabel(m.mes)}</span>
                          <span className="font-mono font-semibold text-slate-700">{formatBRL(m.valor)}</span>
                        </span>
                      ))}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Tab: Evolução */}
      {tab === "evolucao" && (
        <>
          {/* Toggle 6m / 12m */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-slate-500">
              Comparativo de receitas e despesas ao longo do tempo
            </div>
            <div className="inline-flex rounded-lg border bg-white p-1 text-xs font-medium">
              {([6, 12] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setRange(n)}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    range === n ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {n}m
                </button>
              ))}
            </div>
          </div>

          {evolucao === undefined ? (
            <Skeleton className="h-[400px] rounded-2xl" />
          ) : (
            <>
              <div className="rounded-2xl bg-white border p-5 shadow-sm">
                <h2 className="font-display font-bold text-lg mb-4">
                  Receitas vs Despesas ({range} meses)
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={evolucao} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tickFormatter={(v) => monthLabel(v)} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v / 100000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => v === "receitas" ? "Receitas" : "Despesas"} />
                    <Bar dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="despesas" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl bg-white border p-5 shadow-sm">
                <h2 className="font-display font-bold text-lg mb-4">Saldo Mensal</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={evolucao} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tickFormatter={(v) => monthLabel(v)} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v / 100000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="saldo"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#6366F1" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Resumo */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {(() => {
                  const totalR = evolucao.reduce((s, m) => s + m.receitas, 0);
                  const totalD = evolucao.reduce((s, m) => s + m.despesas, 0);
                  const mediaR = Math.round(totalR / range);
                  const mediaD = Math.round(totalD / range);
                  return (
                    <>
                      <div className="rounded-xl bg-white border p-4 text-center">
                        <div className="text-xs text-slate-500 uppercase">Total Receitas</div>
                        <div className="font-mono font-bold text-success mt-1">{formatBRL(totalR)}</div>
                      </div>
                      <div className="rounded-xl bg-white border p-4 text-center">
                        <div className="text-xs text-slate-500 uppercase">Total Despesas</div>
                        <div className="font-mono font-bold text-danger mt-1">{formatBRL(totalD)}</div>
                      </div>
                      <div className="rounded-xl bg-white border p-4 text-center">
                        <div className="text-xs text-slate-500 uppercase">Média Receita/mês</div>
                        <div className="font-mono font-bold text-success mt-1">{formatBRL(mediaR)}</div>
                      </div>
                      <div className="rounded-xl bg-white border p-4 text-center">
                        <div className="text-xs text-slate-500 uppercase">Média Despesa/mês</div>
                        <div className="font-mono font-bold text-danger mt-1">{formatBRL(mediaD)}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Top 5 lancamentos do mes */}
              {topLancamentos === undefined ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <TopLancamentosMes itens={topLancamentos} />
              )}

              {/* Categorias que mais cresceram / diminuiram */}
              {variacaoCategorias === undefined ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-64 rounded-2xl" />
                  <Skeleton className="h-64 rounded-2xl" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <CategoriasVariacaoChart
                    itens={variacaoCategorias.topCresceram}
                    modo="cresceram"
                    mesLabel={monthLabel(variacaoCategorias.mesAtual)}
                    mesAnteriorLabel={monthLabel(variacaoCategorias.mesAnterior)}
                  />
                  <CategoriasVariacaoChart
                    itens={variacaoCategorias.topDiminuiram}
                    modo="diminuiram"
                    mesLabel={monthLabel(variacaoCategorias.mesAtual)}
                    mesAnteriorLabel={monthLabel(variacaoCategorias.mesAnterior)}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab: Patrimonio */}
      {tab === "patrimonio" && (
        <>
          {composicao === undefined ? (
            <Skeleton className="h-[300px] rounded-2xl" />
          ) : (
            <ComposicaoPatrimonioChart composicao={composicao} />
          )}
        </>
      )}

      {/* Tab: Receitas */}
      {tab === "receitas" && (
        <>
          <div className="flex gap-2">
            {([
              { value: "pagador" as const, label: "Por Pagador" },
              { value: "categoria" as const, label: "Por Categoria" },
            ]).map((m) => (
              <button
                key={m.value}
                onClick={() => setReceitaSubMode(m.value)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  receitaSubMode === m.value ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {relatorioReceitas === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          ) : relatorioReceitas.totalGeral === 0 ? (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-2xl">
              <ArrowUpCircle size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma receita registrada neste mês.</p>
            </div>
          ) : receitaSubMode === "pagador" ? (
            <>
              <div className="rounded-2xl bg-white border p-5 shadow-sm">
                <h2 className="font-display font-bold text-lg mb-4">Comparativo por Pagador</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={relatorioReceitas.porPagador} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 12, fontWeight: 600 }} width={100} />
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={36}>
                      {relatorioReceitas.porPagador.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg">Detalhamento</h2>
                  <div className="text-sm text-slate-500">Total: <span className="font-mono font-bold text-success">{formatBRL(relatorioReceitas.totalGeral)}</span></div>
                </div>
                <ul className="divide-y">
                  {relatorioReceitas.porPagador.map((p, i) => (
                    <motion.li key={p.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.cor }} />
                          <span className="font-medium">{p.nome}</span>
                          <span className="text-xs text-slate-400">{p.percentual}% · {p.qtd} receita(s)</span>
                        </div>
                        <span className="font-mono font-bold text-success">{formatBRL(p.total)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                        <motion.div className="h-full rounded-full" style={{ background: p.cor }} initial={{ width: 0 }} animate={{ width: `${p.percentual}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span className="text-success">Recebido: <span className="font-mono font-semibold">{formatBRL(p.recebido)}</span></span>
                        <span className="text-warning">Pendente: <span className="font-mono font-semibold">{formatBRL(p.pendente)}</span></span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-display font-bold text-lg">Receitas por Categoria</h2>
                <div className="text-sm text-slate-500">Total: <span className="font-mono font-bold text-success">{formatBRL(relatorioReceitas.totalGeral)}</span></div>
              </div>
              <ul className="divide-y">
                {relatorioReceitas.porCategoria.map((cat, i) => {
                  const open = !!catExpanded[cat.categoriaId];
                  return (
                    <motion.li key={cat.categoriaId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="p-4">
                      <button
                        type="button"
                        onClick={() => setCatExpanded((e) => ({ ...e, [cat.categoriaId]: !open }))}
                        className="w-full flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${cat.cor}20`, color: cat.cor }}>
                            {cat.nome.charAt(0)}
                          </div>
                          <div className="text-left min-w-0">
                            <div className="font-medium truncate">{cat.nome}</div>
                            <div className="text-xs text-slate-400">{cat.percentual}% · {cat.qtd} receita(s)</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-success">{formatBRL(cat.total)}</span>
                          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </button>
                      {open && (
                        <ul className="mt-3 pl-10 space-y-2">
                          {cat.pagadores.map((p) => (
                            <li key={p.key}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ background: p.cor }} />
                                  <span className="text-slate-700">{p.nome}</span>
                                </div>
                                <span className="font-mono text-slate-600">{formatBRL(p.total)}</span>
                              </div>
                              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ background: p.cor, width: cat.total > 0 ? `${(p.total / cat.total) * 100}%` : "0%" }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
