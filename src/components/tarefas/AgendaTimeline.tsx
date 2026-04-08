"use client";
import { motion } from "framer-motion";
import { Briefcase, Coffee, Sparkles } from "lucide-react";
import { Janela, TarefaAgendada, timeToMin } from "@/lib/agendaCalculator";

interface Props {
  janelas: Janela[];
  agendadas: TarefaAgendada[];
}

// Timeline vertical de 06:00 a 23:00 (17h = 1020 minutos)
const INICIO_MIN = 6 * 60;
const FIM_MIN = 23 * 60;
const ALTURA_TOTAL = 680; // px (40px por hora)

function minToPx(min: number): number {
  return ((min - INICIO_MIN) / (FIM_MIN - INICIO_MIN)) * ALTURA_TOTAL;
}

const TIPO_STYLE: Record<Janela["tipo"], { bg: string; border: string; icon: React.ElementType | null; label: string }> = {
  livre: { bg: "#F8FAFC", border: "#E2E8F0", icon: null, label: "Livre" },
  trabalho: { bg: "#DBEAFE", border: "#3B82F6", icon: Briefcase, label: "Trabalho" },
  intervalo: { bg: "#FEF3C7", border: "#F59E0B", icon: Coffee, label: "Intervalo" },
};

export function AgendaTimeline({ janelas, agendadas }: Props) {
  const horas = [];
  for (let h = 6; h <= 23; h++) horas.push(h);

  return (
    <div className="relative flex" style={{ height: ALTURA_TOTAL + 20 }}>
      {/* Eixo de horas (esquerda) */}
      <div className="w-12 shrink-0 relative" style={{ height: ALTURA_TOTAL }}>
        {horas.map((h) => (
          <div
            key={h}
            className="absolute -translate-y-1/2 text-xs text-slate-400 font-mono"
            style={{ top: minToPx(h * 60) }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* Track principal */}
      <div className="relative flex-1" style={{ height: ALTURA_TOTAL }}>
        {/* Linhas horizontais */}
        {horas.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 border-t border-dashed border-slate-100"
            style={{ top: minToPx(h * 60) }}
          />
        ))}

        {/* Janelas de fundo (trabalho/intervalo) */}
        {janelas.map((j, i) => {
          if (j.tipo === "livre") return null;
          const top = minToPx(timeToMin(j.inicio));
          const height = minToPx(timeToMin(j.fim)) - top;
          const style = TIPO_STYLE[j.tipo];
          const Icon = style.icon;
          return (
            <motion.div
              key={i}
              className="absolute inset-x-1 rounded-lg border-l-4 flex items-center gap-2 px-3 py-1 text-xs font-medium"
              style={{
                top,
                height: Math.max(height, 20),
                background: style.bg,
                borderLeftColor: style.border,
                color: style.border,
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              {Icon && <Icon size={12} />}
              <span className="truncate">
                {j.descricao ?? style.label} · {j.inicio}–{j.fim}
              </span>
            </motion.div>
          );
        })}

        {/* Tarefas agendadas (sobrepostas às janelas livres) */}
        {agendadas.map((t, i) => {
          const inicio = timeToMin(t.horarioAgendado.inicio);
          const fim = timeToMin(t.horarioAgendado.fim);
          const top = minToPx(inicio);
          const height = Math.max(minToPx(fim) - top, 20);
          const cor = t.cor ?? "#6366F1";
          return (
            <motion.div
              key={t.id}
              className="absolute left-2 right-2 rounded-lg shadow-sm flex items-center gap-2 px-3 py-1 text-xs font-semibold text-white overflow-hidden"
              style={{
                top,
                height,
                background: `linear-gradient(135deg, ${cor}, ${cor}dd)`,
                zIndex: 10,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04, type: "spring", stiffness: 300 }}
            >
              <Sparkles size={11} className="shrink-0" />
              <span className="truncate flex-1">{t.nome}</span>
              <span className="font-mono text-[10px] opacity-80 shrink-0">
                {t.horarioAgendado.inicio}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
