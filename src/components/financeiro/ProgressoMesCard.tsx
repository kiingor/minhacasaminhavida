"use client";
import { motion } from "framer-motion";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface Props {
  data?: { totalContas: number; contasPagas: number; valorTotal: number; valorPago: number; percentual: number };
}

export function ProgressoMesCard({ data }: Props) {
  if (!data) return null;
  if (data.totalContas === 0) {
    return (
      <div className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <CheckCircle2 size={14} className="text-emerald-500" /> Progresso do mês
        </div>
        <div className="mt-3 flex items-center gap-2 text-slate-400">
          <PartyPopper size={18} /> Sem contas no mês
        </div>
      </div>
    );
  }

  const pct = data.percentual;
  const corPct = pct >= 90 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-rose-500";
  const corBar = pct >= 90 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <section aria-labelledby="progresso-mes" className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
        <CheckCircle2 size={14} className="text-emerald-500" aria-hidden />
        <h2 id="progresso-mes">Progresso do mês</h2>
      </div>
      <div className="mt-2 font-display text-xl font-bold">{data.contasPagas} de {data.totalContas} contas pagas</div>
      <div className="text-sm text-slate-500 font-mono">{formatBRL(data.valorPago)} de {formatBRL(data.valorTotal)}</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% das contas pagas`}>
          <motion.div className={`h-full rounded-full ${corBar}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
        </div>
        <span className={`font-mono font-bold text-sm ${corPct}`}>{pct}%</span>
      </div>
    </section>
  );
}
