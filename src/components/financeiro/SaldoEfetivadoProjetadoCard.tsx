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
import { Card } from "@/components/ui/card";

type Destaque = "efetivado" | "projetado";
const STORAGE_KEY = "mcmv_saldo_destaque";

interface Efetivado { valor: number; contasAtivas: number }
interface Projetado { valor: number; saldoEfetivadoBase: number; receitasPendentes: number; despesasPendentes: number }

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "efetivado" || raw === "projetado") {
        setDestaque(raw);
        lastDestaqueRef.current = raw;
      }
    } catch {}
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try { localStorage.setItem(STORAGE_KEY, destaque); } catch {}
    if (lastDestaqueRef.current !== destaque) {
      setPulseOn(destaque);
      const t = setTimeout(() => setPulseOn(null), 250);
      lastDestaqueRef.current = destaque;
      return () => clearTimeout(t);
    }
    lastDestaqueRef.current = destaque;
  }, [destaque, hidratado]);

  if (!efetivado || !projetado) return <Skeleton className="h-40 rounded-3xl" />;

  const projPositivo = projetado.valor >= 0;
  const toggle = () => setDestaque((d) => (d === "efetivado" ? "projetado" : "efetivado"));

  const cardEfetivado = (
    <CardSaldo
      key="efetivado"
      layoutId="card-saldo-efetivado"
      destacado={destaque === "efetivado"}
      pulse={pulseOn === "efetivado"}
      label="Saldo efetivado"
      valor={efetivado.valor}
      icone="efetivado"
      sublinha={`${efetivado.contasAtivas} ${efetivado.contasAtivas === 1 ? "conta ativa" : "contas ativas"}`}
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
      sublinha="Final do mês"
      onTooltip={() => setTooltipOpen(true)}
    />
  );

  const ordem = destaque === "efetivado" ? [cardEfetivado, cardProjetado] : [cardProjetado, cardEfetivado];

  return (
    <Card as="section" aria-labelledby="saldo-mes" padding="sm">
      <div className="flex items-center justify-between mb-3 px-2">
        <h2 id="saldo-mes" className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          Saldo do Mês
        </h2>
        <button
          type="button"
          onClick={toggle}
          aria-label={destaque === "efetivado" ? "Trocar destaque para saldo projetado" : "Trocar destaque para saldo efetivado"}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream-100 text-ink-500 hover:bg-cream-200 hover:text-ink-900 transition-colors"
        >
          <ArrowLeftRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">{ordem}</div>

      <Dialog open={tooltipOpen} onClose={() => setTooltipOpen(false)} title="Como o saldo projetado é calculado" className="max-w-md">
        <BreakdownProjetado projetado={projetado} />
      </Dialog>
    </Card>
  );
}

function CardSaldo({
  layoutId, destacado, pulse, label, valor, icone, sublinha, onTooltip,
}: {
  layoutId: string;
  destacado: boolean;
  pulse: boolean;
  label: string;
  valor: number;
  icone: "efetivado" | "projetado-positivo" | "projetado-negativo";
  sublinha: string;
  onTooltip?: () => void;
}) {
  const Icon = icone === "efetivado" ? CheckCircle2 : icone === "projetado-positivo" ? TrendingUp : TrendingDown;
  const sinal = valor < 0 ? "-" : "";

  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={destacado ? "rounded-2xl bg-ink-900 text-white p-4" : "rounded-2xl bg-cream-50 text-ink-900 p-4"}
    >
      <motion.div animate={pulse ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold ${destacado ? "text-white/70" : "text-ink-400"}`}>
            <Icon size={13} />
            <span className="truncate">{label}</span>
          </div>
          {onTooltip && (
            <button
              type="button"
              onClick={onTooltip}
              aria-label="Ver detalhes do cálculo do saldo projetado"
              className={`shrink-0 ${destacado ? "text-white/70 hover:text-white" : "text-ink-400 hover:text-ink-700"} transition-colors`}
            >
              <Info size={14} />
            </button>
          )}
        </div>
        <div className={`font-mono font-bold text-xl md:text-2xl truncate ${destacado ? "text-white" : "text-ink-900"}`}>
          {sinal}{formatBRL(Math.abs(valor))}
        </div>
        <div className={`text-[11px] md:text-xs mt-0.5 truncate ${destacado ? "text-white/65" : "text-ink-400"}`}>
          {sublinha}
        </div>
      </motion.div>
    </motion.div>
  );
}

function BreakdownProjetado({ projetado }: { projetado: Projetado }) {
  return (
    <div className="space-y-2 text-sm">
      <Linha label="Efetivado"             valor={projetado.saldoEfetivadoBase} />
      <Linha label="+ Receitas pendentes"  valor={projetado.receitasPendentes}  sign="+" />
      <Linha label="− Despesas pendentes"  valor={projetado.despesasPendentes}  sign="-" />
      <div className="border-t border-cream-200 pt-2 mt-1">
        <Linha label="= Projetado" valor={projetado.valor} destaque />
      </div>
      <p className="text-xs text-ink-400 mt-2">
        O saldo projetado considera tudo o que ainda está previsto para acontecer até o fim do mês corrente.
      </p>
    </div>
  );
}

function Linha({
  label, valor, sign, destaque,
}: {
  label: string;
  valor: number;
  sign?: "+" | "-";
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={destaque ? "font-bold text-ink-900" : "text-ink-500"}>{label}</span>
      <span className={`font-mono ${destaque ? "font-bold text-ink-900" : "font-medium text-ink-700"}`}>
        {sign ?? ""}{formatBRL(Math.abs(valor))}
      </span>
    </div>
  );
}
