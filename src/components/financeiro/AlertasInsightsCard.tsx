"use client";
import { motion } from "framer-motion";
import {
  AlertCircle, AlertTriangle, Lightbulb, ArrowUp, PiggyBank, Lock, LifeBuoy, PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

type Status = "verde" | "amarelo" | "vermelho";

interface EstouradaItem {
  categoriaId: string;
  nome: string;
  cor: string;
  icone?: string;
  realizado: number;
  limite: number;
  percentual: number;
}

interface IndicadoresShape {
  poupancaPercent: { valor: number; status: Status };
  comprometimentoFixo: { valor: number; status: Status };
  diasReserva: { valor: number; status: Status };
  mesesAteReserva: { valor: number | null; status: Status; aporteSugerido: number; semReserva: boolean };
}

interface Props {
  estouradas?: EstouradaItem[];
  indicadores?: IndicadoresShape;
}

type Severity = "critico" | "atencao" | "dica";

interface Alerta {
  id: string;
  severity: Severity;
  title: string;
  desc: string;
  badge?: string;
  icon: LucideIcon;
}

/**
 * Card de Alertas e Insights — agrega estouros de categorias e indicadores
 * de saúde com diagnóstico textual e badge de impacto.
 * Substitui o card antigo "Categorias que estouraram" com versão mais rica.
 */
export function AlertasInsightsCard({ estouradas, indicadores }: Props) {
  if (!estouradas || !indicadores) {
    return (
      <Card>
        <Header />
        <div className="h-32" />
      </Card>
    );
  }

  const alertas = construirAlertas(estouradas, indicadores);

  if (alertas.length === 0) {
    return (
      <Card>
        <Header />
        <div className="flex flex-col items-center text-center py-8 gap-2">
          <div className="w-12 h-12 rounded-full bg-coral-500 text-white flex items-center justify-center shadow-pop">
            <PartyPopper size={20} />
          </div>
          <p className="font-display font-bold text-base text-ink-900">Tudo sob controle</p>
          <p className="text-xs text-ink-400 max-w-xs">
            Nenhum alerta crítico neste mês. Continue cuidando bem das suas finanças.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Header count={alertas.length} />
      <ul className="space-y-2.5 mt-1">
        {alertas.map((a, i) => <AlertaItem key={a.id} a={a} index={i} />)}
      </ul>
    </Card>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
          <Lightbulb size={18} className="text-coral-500" /> Alertas e insights
        </h2>
        {count !== undefined && count > 0 && <Pill tone="coral" size="xs">{count}</Pill>}
      </div>
    </div>
  );
}

function AlertaItem({ a, index }: { a: Alerta; index: number }) {
  const Icon = a.icon;

  const containerClass =
    a.severity === "critico" ? "bg-ink-900 text-white"
    : a.severity === "atencao" ? "bg-cream-50 border border-cream-200"
    : "bg-coral-50 border border-coral-100";

  const iconBg =
    a.severity === "critico" ? "bg-coral-500 text-white"
    : a.severity === "atencao" ? "bg-white text-ink-700"
    : "bg-coral-500 text-white";

  const titleClass =
    a.severity === "critico" ? "text-white"
    : "text-ink-900";

  const descClass =
    a.severity === "critico" ? "text-white/70"
    : a.severity === "atencao" ? "text-ink-500"
    : "text-ink-500";

  const badgeTone =
    a.severity === "critico" ? "coral"
    : a.severity === "atencao" ? "dark"
    : "coral";

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn("rounded-2xl p-3 flex items-start gap-3", containerClass)}
    >
      <div className={cn("shrink-0 w-9 h-9 rounded-full flex items-center justify-center", iconBg)}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-sm", titleClass)}>{a.title}</div>
        <div className={cn("text-[11px] mt-0.5 leading-snug", descClass)}>{a.desc}</div>
      </div>
      {a.badge && (
        <Pill tone={badgeTone as "coral" | "dark"} size="xs" className="shrink-0">
          {a.badge}
        </Pill>
      )}
    </motion.li>
  );
}

