"use client";
import { motion } from "framer-motion";
import { Scale, Info } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Card } from "@/components/ui/card";

interface Props {
  data?: { fixas: number; variaveis: number };
}

export function FixasVsVariaveisChart({ data }: Props) {
  if (!data) return null;
  const total = data.fixas + data.variaveis;
  if (total === 0) {
    return (
      <Card as="section" aria-labelledby="fixas-variaveis">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          <Scale size={14} aria-hidden />
          <h2 id="fixas-variaveis">Fixas vs Variáveis</h2>
        </div>
        <div className="mt-3 text-sm text-ink-400">Nenhuma despesa este mês</div>
      </Card>
    );
  }

  const pctFixas = Math.round((data.fixas / total) * 100);
  const pctVar = 100 - pctFixas;

  return (
    <Card as="section" aria-labelledby="fixas-variaveis">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
          <Scale size={14} aria-hidden />
          <h2 id="fixas-variaveis">Fixas vs Variáveis</h2>
        </div>
        <span title="Fixas = assinaturas/contas recorrentes. Variáveis = avulsas e parceladas." className="text-ink-300 cursor-help">
          <Info size={14} />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-ink-700">Fixas</span>
            <span className="text-ink-400 font-mono">{formatBRL(data.fixas)} · {pctFixas}%</span>
          </div>
          <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
            <motion.div className="h-full rounded-full bg-ink-900" initial={{ width: 0 }} animate={{ width: `${pctFixas}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-ink-700">Variáveis</span>
            <span className="text-ink-400 font-mono">{formatBRL(data.variaveis)} · {pctVar}%</span>
          </div>
          <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
            <motion.div className="h-full rounded-full bg-coral-500" initial={{ width: 0 }} animate={{ width: `${pctVar}%` }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
