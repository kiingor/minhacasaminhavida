"use client";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { LucideIcon } from "./LucideIcon";
import { ACHIEVEMENTS, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/achievementDefinitions";
import { formatDate } from "@/lib/formatters";

interface UnlockedAchievement {
  tipo: string;
  desbloqueadaEm: string;
}

interface Props {
  unlocked: UnlockedAchievement[];
  stats?: {
    tarefasCompletadasTotal: number;
    streakDias: number;
    nivelAtual: number;
  };
}

export function AchievementGallery({ unlocked, stats }: Props) {
  const unlockedMap = new Map(unlocked.map((u) => [u.tipo, u]));
  const categories = ["tarefas", "streak", "nivel", "especial"] as const;

  function getProgress(def: typeof ACHIEVEMENTS[number]): string | null {
    if (!stats || !def.meta) return null;
    const u = unlockedMap.get(def.tipo);
    if (u) return null;
    let current = 0;
    if (def.categoria === "tarefas") current = stats.tarefasCompletadasTotal;
    else if (def.categoria === "streak") current = stats.streakDias;
    else if (def.categoria === "nivel") current = stats.nivelAtual;
    else return null;
    return `${Math.min(current, def.meta)}/${def.meta}`;
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const defs = ACHIEVEMENTS.filter((a) => a.categoria === cat);
        const color = CATEGORY_COLORS[cat];
        return (
          <div key={cat}>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              {CATEGORY_LABELS[cat]}
              <span className="text-xs font-normal text-slate-400">
                {defs.filter((d) => unlockedMap.has(d.tipo)).length}/{defs.length}
              </span>
            </h3>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {defs.map((def, i) => {
                const isUnlocked = unlockedMap.has(def.tipo);
                const data = unlockedMap.get(def.tipo);
                const progress = getProgress(def);
                return (
                  <motion.div
                    key={def.tipo}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                      isUnlocked
                        ? "bg-white border-amber-200/60 shadow-sm"
                        : "bg-slate-50/80 border-slate-200/60 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnlocked
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {isUnlocked ? (
                        <LucideIcon name={def.icone} size={20} />
                      ) : (
                        <Lock size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isUnlocked ? "text-slate-800" : "text-slate-500"}`}>
                        {def.nome}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isUnlocked && data
                          ? formatDate(data.desbloqueadaEm)
                          : def.descricao}
                      </div>
                      {progress && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(parseInt(progress) / (def.meta ?? 1)) * 100}%`,
                                background: color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{progress}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
