"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Coffee, Printer, TrendingUp, TrendingDown, Minus,
  PiggyBank, ShieldCheck, Lock, Sparkles, AlertTriangle, CheckCircle2,
  Lightbulb, PartyPopper, Target, Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { currentMonth, monthLabelLong } from "@/lib/monthUtils";
import { formatBRL } from "@/lib/formatters";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

type VitoriaTipo = "categoria_melhorou" | "meta_atingida" | "divida_quitada" | "reserva_completa";
type AtencaoTipo = "categoria_estourada" | "objetivo_atrasado" | "saude_baixa";

export default function MoneyDatePage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());

  const pauta = useQuery(api.financeiro.moneyDate.gerar, token ? { sessionToken: token, mes } : "skip");

  function imprimir() { if (typeof window !== "undefined") window.print(); }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="py-6 md:py-10 space-y-6 max-w-4xl mx-auto print:max-w-none print:space-y-4"
    >
      {/* Header (escondido na impressão) */}
      <motion.div variants={item} className="print:hidden">
        <PageHeader
          backHref="/financeiro"
          backLabel="Voltar para Finanças"
          title="Money Date"
          subtitle="Reunião financeira do casal"
          actions={
            <>
              <MonthSelector mes={mes} onChange={setMes} />
              <Button onClick={imprimir} variant="outline" className="text-sm">
                <Printer size={16} /> Imprimir / Salvar PDF
              </Button>
            </>
          }
        />
      </motion.div>

      {/* Header de impressão */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2 text-ink-900">
              <Coffee size={22} className="text-coral-500" />
              Money Date
            </h1>
            <p className="text-sm text-ink-500 capitalize">{monthLabelLong(mes)}</p>
          </div>
          <p className="text-xs text-ink-400">Pauta mensal · Minha Casa Minha Vida</p>
        </div>
      </div>

      {pauta === undefined ? (
        <SkeletonState />
      ) : (
        <>
          {/* HERO — Resumo */}
          <motion.section variants={item} aria-labelledby="resumo" className="space-y-3">
            <h2 id="resumo" className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold print:text-[9px]">
              Resumo do mês
            </h2>
            {pauta.semComparativo && (
              <p className="text-xs text-ink-400 italic">Sem dados do mês anterior — primeiro mês de registros.</p>
            )}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 print:grid-cols-3">
              <ResumoCard label="Receitas" valor={pauta.resumo.receitas.atual} anterior={pauta.resumo.receitas.anterior} deltaPercent={pauta.resumo.receitas.deltaPercent} semComparativo={pauta.semComparativo} tone="coral" deltaBom="up" />
              <ResumoCard label="Despesas" valor={pauta.resumo.despesas.atual} anterior={pauta.resumo.despesas.anterior} deltaPercent={pauta.resumo.despesas.deltaPercent} semComparativo={pauta.semComparativo} tone="dark"  deltaBom="down" sign="-" />
              <ResumoCard label="Saldo do mês" valor={pauta.resumo.saldo.atual} anterior={pauta.resumo.saldo.anterior} deltaPercent={pauta.resumo.saldo.deltaPercent} semComparativo={pauta.semComparativo} tone="white" deltaBom="up" />
            </div>
          </motion.section>

          {/* Saúde financeira */}
          <motion.section variants={item} aria-labelledby="saude">
            <Card padding="md" className="print:shadow-none print:p-3">
              <h2 id="saude" className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mb-4 flex items-center gap-2 print:text-[9px]">
                <ShieldCheck size={14} className="text-coral-500" /> Saúde financeira
              </h2>
              <div className="grid gap-3 grid-cols-3">
                <SaudeIndicador icon={PiggyBank}   label="Poupança"      valor={`${formatPercent(pauta.indicadores.poupancaPercent)}%`} meta="≥ 20%" />
                <SaudeIndicador icon={Lock}        label="Comprometido"  valor={`${formatPercent(pauta.indicadores.comprometimentoFixo)}%`} meta="≤ 50%" />
                <SaudeIndicador icon={ShieldCheck} label="Dias reserva"  valor={pauta.indicadores.diasReserva >= 999 ? "999+" : String(pauta.indicadores.diasReserva)} meta="≥ 180" />
              </div>
            </Card>
          </motion.section>

          {/* VITÓRIAS */}
          <motion.section variants={item} aria-labelledby="vitorias">
            <Card tone="cream" className="print:bg-white print:break-inside-avoid">
              <h2 id="vitorias" className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2 uppercase tracking-[0.08em] print:text-xs">
                <PartyPopper size={16} className="text-coral-500" />
                Vitórias do mês
                <Pill tone="coral" size="xs">{pauta.vitorias.length}</Pill>
              </h2>
              {pauta.vitorias.length === 0 ? (
                <EstadoVazio mensagem="Ainda sem vitórias destacáveis neste mês — mas todo passo constante constrói progresso. Bora pra próxima!" />
              ) : (
                <ul className="space-y-3">
                  {pauta.vitorias.map((v, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-coral-500 text-white inline-flex items-center justify-center">
                        <IconeVitoria tipo={v.tipo} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-900 text-sm">{v.titulo}</div>
                        <div className="text-xs text-ink-500">{v.descricao}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.section>

          {/* ATENÇÕES */}
          <motion.section variants={item} aria-labelledby="atencoes">
            <Card tone="dark" className="print:bg-white print:text-ink-900 print:break-inside-avoid">
              <h2 id="atencoes" className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-[0.08em] print:text-xs">
                <AlertTriangle size={16} className="text-coral-400" />
                Pontos de atenção
                <Pill tone="coral" size="xs">{pauta.atencoes.length}</Pill>
              </h2>
              {pauta.atencoes.length === 0 ? (
                <EstadoVazio mensagem="Nenhum ponto de atenção neste mês. As contas estão sob controle!" onDark />
              ) : (
                <ul className="space-y-3">
                  {pauta.atencoes.map((a, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-white/15 text-white inline-flex items-center justify-center">
                        <IconeAtencao tipo={a.tipo} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white text-sm">{a.titulo}</div>
                        <div className="text-xs text-white/65">{a.descricao}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.section>

          {/* DECISÕES */}
          <motion.section variants={item} aria-labelledby="decisoes">
            <Card className="print:break-inside-avoid">
              <h2 id="decisoes" className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2 uppercase tracking-[0.08em] print:text-xs">
                <Lightbulb size={16} className="text-coral-500" />
                Decisões pendentes
                <Pill tone="coral" size="xs">{pauta.decisoes.length}</Pill>
              </h2>
              {pauta.decisoes.length === 0 ? (
                <EstadoVazio mensagem="Nenhuma decisão pendente — apenas continuem firmes no plano." />
              ) : (
                <ul className="space-y-3">
                  {pauta.decisoes.map((d, i) => (
                    <li
                      key={i}
                      className="flex gap-3 items-start bg-cream-50 rounded-2xl p-3 border border-cream-200"
                    >
                      <span aria-hidden className="shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-ink-300" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-900 text-sm">{d.titulo}</div>
                        <div className="text-xs text-ink-500 mt-0.5">{d.sugestao}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.section>

          <div className="hidden print:block text-center text-[10px] text-ink-400 pt-3 mt-4 border-t border-cream-200">
            Gerado em {new Date().toLocaleString("pt-BR")} · Minha Casa Minha Vida
          </div>
        </>
      )}
    </motion.div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
      </div>
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}

interface ResumoCardProps {
  label: string;
  valor: number;
  anterior: number;
  deltaPercent: number;
  semComparativo: boolean;
  tone: "coral" | "dark" | "white";
  deltaBom: "up" | "down";
  sign?: "-" | "+";
}

function ResumoCard({ label, valor, anterior, deltaPercent, semComparativo, tone, deltaBom, sign }: ResumoCardProps) {
  let DeltaIcon = Minus;
  if (!semComparativo) {
    if (deltaPercent > 0) DeltaIcon = TrendingUp;
    else if (deltaPercent < 0) DeltaIcon = TrendingDown;
  }
  const onDark = tone === "dark" || tone === "coral";
  const toneClass =
    tone === "coral" ? "bg-coral-500 text-white shadow-pop"
    : tone === "dark" ? "bg-ink-900 text-white"
    : "bg-white text-ink-900 shadow-soft";

  return (
    <div className={`rounded-3xl p-5 ${toneClass} print:shadow-none print:rounded-lg print:p-3`}>
      <div className={`text-[10px] uppercase tracking-[0.12em] font-semibold ${onDark ? "text-white/70" : "text-ink-400"}`}>
        {label}
      </div>
      <div className={`font-mono font-extrabold text-2xl md:text-3xl mt-1 ${onDark ? "text-white" : "text-ink-900"} print:text-xl`}>
        {sign ?? ""}{formatBRL(Math.abs(valor))}
      </div>
      <div className={`mt-2 flex items-center gap-2 text-xs ${onDark ? "text-white/70" : "text-ink-400"}`}>
        {semComparativo ? (
          <span>Sem comparativo</span>
        ) : (
          <>
            <DeltaIcon size={13} />
            <span className="font-semibold">{deltaPercent > 0 ? "+" : ""}{formatPercent(deltaPercent)}%</span>
            <span className="truncate opacity-75">vs {formatBRL(anterior)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function SaudeIndicador({
  icon: Icon, label, valor, meta,
}: {
  icon: typeof PiggyBank;
  label: string;
  valor: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl bg-cream-50 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-full bg-white text-ink-700 inline-flex items-center justify-center">
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="font-mono font-extrabold text-xl text-ink-900">{valor}</div>
      <div className="text-[10px] text-ink-400 mt-0.5">Meta {meta}</div>
    </div>
  );
}

function IconeVitoria({ tipo }: { tipo: VitoriaTipo }) {
  switch (tipo) {
    case "categoria_melhorou": return <TrendingDown size={16} />;
    case "meta_atingida":      return <Target size={16} />;
    case "divida_quitada":     return <CheckCircle2 size={16} />;
    case "reserva_completa":   return <ShieldCheck size={16} />;
  }
}

function IconeAtencao({ tipo }: { tipo: AtencaoTipo }) {
  switch (tipo) {
    case "categoria_estourada": return <Receipt size={16} />;
    case "objetivo_atrasado":   return <Target size={16} />;
    case "saude_baixa":         return <AlertTriangle size={16} />;
  }
}

function EstadoVazio({ mensagem, onDark }: { mensagem: string; onDark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${onDark ? "text-white/75" : "text-ink-500"}`}>
      <Sparkles size={14} className={onDark ? "text-coral-300" : "text-coral-500"} />
      <span>{mensagem}</span>
    </div>
  );
}

function formatPercent(valor: number): string {
  if (Math.abs(valor - Math.round(valor)) < 0.05) return String(Math.round(valor));
  return valor.toFixed(1).replace(".", ",");
}
