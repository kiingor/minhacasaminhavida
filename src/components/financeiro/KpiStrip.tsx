"use client";
import { Wallet, PiggyBank, Lock, LifeBuoy, ArrowDownRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { formatBRL } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Status = "verde" | "amarelo" | "vermelho";

interface IndicadoresShape {
  poupancaPercent: { valor: number; status: Status };
  comprometimentoFixo: { valor: number; status: Status };
  diasReserva: { valor: number; status: Status };
}

interface Props {
  saldoEfetivado: { valor: number; contasAtivas: number } | undefined;
  saldoProjetado: { valor: number } | undefined;
  indicadores: IndicadoresShape | undefined;
}

/**
 * KPI Strip — 4 indicadores chave de saúde financeira (visão gerente):
 *   1) Saldo efetivo
 *   2) Taxa de poupança
 *   3) Renda comprometida
 *   4) Reserva (em dias)
 */
export function KpiStrip({ saldoEfetivado, saldoProjetado, indicadores }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SaldoEfetivoCard saldoEfetivado={saldoEfetivado} saldoProjetado={saldoProjetado} />
      <PoupancaCard data={indicadores?.poupancaPercent} />
      <ComprometimentoCard data={indicadores?.comprometimentoFixo} />
      <ReservaCard data={indicadores?.diasReserva} />
    </div>
  );
}

function SaldoEfetivoCard({
  saldoEfetivado, saldoProjetado,
}: {
  saldoEfetivado?: { valor: number; contasAtivas: number };
  saldoProjetado?: { valor: number };
}) {
  if (!saldoEfetivado) return <Skeleton className="h-32 rounded-3xl" />;
  const sinal = saldoEfetivado.valor < 0 ? "-" : "";
  const hint = saldoProjetado
    ? `Projetado: ${saldoProjetado.valor < 0 ? "-" : ""}${formatBRL(Math.abs(saldoProjetado.valor))}`
    : `${saldoEfetivado.contasAtivas} ${saldoEfetivado.contasAtivas === 1 ? "conta" : "contas"}`;

  return (
    <KpiCard
      icon={Wallet}
      tone="dark"
      label="Saldo efetivo"
      value={<span className="font-mono">{sinal}{formatBRL(Math.abs(saldoEfetivado.valor))}</span>}
      hint={hint}
    />
  );
}

function PoupancaCard({ data }: { data?: { valor: number; status: Status } }) {
  if (!data) return <Skeleton className="h-32 rounded-3xl" />;
  const meta = 10; // %
  const faltaParaMeta = Math.max(0, meta - data.valor);
  return (
    <KpiCard
      icon={PiggyBank}
      tone={toneFromStatus(data.status)}
      label="Taxa de poupança"
      value={<span>{formatPct(data.valor)}<span className="text-xl opacity-60">%</span></span>}
      hint={
        data.status === "verde"
          ? `Acima da meta (${meta}%)`
          : `Meta: ${meta}% — faltam ${formatPct(faltaParaMeta)} p.p.`
      }
      statusDot={data.status}
    />
  );
}

function ComprometimentoCard({ data }: { data?: { valor: number; status: Status } }) {
  if (!data) return <Skeleton className="h-32 rounded-3xl" />;
  const limite = 30;
  return (
    <KpiCard
      icon={Lock}
      tone={toneFromStatus(data.status)}
      label="Renda comprometida"
      value={<span>{formatPct(data.valor)}<span className="text-xl opacity-60">%</span></span>}
      hint={
        data.valor <= limite
          ? `Dentro do limite (${limite}%)`
          : `Acima do recomendado (${limite}%)`
      }
      statusDot={data.status}
    />
  );
}

function ReservaCard({ data }: { data?: { valor: number; status: Status } }) {
  if (!data) return <Skeleton className="h-32 rounded-3xl" />;
  const display = data.valor >= 999 ? "999+" : String(data.valor);
  return (
    <KpiCard
      icon={LifeBuoy}
      tone={toneFromStatus(data.status)}
      label="Dias de cobertura"
      value={<span>{display}<span className="text-xl opacity-60 ml-1">dias</span></span>}
      hint={
        data.status === "verde"
          ? "Saldo cobre 180+ dias de gastos"
          : data.status === "amarelo"
          ? "Saldo ÷ gasto diário — meta 180 dias"
          : "Crítico — saldo cobre poucos dias"
      }
      statusDot={data.status}
    />
  );
}

interface KpiCardProps {
  icon: LucideIcon;
  tone: "white" | "dark" | "coral";
  label: string;
  value: React.ReactNode;
  hint: string;
  statusDot?: Status;
}

function KpiCard({ icon: Icon, tone, label, value, hint, statusDot }: KpiCardProps) {
  const onDark = tone === "dark" || tone === "coral";
  const toneClass =
    tone === "coral" ? "bg-coral-500 text-white shadow-pop"
    : tone === "dark" ? "bg-ink-900 text-white"
    : "bg-white text-ink-900 shadow-soft";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn("rounded-3xl p-5 transition-shadow", toneClass)}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          onDark ? "bg-white/10" : "bg-cream-100 text-ink-700",
        )}>
          <Icon size={15} />
        </div>
        {statusDot && <StatusDot status={statusDot} onDark={onDark} />}
      </div>

      <div className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.12em]",
        onDark ? "text-white/70" : "text-ink-400",
      )}>
        {label}
      </div>

      <div className={cn(
        "font-display font-bold text-2xl md:text-3xl mt-1 leading-tight",
        onDark ? "text-white" : "text-ink-900",
      )}>
        {value}
      </div>

      <div className={cn(
        "mt-2 text-[11px] flex items-center gap-1.5",
        onDark ? "text-white/65" : "text-ink-400",
      )}>
        {hint}
      </div>
    </motion.div>
  );
}

function StatusDot({ status, onDark }: { status: Status; onDark: boolean }) {
  const colorClass =
    status === "verde" ? (onDark ? "bg-white/80" : "bg-ink-700")
    : status === "amarelo" ? "bg-coral-300"
    : "bg-coral-500";
  return <span className={cn("w-2 h-2 rounded-full shrink-0", colorClass)} aria-hidden />;
}

function toneFromStatus(status: Status): "white" | "dark" | "coral" {
  // Verde → white (silencioso/bom), amarelo → white (atenção sutil), vermelho → coral (urgente)
  if (status === "vermelho") return "coral";
  return "white";
}

function formatPct(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}
