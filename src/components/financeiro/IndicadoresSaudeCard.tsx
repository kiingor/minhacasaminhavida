"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Lock,
  ShieldCheck,
  CalendarClock,
  Info,
  type LucideIcon,
} from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { TermoTooltip } from "@/components/educacao/TermoTooltip";

type Status = "verde" | "amarelo" | "vermelho";

interface PoupancaInfo {
  valor: number;
  status: Status;
  numerador: number;
  denominador: number;
}
interface ComprometimentoInfo {
  valor: number;
  status: Status;
  numerador: number;
  denominador: number;
}
interface DiasReservaInfo {
  valor: number;
  status: Status;
  saldoTotal: number;
  despesaDiaria: number;
}
interface MesesAteReservaInfo {
  valor: number | null;
  status: Status;
  restante: number;
  aporteSugerido: number;
  semReserva: boolean;
}

export interface IndicadoresSaudeData {
  poupancaPercent: PoupancaInfo;
  comprometimentoFixo: ComprometimentoInfo;
  diasReserva: DiasReservaInfo;
  mesesAteReserva: MesesAteReservaInfo;
}

interface Props {
  data: IndicadoresSaudeData | undefined;
}

const statusStyles: Record<Status, { text: string; bg: string; border: string; iconBg: string }> = {
  verde: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  amarelo: {
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100 text-amber-600",
  },
  vermelho: {
    text: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconBg: "bg-rose-100 text-rose-600",
  },
};

type DetalheKey = "poupanca" | "comprometido" | "diasReserva" | "mesesReserva" | null;