function construirAlertas(estouradas: EstouradaItem[], indicadores: IndicadoresShape): Alerta[] {
  const out: Alerta[] = [];

  // Categorias estouradas (critico) - top 3
  for (const c of estouradas.slice(0, 3)) {
    const excedente = c.realizado - c.limite;
    const CatIcon = iconeDaCategoria(c.icone);
    out.push({
      id: `est-${c.categoriaId}`,
      severity: "critico",
      title: `${c.nome} estourou em ${c.percentual}%`,
      desc: `Gasto de ${formatBRL(c.realizado)} — limite era ${formatBRL(c.limite)}. Excedente de ${formatBRL(excedente)}.`,
      badge: `+${formatBRL(excedente)}`,
      icon: CatIcon,
    });
  }

  // Cobertura financeira crítica (saldo ÷ gasto diário)
  if (indicadores.diasReserva.status === "vermelho" && indicadores.diasReserva.valor < 30) {
    out.push({
      id: "reserva-baixa",
      severity: "critico",
      title: "Cobertura financeira insuficiente",
      desc: `Seu saldo cobre apenas ${indicadores.diasReserva.valor === 999 ? "muitos" : indicadores.diasReserva.valor} dia${indicadores.diasReserva.valor === 1 ? "" : "s"} de gastos — recomendado é 180 dias (6 meses).`,
      badge: "Crítico",
      icon: LifeBuoy,
    });
  } else if (indicadores.diasReserva.status === "amarelo") {
    out.push({
      id: "reserva-amarela",
      severity: "atencao",
      title: "Cobertura em construção",
      desc: `Seu saldo cobre ${indicadores.diasReserva.valor} dias de gastos. Continue economizando até atingir 180 dias.`,
      icon: LifeBuoy,
    });
  }

  // Renda comprometida alta
  if (indicadores.comprometimentoFixo.status === "vermelho") {
    out.push({
      id: "comprometimento-alto",
      severity: "critico",
      title: "Renda comprometida acima do limite",
      desc: `${formatPct(indicadores.comprometimentoFixo.valor)}% da renda está comprometida com despesas fixas. Recomendado: até 50%.`,
      badge: `${formatPct(indicadores.comprometimentoFixo.valor)}%`,
      icon: Lock,
    });
  } else if (indicadores.comprometimentoFixo.status === "amarelo") {
    out.push({
      id: "comprometimento-medio",
      severity: "atencao",
      title: "Comprometimento próximo do limite",
      desc: `${formatPct(indicadores.comprometimentoFixo.valor)}% da renda com despesas fixas. Avalie possibilidades de redução.`,
      icon: Lock,
    });
  }

  // Poupança baixa (insight)
  if (indicadores.poupancaPercent.status === "vermelho") {
    const aporte = indicadores.mesesAteReserva.aporteSugerido;
    out.push({
      id: "poupanca-baixa",
      severity: "dica",
      title: "Poupança muito abaixo da meta",
      desc: aporte > 0
        ? `Poupando ${formatPct(indicadores.poupancaPercent.valor)}% — para atingir a reserva, sugerido aporte de ${formatBRL(aporte)}/mês.`
        : `Poupando ${formatPct(indicadores.poupancaPercent.valor)}%. Meta recomendada: 20%.`,
      badge: "Ação",
      icon: PiggyBank,
    });
  } else if (indicadores.poupancaPercent.status === "amarelo") {
    out.push({
      id: "poupanca-amarela",
      severity: "atencao",
      title: "Poupança pode melhorar",
      desc: `Poupando ${formatPct(indicadores.poupancaPercent.valor)}%. Tente chegar em 20% pra acelerar suas metas.`,
      icon: PiggyBank,
    });
  }

  return out;
}

function formatPct(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}
