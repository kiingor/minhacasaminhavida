"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";

type Destaque = "efetivado" | "projetado";
const STORAGE_KEY = "mcmv_saldo_destaque";

interface Efetivado {
  valor: number;
  contasAtivas: number;
}
interface Projetado {
  valor: number;
  saldoEfetivadoBase: number;
  receitasPendentes: number;
  despesasPendentes: number;
}

interface Props {
  efetivado: Efetivado | undefined;
  projetado: Projetado | undefined;
}

export function SaldoEfetivadoProjetadoCard({ efetivado, projetado }: Props) {
  const [destaque, setDestaque] = useState<Destaque>("efetivado");
  const [hidratado, setHidratado] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const lastDestaqueRef = useRef<Destaque>("efetivado");
  const [pulseOn, setPulseOn] = useState<Destaque | null>(null);

  // Lê preferência do localStorage no client após hidratação
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "efetivado" || raw === "projetado") {
        setDestaque(raw);
        // Sincroniza ref com o valor restaurado para que o primeiro toggle real
        // dispare o pulse, mas o mount/restauracao nao.
        lastDestaqueRef.current = raw;
      }
    } catch {}
    setHidratado(true);
  }, []);

  // Persiste mudança e dispara pulse APENAS quando destaque realmente mudou
  // (nao no mount nem na hidratacao do localStorage)
  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(STORAGE_KEY, destaque);
    } catch {}
    if (lastDestaqueRef.current !== destaque) {
      setPulseOn(destaque);
      const t = setTimeout(() => setPulseOn(null), 250);
      lastDestaqueRef.current = destaque;
      return () => clearTimeout(t);
    }
    lastDestaqueRef.current = destaque;
  }, [destaque, hidratado]);

  if (!efetivado || !projetado) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  const projPositivo = projetado.valor >= 0;

  function toggle() {
    setDestaque((d) => (d === "efetivado" ? "projetado" : "efetivado"));
  }

  const cardEfetivado = (
    <CardSaldo
      key="efetivado"
      layoutId="card-saldo-efetivado"
      destacado={destaque === "efetivado"}
      pulse={pulseOn === "efetivado"}
      label="Saldo efetivado"
      valor={efetivado.valor}
      icone="efetivado"
      cor="text-primary"
      sublinha={`${efetivado.contasAtivas} ${
        efetivado.contasAtivas === 1 ? "conta ativa" : "contas ativas"
      }`}
    />
  );

  const cardProjetado = (
    <CardSaldo
      key="projetado"
      layoutId="card-saldo-projetado"
      destacado={destaque === "projetado"}
      pulse={pulseOn === "projetado"}
      label="Saldo projetado"
      valor={projetado.valor}
      icone={projPositivo ? "projetado-positivo" : "projetado-negativo"}
      cor={projPositivo ? "text-emerald-600" : "text-rose-600"}
      sublinha="Final do mês"
      onTooltip={() => setTooltipOpen(true)}
    />
  );

  const ordem =
    destaque === "efetivado"
      ? [cardEfetivado, cardProjetado]
      : [cardProjetado, cardEfetivado];

  return (
    <section
      aria-labelledby="saldo-mes"
      className="rounded-2xl bg-white border p-3 md:p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h2
          id="saldo-mes"
          className="text-xs uppercase tracking-wide text-slate-500 font-medium"
        >
          Saldo do Mês
        </h2>
        <button
          type="button"
          onClick={toggle}
          aria-label={
            destaque === "efetivado"
              ? "Trocar destaque para saldo projetado"
              : "Trocar destaque para saldo efetivado"
          }
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors"
        >
          <ArrowLeftRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">{ordem}</div>

      <Dialog
        open={tooltipOpen}
        onClose={() => setTooltipOpen(false)}
        title="Como o saldo projetado é calculado"
        className="max-w-md"
      >
        <BreakdownProjetado projetado={projetado} />
      </Dialog>
    </section>
  );
}

function CardSaldo({
  layoutId,
  destacado,
  pulse,
  label,
  valor,
  icone,
  cor,
  sublinha,
  onTooltip,
}: {
  layoutId: string;
  destacado: boolean;
  pulse: boolean;
  label: string;
  valor: number;
  icone: "efetivado" | "projetado-positivo" | "projetado-negativo";
  cor: string;
  sublinha: string;
  onTooltip?: () => void;
}) {
  const Icon =
    icone === "efetivado"
      ? CheckCircle2
      : icone === "projetado-positivo"
      ? TrendingUp
      : TrendingDown;

  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={
        destacado
          ? "rounded-xl border-2 border-primary/30 bg-primary/5 p-3 md:p-4"
          : "rounded-xl border bg-white p-3 md:p-4"
      }
    >
      <motion.div
        animate={pulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">
            <Icon size={14} className={cor} />
            <span className="truncate">{label}</span>
          </div>
          {onTooltip && (
            <button
              type="button"
              onClick={onTooltip}
              aria-label="Ver detalhes do cálculo do saldo projetado"
              className="text-slate-400 hover:text-primary transition-colors shrink-0"
            >
              <Info size={14} />
            </button>
          )}
        </div>
        <div
          className={`font-mono font-bold text-xl md:text-2xl truncate ${cor}`}
        >
          {formatBRL(valor)}
        </div>
        <div className="text-[11px] md:text-xs text-slate-400 mt-0.5 truncate">
          {sublinha}
        </div>
      </motion.div>
    </motion.div>
  );
}

function BreakdownProjetado({ projetado }: { projetado: Projetado }) {
  return (
    <div className="space-y-2 text-sm">
      <Linha label="Efetivado" valor={projetado.saldoEfetivadoBase} />
      <Linha
        label="+ Receitas pendentes"
        valor={projetado.receitasPendentes}
        sinal="positivo"
      />
      <Linha
        label="− Despesas pendentes"
        valor={projetado.despesasPendentes}
        sinal="negativo"
      />
      <div className="border-t pt-2 mt-1">
        <Linha label="= Projetado" valor={projetado.valor} destaque />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        O saldo projetado considera tudo o que ainda está previsto para
        acontecer até o fim do mês corrente.
      </p>
    </div>
  );
}

function Linha({
  label,
  valor,
  sinal,
  destaque,
}: {
  label: string;
  valor: number;
  sinal?: "positivo" | "negativo";
  destaque?: boolean;
}) {
  const cor =
    sinal === "positivo"
      ? "text-emerald-600"
      : sinal === "negativo"
      ? "text-rose-600"
      : destaque
      ? valor >= 0
        ? "text-emerald-600"
        : "text-rose-600"
      : "text-slate-700";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={destaque ? "font-semibold" : "text-slate-600"}>
        {label}
      </span>
      <span className={`font-mono ${destaque ? "font-bold" : "font-medium"} ${cor}`}>
        {formatBRL(valor)}
      </span>
    </div>
  );
}

