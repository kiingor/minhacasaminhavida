"use client";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Status = "verde" | "amarelo" | "vermelho";

interface IndicadoresShape {
  poupancaPercent: { valor: number; status: Status };
  comprometimentoFixo: { valor: number; status: Status };
  diasReserva: { valor: number; status: Status };
}

interface ProgressoShape {
  contasPagas: number;
  totalContas: number;
  percentual: number;
}

interface Props {
  indicadores?: IndicadoresShape;
  progresso?: ProgressoShape;
}

/**
 * Score de saúde financeira (0-100) — composto por 4 fatores:
 *   Poupança · Comprometimento · Reserva · Contas pagas
 * Cada fator vale até 25 pontos, dependendo do status.
 */
export function ScoreSaudeCard({ indicadores, progresso }: Props) {
  if (!indicadores) return <Skeleton className="h-[320px] rounded-3xl" />;

  const fatores = calcularFatores(indicadores, progresso);
  const score = fatores.reduce((s, f) => s + f.pontos, 0);
  const classificacao = classificar(score);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
          <Activity size={18} className="text-coral-500" /> Score de saúde
        </h2>
      </div>

      <div className="flex flex-col items-center">
        <ScoreRing score={score} />
        <div className="text-center -mt-[100px] mb-12 pointer-events-none">
          <div className="font-display font-extrabold text-4xl text-ink-900 leading-none tabular-nums">
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-ink-400 mt-1">
            de 100
          </div>
          <div className={cn("text-xs font-semibold mt-1.5", classificacao.color)}>
            {classificacao.label}
          </div>
        </div>
      </div>

      <ul className="space-y-2 mt-2">
        {fatores.map((f) => (
          <li key={f.nome} className="flex items-center gap-3 text-sm">
            <span className={cn("w-2 h-2 rounded-full shrink-0", dotClassFromStatus(f.status))} />
            <span className="flex-1 text-ink-700">{f.nome}</span>
            <span className={cn("font-mono text-xs font-semibold tabular-nums", textClassFromStatus(f.status))}>
              {f.display}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "var(--ink-700, #262626)"
    : score >= 50 ? "var(--coral-400, #FF8965)"
    : "var(--coral-500, #FF6B47)";

  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#EDE7DE"
        strokeWidth={stroke}
        fill="none"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}

interface Fator {
  nome: string;
  pontos: number;
  status: Status;
  display: string;
}

function calcularFatores(ind: IndicadoresShape, prog?: ProgressoShape): Fator[] {
  const fatores: Fator[] = [
    {
      nome: "Poupança",
      pontos: pontosPorStatus(ind.poupancaPercent.status),
      status: ind.poupancaPercent.status,
      display: `${formatPct(ind.poupancaPercent.valor)}%`,
    },
    {
      nome: "Comprometimento",
      pontos: pontosPorStatus(ind.comprometimentoFixo.status),
      status: ind.comprometimentoFixo.status,
      display: `${formatPct(ind.comprometimentoFixo.valor)}%`,
    },
    {
      nome: "Cobertura",
      pontos: pontosPorStatus(ind.diasReserva.status),
      status: ind.diasReserva.status,
      display: ind.diasReserva.valor >= 999 ? "999+ dias" : `${ind.diasReserva.valor} dias`,
    },
  ];

  // 4o fator: contas pagas (se houver dados)
  if (prog && prog.totalContas > 0) {
    const status: Status =
      prog.percentual >= 90 ? "verde"
      : prog.percentual >= 50 ? "amarelo"
      : "vermelho";
    fatores.push({
      nome: "Contas pagas",
      pontos: pontosPorStatus(status),
      status,
      display: `${prog.contasPagas}/${prog.totalContas}`,
    });
  } else {
    // Sem contas no mês — fator neutro (verde por padrão)
    fatores.push({
      nome: "Contas pagas",
      pontos: 25,
      status: "verde",
      display: "—",
    });
  }

  return fatores;
}

function pontosPorStatus(s: Status): number {
  if (s === "verde") return 25;
  if (s === "amarelo") return 15;
  return 5;
}

function classificar(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excelente", color: "text-ink-700" };
  if (score >= 60) return { label: "Boa", color: "text-ink-700" };
  if (score >= 40) return { label: "Atenção", color: "text-coral-600" };
  return { label: "Crítica", color: "text-coral-600" };
}

function dotClassFromStatus(s: Status): string {
  if (s === "verde") return "bg-ink-700";
  if (s === "amarelo") return "bg-coral-300";
  return "bg-coral-500";
}

function textClassFromStatus(s: Status): string {
  if (s === "verde") return "text-ink-900";
  if (s === "amarelo") return "text-ink-700";
  return "text-coral-600";
}

function formatPct(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}
