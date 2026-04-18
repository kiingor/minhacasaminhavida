"use client";
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface Props {
  label: string;
  valor: number;
  icon: LucideIcon;
  color: string;
  trend?: "up" | "down" | "neutral";
}

const trendConfig = {
  up: { icon: TrendingUp, label: "Subiu", bg: "bg-emerald-50", text: "text-emerald-600" },
  down: { icon: TrendingDown, label: "Caiu", bg: "bg-rose-50", text: "text-rose-600" },
  neutral: { icon: Minus, label: "Estável", bg: "bg-slate-50", text: "text-slate-500" },
};

export function SummaryCard({ label, valor, icon: Icon, color, trend }: Props) {
  const t = trend ? trendConfig[trend] : null;
  return (
    <motion.div
      className="rounded-2xl bg-white border p-5 shadow-sm"
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
          <div className="font-mono font-semibold text-xl mt-1 truncate" style={{ color }}>
            {formatBRL(Math.abs(valor))}
          </div>
          {t && (
            <div className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${t.bg} ${t.text}`}>
              <t.icon size={10} />
              {t.label} vs mês anterior
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, color }}
        >
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}
