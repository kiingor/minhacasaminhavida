"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Coffee,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
  PiggyBank,
  ShieldCheck,
  Lock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PartyPopper,
  Target,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { currentMonth, monthLabelLong } from "@/lib/monthUtils";
import { formatBRL } from "@/lib/formatters";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type VitoriaTipo =
  | "categoria_melhorou"
  | "meta_atingida"
  | "divida_quitada"
  | "reserva_completa";

type AtencaoTipo = "categoria_estourada" | "objetivo_atrasado" | "saude_baixa";

export default function MoneyDatePage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());

  const pauta = useQuery(
    api.financeiro.moneyDate.gerar,
    token ? { sessionToken: token, mes } : "skip"
  );

  function imprimir() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl mx-auto print:max-w-none print:space-y-4"
    >
      {/* Header (escondido na impressao) */}
      <motion.div
        variants={item}
        className="flex flex-wrap items-center justify-between gap-3 print:hidden"
      >
        <div>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
          >
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Coffee size={28} className="text-amber-600" />
            Money Date
          </h1>
          <p className="text-slate-500">Pauta de reunião mensal do casal</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector mes={mes} onChange={setMes} />
          <Button onClick={imprimir} variant="outline" className="text-sm">
            <Printer size={16} /> Imprimir / Salvar PDF
          </Button>
        </div>
      </motion.div>

      {/* Header de impressao (so aparece no print) */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Coffee size={22} className="text-amber-600" />
              Money Date
            </h1>
            <p className="text-sm text-slate-500 capitalize">{monthLabelLong(mes)}</p>
          </div>
          <p className="text-xs text-slate-400">Pauta mensal · Minha Casa Minha Vida</p>
        </div>
      </div>

      {pauta === undefined ? (
        <SkeletonState />
      ) : (
        <>
          {/* HERO — Resumo */}
          <motion.section
            variants={item}
            aria-labelledby="resumo"
            className="space-y-3"
          >
            <h2
              id="resumo"
              className="text-xs uppercase tracking-wide text-slate-500 font-medium print:text-[10px]"
            >
              Resumo do mês
            </h2>
            {pauta.semComparativo && (
              <p className="text-xs text-slate-500 italic">
                Sem dados do mês anterior — primeiro mês de registros.
              </p>
            )}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 print:grid-cols-3">
              <ResumoCard
                label="Receitas"
                valor={pauta.resumo.receitas.atual}
                anterior={pauta.resumo.receitas.anterior}
                deltaPercent={pauta.resumo.receitas.deltaPercent}
                semComparativo={pauta.semComparativo}
                cor="emerald"
                deltaBom="up"
              />
              <ResumoCard
                label="Despesas"
                valor={pauta.resumo.despesas.atual}
                anterior={pauta.resumo.despesas.anterior}
                deltaPercent={pauta.resumo.despesas.deltaPercent}
                semComparativo={pauta.semComparativo}
                cor="rose"
                deltaBom="down"
              />
              <ResumoCard
                label="Saldo do mês"
                valor={pauta.resumo.saldo.atual}
                anterior={pauta.resumo.saldo.anterior}
                deltaPercent={pauta.resumo.saldo.deltaPercent}
                semComparativo={pauta.semComparativo}
                cor="indigo"
                deltaBom="up"
              />
            </div>
          </motion.section>

          {/* Saude financeira */}
          <motion.section
            variants={item}
            aria-labelledby="saude"
            className="rounded-2xl bg-white border p-4 md:p-5 shadow-sm print:shadow-none print:border print:rounded-lg print:p-3"
          >
            <h2
              id="saude"
              className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-3 flex items-center gap-2 print:text-[10px]"
            >
              <ShieldCheck size={14} className="text-emerald-500" /> Saúde
              financeira
            </h2>
            <div className="grid gap-3 grid-cols-3">
              <SaudeIndicador
                icon={PiggyBank}
                label="Poupança"
                valor={`${formatPercent(pauta.indicadores.poupancaPercent)}%`}
                meta="≥ 20%"
                cor="emerald"
              />
              <SaudeIndicador
                icon={Lock}
                label="Comprometido"
                valor={`${formatPercent(pauta.indicadores.comprometimentoFixo)}%`}
                meta="≤ 50%"
                cor="indigo"
              />
              <SaudeIndicador
                icon={ShieldCheck}
                label="Dias de reserva"
                valor={
                  pauta.indicadores.diasReserva >= 999
                    ? "999+"
                    : String(pauta.indicadores.diasReserva)
                }
                meta="≥ 180"
                cor="sky"
              />
            </div>
          </motion.section>

          {/* VITORIAS */}
          <motion.section
            variants={item}
            aria-labelledby="vitorias"
            className="rounded-2xl border bg-emerald-50/50 border-emerald-100 p-4 md:p-5 print:bg-white print:rounded-lg print:p-3 print:break-inside-avoid"
          >
            <h2
              id="vitorias"
              className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2 uppercase tracking-wide print:text-xs"
            >
              <PartyPopper size={16} /> Vitórias do mês
              <span className="text-xs text-emerald-600/70 font-normal normal-case">
                ({pauta.vitorias.length})
              </span>
            </h2>
            {pauta.vitorias.length === 0 ? (
              <EstadoVazio
                tom="encorajador"
                mensagem="Ainda sem vitórias destacáveis neste mês — mas todo passo constante constrói progresso. Bora pra próxima!"
              />
            ) : (
              <ul className="space-y-2.5">
                {pauta.vitorias.map((v, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 mt-0.5">
                      <IconeVitoria tipo={v.tipo} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-emerald-900 text-sm">
                        {v.titulo}
                      </div>
                      <div className="text-xs text-emerald-800/80">
                        {v.descricao}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* ATENCOES */}
          <motion.section
            variants={item}
            aria-labelledby="atencoes"
            className="rounded-2xl border bg-amber-50/50 border-amber-100 p-4 md:p-5 print:bg-white print:rounded-lg print:p-3 print:break-inside-avoid"
          >
            <h2
              id="atencoes"
              className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2 uppercase tracking-wide print:text-xs"
            >
              <AlertTriangle size={16} /> Pontos de atenção
              <span className="text-xs text-amber-600/70 font-normal normal-case">
                ({pauta.atencoes.length})
              </span>
            </h2>
            {pauta.atencoes.length === 0 ? (
              <EstadoVazio
                tom="positivo"
                mensagem="Nenhum ponto de atenção neste mês. As contas estão sob controle!"
              />
            ) : (
              <ul className="space-y-2.5">
                {pauta.atencoes.map((a, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 mt-0.5">
                      <IconeAtencao tipo={a.tipo} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-amber-900 text-sm">
                        {a.titulo}
                      </div>
                      <div className="text-xs text-amber-800/80">
                        {a.descricao}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* DECISOES PENDENTES */}
          <motion.section
            variants={item}
            aria-labelledby="decisoes"
            className="rounded-2xl border bg-sky-50/50 border-sky-100 p-4 md:p-5 print:bg-white print:rounded-lg print:p-3 print:break-inside-avoid"
          >
            <h2
              id="decisoes"
              className="text-sm font-bold text-sky-700 mb-3 flex items-center gap-2 uppercase tracking-wide print:text-xs"
            >
              <Lightbulb size={16} /> Decisões pendentes
              <span className="text-xs text-sky-600/70 font-normal normal-case">
                ({pauta.decisoes.length})
              </span>
            </h2>
            {pauta.decisoes.length === 0 ? (
              <EstadoVazio
                tom="positivo"
                mensagem="Nenhuma decisão pendente — apenas continuem firmes no plano."
              />
            ) : (
              <ul className="space-y-3">
                {pauta.decisoes.map((d, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start bg-white rounded-lg p-3 border border-sky-100 print:border-slate-200"
                  >
                    {/* Checkbox decorativo (nao funcional - so visual pra pauta) */}
                    <span
                      aria-hidden
                      className="shrink-0 mt-0.5 w-4 h-4 rounded border-2 border-sky-300 print:border-slate-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 text-sm">
                        {d.titulo}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {d.sugestao}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* Rodape impressao */}
          <div className="hidden print:block text-center text-[10px] text-slate-400 pt-3 mt-4 border-t">
            Gerado em {new Date().toLocaleString("pt-BR")} · Minha Casa Minha
            Vida
          </div>
        </>
      )}

    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------------------------

function SkeletonState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

interface ResumoCardProps {
  label: string;
  valor: number;
  anterior: number;
  deltaPercent: number;
  semComparativo: boolean;
  cor: "emerald" | "rose" | "indigo";
  deltaBom: "up" | "down"; // up = subir e bom (receita), down = descer e bom (despesa)
}

function ResumoCard({
  label,
  valor,
  anterior,
  deltaPercent,
  semComparativo,
  cor,
  deltaBom,
}: ResumoCardProps) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-700",
      valor: "text-emerald-900",
    },
    rose: {
      bg: "bg-rose-50",
      border: "border-rose-100",
      text: "text-rose-700",
      valor: "text-rose-900",
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      text: "text-indigo-700",
      valor: "text-indigo-900",
    },
  };
  const c = colorMap[cor];

  // Delta "positivo" = movimento favoravel
  // Receita: up bom (verde), down ruim (rosa)
  // Despesa: down bom (verde), up ruim (rosa)
  let DeltaIcon = Minus;
  let deltaColor = "text-slate-400";
  if (!semComparativo) {
    if (deltaPercent > 0) {
      DeltaIcon = TrendingUp;
      deltaColor = deltaBom === "up" ? "text-emerald-600" : "text-rose-600";
    } else if (deltaPercent < 0) {
      DeltaIcon = TrendingDown;
      deltaColor = deltaBom === "down" ? "text-emerald-600" : "text-rose-600";
    }
  }

  return (
    <div
      className={`rounded-2xl ${c.bg} ${c.border} border p-4 shadow-sm print:shadow-none print:rounded-lg print:p-3`}
    >
      <div
        className={`text-xs uppercase tracking-wide font-medium ${c.text} print:text-[10px]`}
      >
        {label}
      </div>
      <div
        className={`font-mono font-extrabold text-2xl md:text-3xl ${c.valor} mt-1 print:text-xl`}
      >
        {formatBRL(valor)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {semComparativo ? (
          <span className="text-slate-500">Sem comparativo</span>
        ) : (
          <>
            <DeltaIcon size={14} className={deltaColor} />
            <span className={`font-semibold ${deltaColor}`}>
              {deltaPercent > 0 ? "+" : ""}
              {formatPercent(deltaPercent)}%
            </span>
            <span className="text-slate-500 truncate">
              vs {formatBRL(anterior)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function SaudeIndicador({
  icon: Icon,
  label,
  valor,
  meta,
  cor,
}: {
  icon: typeof PiggyBank;
  label: string;
  valor: string;
  meta: string;
  cor: "emerald" | "indigo" | "sky";
}) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-50",
    indigo: "text-indigo-600 bg-indigo-50",
    sky: "text-sky-600 bg-sky-50",
  };
  return (
    <div className="rounded-xl border bg-white p-3 print:rounded-lg print:p-2">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[cor]}`}
        >
          <Icon size={14} />
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide print:text-[10px]">
          {label}
        </span>
      </div>
      <div className="font-mono font-extrabold text-xl text-slate-900 print:text-lg">
        {valor}
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5">Meta {meta}</div>
    </div>
  );
}

function IconeVitoria({ tipo }: { tipo: VitoriaTipo }) {
  switch (tipo) {
    case "categoria_melhorou":
      return <TrendingDown size={16} className="text-emerald-600" />;
    case "meta_atingida":
      return <Target size={16} className="text-emerald-600" />;
    case "divida_quitada":
      return <CheckCircle2 size={16} className="text-emerald-600" />;
    case "reserva_completa":
      return <ShieldCheck size={16} className="text-emerald-600" />;
  }
}

function IconeAtencao({ tipo }: { tipo: AtencaoTipo }) {
  switch (tipo) {
    case "categoria_estourada":
      return <Receipt size={16} className="text-amber-600" />;
    case "objetivo_atrasado":
      return <Target size={16} className="text-amber-600" />;
    case "saude_baixa":
      return <AlertTriangle size={16} className="text-amber-600" />;
  }
}

function EstadoVazio({
  tom,
  mensagem,
}: {
  tom: "positivo" | "encorajador";
  mensagem: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Sparkles
        size={14}
        className={tom === "positivo" ? "text-emerald-500" : "text-amber-500"}
      />
      <span>{mensagem}</span>
    </div>
  );
}

function formatPercent(valor: number): string {
  if (Math.abs(valor - Math.round(valor)) < 0.05) return String(Math.round(valor));
  return valor.toFixed(1).replace(".", ",");
}
