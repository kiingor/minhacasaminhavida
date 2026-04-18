"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, BarChart3, Users, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Minus, ArrowUpCircle, ChevronDown, ChevronUp } from "lucide-react";
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
import { currentMonth, monthLabel } from "@/lib/monthUtils";
import { formatBRL } from "@/lib/formatters";

type TabType = "pessoas" | "categorias" | "evolucao" | "receitas";
type ReceitaSubMode = "pagador" | "categoria";

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

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "receitas") setTab("receitas");
  }, [searchParams]);

  const porPessoa = useQuery(api.financeiro.dashboardFinanceiro.gastosPorPessoa, token ? { sessionToken: token, mes } : "skip");
  const porCategoria = useQuery(api.financeiro.dashboardFinanceiro.evolucaoCategorias, token && tab === "categorias" ? { sessionToken: token, mesAtual: mes } : "skip");
  const evolucao = useQuery(api.financeiro.dashboardFinanceiro.evolucaoReceitasDespesas, token && tab === "evolucao" ? { sessionToken: token, mesAtual: mes } : "skip");
  const relatorioReceitas = useQuery(api.financeiro.dashboardFinanceiro.relatorioReceitas, token && tab === "receitas" ? { sessionToken: token, mes } : "skip");

  const totalGeral = porPessoa?.reduce((s, d) => s + d.total, 0) ?? 0;

  const tabs: { value: TabType; label: string; icon: typeof Users }[] = [
    { value: "pessoas", label: "Por Pessoa", icon: Users },
    { value: "categorias", label: "Por Categoria", icon: PieChart },
    { value: "evolucao", label: "Evolução", icon: TrendingUp },
    { value: "receitas", label: "Receitas", icon: ArrowUpCircle },
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
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
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
          {evolucao === undefined ? (
            <Skeleton className="h-[400px] rounded-2xl" />
          ) : (
            <>
              <div className="rounded-2xl bg-white border p-5 shadow-sm">
                <h2 className="font-display font-bold text-lg mb-4">Receitas vs Despesas (12 meses)</h2>
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
                  const mediaR = Math.round(totalR / 12);
                  const mediaD = Math.round(totalD / 12);
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
            </>
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
