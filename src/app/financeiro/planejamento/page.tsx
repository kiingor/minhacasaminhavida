"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp, Receipt, CircleCheck, Activity, FileText, RefreshCw,
  ChevronDown, AlertTriangle, ArrowUpRight,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { formatBRL } from "@/lib/formatters";
import { currentMonth, monthLabel } from "@/lib/monthUtils";
import { cn } from "@/lib/utils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function shiftMonthStr(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Periodo = 3 | 6 | 12;

export default function PlanejamentoPage() {
  const token = useSessionToken();
  const [periodo, setPeriodo] = useState<Periodo>(6);
  const [mesFim] = useState<string>(currentMonth());
  const mesInicio = useMemo(() => shiftMonthStr(mesFim, -(periodo - 1)), [mesFim, periodo]);

  const dados = useQuery(
    api.financeiro.dashboardFinanceiro.planejamentoPeriodo,
    token ? { sessionToken: token, mesInicio, mesFim } : "skip",
  );

  function imprimir() { if (typeof window !== "undefined") window.print(); }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="py-6 md:py-10 space-y-6 pb-24 print:py-2">

      {/* Header */}
      <motion.section variants={item} className="print:hidden">
        <PageHeader
          backHref="/financeiro"
          backLabel="Voltar para Finanças"
          title="Plano financeiro"
          subtitle="Análise multi-mês: planejado, realizado e tendências"
          actions={
            <>
              <PeriodoSelector value={periodo} onChange={setPeriodo} />
              <Button variant="outline" onClick={imprimir} className="text-sm">
                <FileText size={14} /> Relatório PDF
              </Button>
            </>
          }
        />
      </motion.section>

      {/* Header de impressão */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">Plano financeiro</h1>
            <p className="text-sm text-ink-500 capitalize">
              {dados ? `${monthLabel(dados.meses[0])} → ${monthLabel(dados.meses[dados.meses.length - 1])}` : ""}
            </p>
          </div>
          <p className="text-xs text-ink-400">Minha Casa Minha Vida</p>
        </div>
      </div>

      {dados === undefined ? (
        <SkeletonState />
      ) : (
        <>
          {/* Saldo mensal e acumulado */}
          <motion.section variants={item}>
            <SectionLabel>Saldo mensal e acumulado</SectionLabel>
            <SaldoStrip saldoPorMes={dados.saldoPorMes} />
          </motion.section>

          {/* Macro do período */}
          <motion.section variants={item}>
            <SectionLabel>Visão macro do período</SectionLabel>
            <MacroGrid macro={dados.macro} />
          </motion.section>

          {/* Tabela hierárquica */}
          <motion.section variants={item}>
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
                <h2 className="font-display font-bold text-lg text-ink-900">Categorias e subcategorias</h2>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-ink-400">
                  <LegendaBolinha cor="bg-ink-700" label="Abaixo" />
                  <LegendaBolinha cor="bg-coral-500" label="Acima" />
                </div>
              </div>
              <PlanTable meses={dados.meses} grupos={dados.grupos} />
            </Card>
          </motion.section>

          {/* Variação + Evolução */}
          <motion.section variants={item} className="grid gap-4 md:grid-cols-2">
            <VariacaoCard
              variacao={dados.variacaoPorCategoria.map((v) => ({
                ...v,
                status: (v.status === "bad" || v.status === "warn" ? v.status : "ok") as "ok" | "warn" | "bad",
              }))}
            />
            <EvolucaoCard saldoPorMes={dados.saldoPorMes} />
          </motion.section>
        </>
      )}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mb-3 px-1">
      {children}
    </p>
  );
}

function LegendaBolinha({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", cor)} aria-hidden />
      {label}
    </span>
  );
}

function PeriodoSelector({ value, onChange }: { value: number; onChange: (n: Periodo) => void }) {
  const options: Periodo[] = [3, 6, 12];
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white border border-cream-200 shadow-soft p-1">
      {options.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            "h-9 px-3 rounded-full text-xs font-semibold transition-colors",
            value === n ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900 hover:bg-cream-50",
          )}
        >
          {n}m
        </button>
      ))}
    </div>
  );
}

interface SaldoMes {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
}

