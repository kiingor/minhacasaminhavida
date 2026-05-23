"use client";
import { motion } from "framer-motion";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Card } from "@/components/ui/card";

interface Props {
  data?: { totalContas: number; contasPagas: number; valorTotal: number; valorPago: number; percentual: number };
}

export function ProgressoMesCard({ data }: Props) {
  if (!data) return null;

  if (data.totalContas === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          <CheckCircle2 size={14} /> Progresso do mês
        </div>
        <div className="mt-3 flex items-center gap-2 text-ink-400">
          <PartyPopper size={18} /> Sem contas no mês
        </div>
      </Card>
    );
  }

  const pct = data.percentual;

  return (
    <Card as="section" aria-labelledby="progresso-mes">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
        <CheckCircle2 size={14} aria-hidden />
        <h2 id="progresso-mes">Progresso do mês</h2>
      </div>
      <div className="mt-2 font-display text-xl font-bold text-ink-900">
        {data.contasPagas} de {data.totalContas} contas pagas
      </div>
      <div className="text-sm text-ink-400 font-mono">{formatBRL(data.valorPago)} de {formatBRL(data.valorTotal)}</div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className="h-full rounded-full bg-coral-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <span className="font-mono font-bold text-sm text-ink-900">{pct}%</span>
      </div>
    </Card>
  );
}
