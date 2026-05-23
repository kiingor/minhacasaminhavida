"use client";
import { motion } from "framer-motion";
import { getTituloByNivel } from "@/lib/levelTitles";
import { calcularNivel } from "@/lib/xpCalculator";

interface Props {
  xpTotal: number;
  nivel: number;
}

export function XPBar({ xpTotal, nivel }: Props) {
  const titulo = getTituloByNivel(nivel);
  const { xpAtual, xpProximo } = calcularNivel(xpTotal);
  const pct = Math.min((xpAtual / xpProximo) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-ink-900">
          Nv {nivel} · <span className="text-ink-500">{titulo.titulo}</span>
        </span>
        <span className="text-ink-400 font-mono">{xpAtual} / {xpProximo} XP</span>
      </div>
      <div className="h-2.5 rounded-full bg-cream-200 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-coral-500"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