function SaldoStrip({ saldoPorMes }: { saldoPorMes: SaldoMes[] }) {
  const N = saldoPorMes.length;
  const totalAcum = saldoPorMes[N - 1]?.acumulado ?? 0;
  const media = N > 0 ? Math.round(saldoPorMes.reduce((s, m) => s + m.saldo, 0) / N) : 0;

  return (
    // Scroll horizontal genuíno: cada card tem largura fixa (140px) e não encolhe.
    // Negative margin + padding compensa pra borda alinhar com o resto da página.
    <div className="-mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 overflow-x-auto pb-2">
      <div className="flex gap-2 snap-x snap-mandatory w-max">
        {saldoPorMes.map((sm) => {
          const sinal = sm.saldo < 0 ? "-" : "+";
          const sinalAcum = sm.acumulado < 0 ? "-" : "";
          return (
            <div
              key={sm.mes}
              className="snap-start shrink-0 w-[140px] rounded-2xl bg-white shadow-soft p-3"
            >
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold capitalize truncate">
                {monthLabel(sm.mes)}
              </div>
              <div className={cn(
                "font-mono font-bold text-base mt-1 tabular-nums truncate",
                sm.saldo < 0 ? "text-coral-600" : "text-ink-900",
              )}>
                {sinal}{formatBRL(Math.abs(sm.saldo))}
              </div>
              <div className="text-[11px] text-ink-400 mt-0.5 font-mono tabular-nums truncate">
                Acum: {sinalAcum}{formatBRL(Math.abs(sm.acumulado))}
              </div>
            </div>
          );
        })}
        <div className="snap-start shrink-0 w-[140px] rounded-2xl bg-cream-50 border border-cream-200 p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold truncate">Média mensal</div>
          <div className="font-mono font-bold text-base mt-1 text-ink-900 tabular-nums truncate">
            {media < 0 ? "-" : ""}{formatBRL(Math.abs(media))}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5 truncate">dos {N} meses</div>
        </div>
        <div className="snap-start shrink-0 w-[140px] rounded-2xl bg-ink-900 text-white p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-white/70 font-semibold truncate">Acumulado</div>
          <div className="font-mono font-bold text-base mt-1 text-coral-400 tabular-nums truncate">
            {totalAcum < 0 ? "-" : ""}{formatBRL(Math.abs(totalAcum))}
          </div>
          <div className="text-[11px] text-white/65 mt-0.5 truncate">no período</div>
        </div>
      </div>
    </div>
  );
}

interface MacroShape {
  receitaMedia: number;
  receitaMax: number;
  receitaMaxMes: string;
  despesaMedia: number;
  despesaMax: number;
  despesaMaxMes: string;
  categoriasOk: number;
  categoriasTotal: number;
  categoriasCriticas: string[];
  variacaoMedia: number;
}

function MacroGrid({ macro }: { macro: MacroShape }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      <MacroCard
        label="Receita média"
        value={formatBRL(macro.receitaMedia)}
        sub="por mês no período"
        icon={TrendingUp}
        hint={macro.receitaMax > 0 ? `Máx: ${formatBRL(macro.receitaMax)} em ${monthLabel(macro.receitaMaxMes)}` : undefined}
      />
      <MacroCard
        label="Despesa média"
        value={formatBRL(macro.despesaMedia)}
        sub="por mês no período"
        icon={Receipt}
        hint={macro.despesaMax > 0 ? `Máx: ${formatBRL(macro.despesaMax)} em ${monthLabel(macro.despesaMaxMes)}` : undefined}
      />
      <MacroCard
        label="Categorias OK"
        value={`${macro.categoriasOk} / ${macro.categoriasTotal}`}
        sub="dentro do orçamento"
        icon={CircleCheck}
        hint={macro.categoriasCriticas.length > 0
          ? `Críticas: ${macro.categoriasCriticas.slice(0, 2).join(", ")}`
          : "Todas em ordem"}
        critical={macro.categoriasCriticas.length > 0}
      />
      <MacroCard
        label="Variação média"
        value={`±${formatBRL(macro.variacaoMedia)}`}
        sub="oscilação mensal típica"
        icon={Activity}
      />
    </div>
  );
}

function MacroCard({
  label, value, sub, icon: Icon, hint, critical,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof TrendingUp;
  hint?: string;
  critical?: boolean;
}) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">{label}</span>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          critical ? "bg-coral-500 text-white" : "bg-cream-100 text-ink-700",
        )}>
          <Icon size={15} />
        </div>
      </div>
      <div className="font-display font-bold text-2xl text-ink-900 leading-tight font-mono tabular-nums">{value}</div>
      <div className="text-[11px] text-ink-400 mt-1">{sub}</div>
      {hint && (
        <div className={cn(
          "mt-2 text-[11px] flex items-center gap-1 truncate",
          critical ? "text-coral-600" : "text-ink-500",
        )}>
          {critical && <AlertTriangle size={11} className="shrink-0" />}
          {!critical && <ArrowUpRight size={11} className="shrink-0" />}
          <span className="truncate">{hint}</span>
        </div>
      )}
    </Card>
  );
}