export function IndicadoresSaudeCard({ data }: Props) {
  const [detalhe, setDetalhe] = useState<DetalheKey>(null);

  if (!data) {
    return (
      <section
        aria-labelledby="indicadores-saude"
        className="rounded-2xl bg-white border p-3 md:p-4 shadow-sm"
      >
        <h2
          id="indicadores-saude"
          className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-3"
        >
          Indicadores de Saúde
        </h2>
        <div className="grid gap-2 md:gap-3 grid-cols-2 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="indicadores-saude"
      className="rounded-2xl bg-white border p-3 md:p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h2
          id="indicadores-saude"
          className="text-xs uppercase tracking-wide text-slate-500 font-medium"
        >
          Indicadores de Saúde
        </h2>
      </div>

      <div className="grid gap-2 md:gap-3 grid-cols-2 sm:grid-cols-4">
        <IndicadorCell
          icon={PiggyBank}
          label="Poupança"
          status={data.poupancaPercent.status}
          valor={formatPercent(data.poupancaPercent.valor)}
          sufixo="%"
          tooltipShort={tooltipPoupanca(data.poupancaPercent)}
          onOpenDetalhe={() => setDetalhe("poupanca")}
        />
        <IndicadorCell
          icon={Lock}
          label="Comprometido"
          status={data.comprometimentoFixo.status}
          valor={formatPercent(data.comprometimentoFixo.valor)}
          sufixo="%"
          tooltipShort={tooltipComprometido(data.comprometimentoFixo)}
          onOpenDetalhe={() => setDetalhe("comprometido")}
        />
        <IndicadorCell
          icon={ShieldCheck}
          label="Dias de reserva"
          status={data.diasReserva.status}
          valor={
            data.diasReserva.valor >= 999
              ? "999+"
              : String(data.diasReserva.valor)
          }
          sufixo="dias"
          tooltipShort={tooltipDiasReserva(data.diasReserva)}
          onOpenDetalhe={() => setDetalhe("diasReserva")}
        />
        <IndicadorCell
          icon={CalendarClock}
          label="Meta reserva"
          status={data.mesesAteReserva.status}
          valor={
            data.mesesAteReserva.semReserva
              ? "—"
              : data.mesesAteReserva.valor === null
              ? "—"
              : String(data.mesesAteReserva.valor)
          }
          sufixo={data.mesesAteReserva.semReserva ? "Sem reserva" : "meses"}
          tooltipShort={tooltipMesesReserva(data.mesesAteReserva)}
          onOpenDetalhe={() => setDetalhe("mesesReserva")}
        />
      </div>

      <Dialog
        open={detalhe !== null}
        onClose={() => setDetalhe(null)}
        title={detalheTitulo(detalhe)}
        className="max-w-md"
      >
        {detalhe === "poupanca" && <DetalhePoupanca info={data.poupancaPercent} />}
        {detalhe === "comprometido" && (
          <DetalheComprometido info={data.comprometimentoFixo} />
        )}
        {detalhe === "diasReserva" && (
          <DetalheDiasReserva info={data.diasReserva} />
        )}
        {detalhe === "mesesReserva" && (
          <DetalheMesesReserva info={data.mesesAteReserva} />
        )}
      </Dialog>
    </section>
  );
}

function IndicadorCell({
  icon: Icon,
  label,
  status,
  valor,
  sufixo,
  tooltipShort,
  onOpenDetalhe,
}: {
  icon: LucideIcon;
  label: string;
  status: Status;
  valor: string;
  sufixo: string;
  tooltipShort: string;
  onOpenDetalhe: () => void;
}) {
  const styles = statusStyles[status];
  return (
    <motion.button
      type="button"
      onClick={onOpenDetalhe}
      title={tooltipShort}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`text-left rounded-xl border ${styles.border} ${styles.bg} p-2.5 md:p-3 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all`}
      aria-label={`${label}: ${valor} ${sufixo}. Toque para detalhes.`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${styles.iconBg} shrink-0`}
        >
          <Icon size={14} />
        </div>
        <Info size={12} className="text-slate-400 shrink-0" />
      </div>
      <div className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
        {label}
      </div>
      <div className={`font-mono font-extrabold text-xl md:text-2xl ${styles.text} leading-tight`}>
        {valor}
        <span className="text-xs font-semibold ml-1 align-baseline">{sufixo === "%" ? "%" : ""}</span>
      </div>
      {sufixo !== "%" && (
        <div className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate">{sufixo}</div>
      )}
    </motion.button>
  );
}

function formatPercent(valor: number): string {
  // Mostra inteiro se nao tiver decimal relevante.
  if (Math.abs(valor - Math.round(valor)) < 0.05) return String(Math.round(valor));
  return valor.toFixed(1).replace(".", ",");
}

// ---- Tooltips curtos (title="..." no botao) ----
function tooltipPoupanca(info: PoupancaInfo): string {
  if (info.denominador <= 0) {
    return "Sem receitas recebidas no mês para calcular.";
  }
  return `(Receita - Despesa) ÷ Receita = ${formatBRL(info.numerador)} ÷ ${formatBRL(info.denominador)}. Verde ≥20%, amarelo 10-19%, vermelho <10%.`;
}
function tooltipComprometido(info: ComprometimentoInfo): string {
  if (info.denominador <= 0) {
    return "Sem receitas recebidas no mês para calcular.";
  }
  return `Despesa fixa ÷ Receita = ${formatBRL(info.numerador)} ÷ ${formatBRL(info.denominador)}. Verde ≤50%, amarelo 51-70%, vermelho >70%.`;
}
function tooltipDiasReserva(info: DiasReservaInfo): string {
  if (info.despesaDiaria <= 0) {
    return "Sem despesas históricas para calcular. Considerado saudável.";
  }
  return `(Saldo + aplicações) ÷ despesa diária. Saldo: ${formatBRL(info.saldoTotal)}, despesa/dia: ${formatBRL(info.despesaDiaria)}. Verde ≥180, amarelo 90-179, vermelho <90.`;
}
function tooltipMesesReserva(info: MesesAteReservaInfo): string {
  if (info.semReserva) {
    return "Você ainda não criou uma reserva de emergência. Crie em Metas para ver este indicador.";
  }
  if (info.valor === 0) {
    return "Reserva já completa. Parabéns!";
  }
  return `(Meta - Acumulado) ÷ aporte mensal. Restante: ${formatBRL(info.restante)}, aporte/mês: ${formatBRL(info.aporteSugerido)}. Verde ≤12, amarelo 13-24, vermelho >24.`;
}

// ---- Dialogs de detalhe ----
function detalheTitulo(key: DetalheKey): string {
  switch (key) {
    case "poupanca":
      return "% de poupança do mês";
    case "comprometido":
      return "% comprometido com fixos";
    case "diasReserva":
      return "Dias de reserva";
    case "mesesReserva":
      return "Meses até completar a reserva";
    default:
      return "";
  }
}

function StatusPill({ status }: { status: Status }) {
  const s = statusStyles[status];
  const label =
    status === "verde" ? "Saudável" : status === "amarelo" ? "Atenção" : "Crítico";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
    >
      {label}
    </span>
  );
}

function DetalhePoupanca({ info }: { info: PoupancaInfo }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Status</span>
        <StatusPill status={info.status} />
      </div>
      <div className="rounded-lg border bg-slate-50 p-3 space-y-1.5">
        <Linha label="Receita recebida" valor={formatBRL(info.denominador)} />
        <Linha
          label="− Despesa paga"
          valor={formatBRL(info.denominador - info.numerador)}
        />
        <div className="border-t pt-1.5 mt-1.5">
          <Linha label="= Sobra (poupança)" valor={formatBRL(info.numerador)} destaque />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Fórmula: <code>(Receita − Despesa) ÷ Receita</code>. Faixas: ≥20% verde,
        10–19% amarelo, &lt;10% vermelho.
      </p>
      {info.denominador <= 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
          Nenhuma receita recebida neste mês. Sem dados para avaliar.
        </p>
      )}
    </div>
  );
}

function DetalheComprometido({ info }: { info: ComprometimentoInfo }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Status</span>
        <StatusPill status={info.status} />
      </div>
      <div className="rounded-lg border bg-slate-50 p-3 space-y-1.5">
        <Linha label="Despesa fixa paga" valor={formatBRL(info.numerador)} />
        <Linha label="÷ Receita recebida" valor={formatBRL(info.denominador)} />
      </div>
      <p className="text-xs text-slate-500">
        Fórmula: <code>Despesa fixa ÷ Receita</code>. Faixas: ≤50% verde,
        51–70% amarelo, &gt;70% vermelho.
      </p>
      {info.denominador <= 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
          Nenhuma receita recebida neste mês. Sem dados para avaliar.
        </p>
      )}
    </div>
  );
}

function DetalheDiasReserva({ info }: { info: DiasReservaInfo }) {
  const cap = info.valor >= 999;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Status</span>
        <StatusPill status={info.status} />
      </div>
      <div className="rounded-lg border bg-slate-50 p-3 space-y-1.5">
        <Linha label="Saldo + aplicações" valor={formatBRL(info.saldoTotal)} />
        <Linha
          label="÷ Despesa diária média"
          valor={
            info.despesaDiaria > 0 ? formatBRL(info.despesaDiaria) : "Sem dados"
          }
        />
      </div>
      <p className="text-xs text-slate-500">
        Fórmula: <code>Saldo ÷ despesa diária</code> (média dos últimos 3 meses
        ÷ 30). Faixas: ≥180 verde, 90–179 amarelo, &lt;90 vermelho.
      </p>
      {info.despesaDiaria <= 0 && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
          Sem despesas históricas suficientes — considerado saudável até começar
          a acumular dados.
        </p>
      )}
      {cap && info.despesaDiaria > 0 && (
        <p className="text-xs text-slate-500">Valor exibido limitado a 999 dias.</p>
      )}
    </div>
  );
}

function DetalheMesesReserva({ info }: { info: MesesAteReservaInfo }) {
  if (info.semReserva) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Status</span>
          <StatusPill status={info.status} />
        </div>
        <p className="text-slate-700">
          Você ainda não criou uma{" "}
          <strong>
            <TermoTooltip termo="reserva-de-emergencia">reserva de emergência</TermoTooltip>
          </strong>
          . Esse é o passo que mais protege a família contra imprevistos.
        </p>
        <p className="text-xs text-slate-500">
          Para configurar, vá em <strong>Metas</strong> e crie a Reserva de
          Emergência. O sistema calcula automaticamente o valor alvo a partir da
          média de despesas dos últimos 3 meses.
        </p>
      </div>
    );
  }
  if (info.valor === 0) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Status</span>
          <StatusPill status={info.status} />
        </div>
        <p className="text-emerald-700">
          Reserva já completa. Continue mantendo o saldo!
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Status</span>
        <StatusPill status={info.status} />
      </div>
      <div className="rounded-lg border bg-slate-50 p-3 space-y-1.5">
        <Linha label="Restante até a meta" valor={formatBRL(info.restante)} />
        <Linha
          label="÷ Aporte mensal sugerido"
          valor={formatBRL(info.aporteSugerido)}
        />
        <div className="border-t pt-1.5 mt-1.5">
          <Linha
            label="= Meses até completar"
            valor={`${info.valor ?? 0} meses`}
            destaque
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Fórmula: <code>(Meta − Acumulado) ÷ aporte mensal</code>. Faixas:
        ≤12 verde, 13–24 amarelo, &gt;24 vermelho.
      </p>
    </div>
  );
}

function Linha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={destaque ? "font-semibold text-slate-800" : "text-slate-600"}>
        {label}
      </span>
      <span
        className={`font-mono ${destaque ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}
      >
        {valor}
      </span>
    </div>
  );
}