interface Linha {
  categoriaId: string;
  nome: string;
  cor: string;
  icone?: string;
  planejado: number;
  min: number;
  med: number;
  max: number;
  valoresPorMes: number[];
  estouro: boolean[];
  total: number;
}

interface TotalGrupo {
  planejado: number;
  min: number;
  med: number;
  max: number;
  valoresPorMes: number[];
  estouro: boolean[];
  total: number;
}

interface Grupos {
  receitas: { linhas: Linha[]; total: TotalGrupo };
  despesas: { linhas: Linha[]; total: TotalGrupo };
  poupanca: { linhas: Linha[]; total: TotalGrupo };
}

function PlanTable({ meses, grupos }: { meses: string[]; grupos: Grupos }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold border-b border-cream-200">
            <th className="text-left px-5 py-3 font-semibold sticky left-0 bg-white z-10">Categoria</th>
            <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Planejado</th>
            <th className="text-right px-2 py-3 font-semibold whitespace-nowrap">Mín</th>
            <th className="text-right px-2 py-3 font-semibold whitespace-nowrap">Méd</th>
            <th className="text-right px-2 py-3 font-semibold whitespace-nowrap">Máx</th>
            {meses.map((m) => (
              <th key={m} className="text-right px-2 py-3 font-semibold whitespace-nowrap capitalize">{monthLabel(m)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <GrupoBlock label="Receitas" icon={TrendingUp} grupo={grupos.receitas} accent="ok" />
          <GrupoBlock label="Despesas" icon={Receipt} grupo={grupos.despesas} accent="warn" />
          <GrupoBlock label="Poupança e investimentos" icon={Activity} grupo={grupos.poupanca} accent="dark" />
        </tbody>
      </table>
    </div>
  );
}

function GrupoBlock({
  label, icon: Icon, grupo, accent,
}: {
  label: string;
  icon: typeof TrendingUp;
  grupo: { linhas: Linha[]; total: TotalGrupo };
  accent: "ok" | "warn" | "dark";
}) {
  const [aberto, setAberto] = useState(true);
  const headerBg =
    accent === "ok" ? "bg-cream-50"
    : accent === "warn" ? "bg-coral-50"
    : "bg-cream-50";

  const totalBg =
    accent === "ok" ? "bg-cream-100"
    : accent === "warn" ? "bg-coral-50"
    : "bg-ink-900 text-white";

  return (
    <>
      <tr
        className={cn("cursor-pointer hover:opacity-80", headerBg)}
        onClick={() => setAberto((v) => !v)}
      >
        <td colSpan={5 + grupo.total.valoresPorMes.length} className="px-5 py-2.5">
          <div className="flex items-center gap-2">
            <ChevronDown size={14} className={cn("text-ink-500 transition-transform", !aberto && "-rotate-90")} />
            <Icon size={14} className="text-ink-700" />
            <span className="font-display font-bold text-sm text-ink-900">{label}</span>
            {grupo.linhas.length > 0 && (
              <Pill tone="neutral" size="xs">{grupo.linhas.length}</Pill>
            )}
          </div>
        </td>
      </tr>

      {aberto && grupo.linhas.length === 0 && (
        <tr>
          <td colSpan={5 + grupo.total.valoresPorMes.length} className="px-5 py-3 text-xs text-ink-400 italic">
            Nenhum item neste grupo.
          </td>
        </tr>
      )}

      {aberto && grupo.linhas.map((l) => {
        const Icon = iconeDaCategoria(l.icone);
        return (
          <tr key={l.categoriaId} className="border-t border-cream-100 hover:bg-cream-50/50">
            <td className="px-5 py-2 sticky left-0 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={12} className="text-ink-500 shrink-0" />
                <span className="text-[13px] text-ink-900 truncate">{l.nome}</span>
              </div>
            </td>
            <CellNum value={l.planejado} bold />
            <CellNum value={l.min} muted />
            <CellNum value={l.med} muted />
            <CellNum value={l.max} muted />
            {l.valoresPorMes.map((v, i) => (
              <CellMes key={i} value={v} estourou={l.estouro[i]} />
            ))}
          </tr>
        );
      })}

      {aberto && (
        <tr className={cn("border-t border-cream-200 font-semibold", totalBg)}>
          <td className={cn("px-5 py-2.5 sticky left-0", accent === "dark" ? "bg-ink-900 text-white" : totalBg)}>
            <span className="text-[13px] font-bold">Total {label.toLowerCase()}</span>
          </td>
          <CellNum value={grupo.total.planejado} bold onDark={accent === "dark"} />
          <CellNum value={grupo.total.min} muted onDark={accent === "dark"} />
          <CellNum value={grupo.total.med} bold onDark={accent === "dark"} />
          <CellNum value={grupo.total.max} muted onDark={accent === "dark"} />
          {grupo.total.valoresPorMes.map((v, i) => (
            <CellMes key={i} value={v} estourou={grupo.total.estouro[i]} onDark={accent === "dark"} bold />
          ))}
        </tr>
      )}
    </>
  );
}

function CellNum({
  value, bold, muted, onDark,
}: {
  value: number;
  bold?: boolean;
  muted?: boolean;
  onDark?: boolean;
}) {
  if (!value) {
    return <td className={cn("px-2 py-2 text-right font-mono text-[12px] tabular-nums", onDark ? "text-white/40" : "text-ink-300")}>—</td>;
  }
  return (
    <td className={cn(
      "px-2 py-2 text-right font-mono text-[12px] tabular-nums whitespace-nowrap",
      bold && "font-bold",
      onDark ? "text-white" : muted ? "text-ink-500" : "text-ink-900",
    )}>
      {formatBRL(value)}
    </td>
  );
}

function CellMes({
  value, estourou, onDark, bold,
}: {
  value: number;
  estourou: boolean;
  onDark?: boolean;
  bold?: boolean;
}) {
  if (!value) {
    return <td className={cn("px-2 py-2 text-right font-mono text-[12px] tabular-nums", onDark ? "text-white/40" : "text-ink-300")}>—</td>;
  }
  return (
    <td className={cn(
      "px-2 py-2 text-right font-mono text-[12px] tabular-nums whitespace-nowrap",
      bold && "font-bold",
      estourou
        ? "text-coral-600"
        : onDark ? "text-white" : "text-ink-700",
    )}>
      {formatBRL(value)}{estourou && " ▲"}
    </td>
  );
}

function VariacaoCard({
  variacao,
}: {
  variacao: { nome: string; pctUsoMedio: number; variacao: number; status: "ok" | "warn" | "bad" }[];
}) {
  return (
    <Card>
      <h2 className="font-display font-bold text-lg text-ink-900 mb-4">Variação vs orçamento</h2>
      {variacao.length === 0 ? (
        <div className="text-sm text-ink-400 py-6 text-center">Sem dados de orçamento.</div>
      ) : (
        <div className="space-y-3">
          {variacao.map((v) => {
            const sinal = v.variacao > 0 ? "+" : "";
            const corBar =
              v.status === "bad" ? "bg-coral-500"
              : v.status === "warn" ? "bg-coral-300"
              : "bg-ink-700";
            const corTxt =
              v.status === "bad" ? "text-coral-600"
              : v.status === "warn" ? "text-coral-500"
              : "text-ink-700";
            return (
              <div key={v.nome} className="grid grid-cols-[100px_1fr_60px] gap-3 items-center">
                <span className="text-[12px] font-medium text-ink-900 truncate">{v.nome}</span>
                <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", corBar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, v.pctUsoMedio)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className={cn("text-[12px] font-mono font-semibold text-right tabular-nums", corTxt)}>
                  {sinal}{v.variacao}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function EvolucaoCard({ saldoPorMes }: { saldoPorMes: SaldoMes[] }) {
  const data = saldoPorMes.map((sm) => ({
    mes: monthLabel(sm.mes),
    Receita: sm.receitas / 100,
    Despesa: sm.despesas / 100,
  }));

  return (
    <Card>
      <h2 className="font-display font-bold text-lg text-ink-900 mb-3">Evolução — Receita vs Despesa</h2>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#EDE7DE" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #EDE7DE", boxShadow: "0 4px 16px rgba(15,15,15,0.06)" }}
              formatter={(v: number) => formatBRL(v * 100)}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#5C5C5C" }} />
            <Line type="monotone" dataKey="Receita" stroke="#FF6B47" strokeWidth={2.5} dot={{ r: 3, fill: "#FF6B47", strokeWidth: 0 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Despesa" stroke="#1A1A1A" strokeWidth={2.5} dot={{ r: 3, fill: "#1A1A1A", strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}
