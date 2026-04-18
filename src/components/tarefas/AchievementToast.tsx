"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award } from "lucide-react";
import { LucideIcon } from "./LucideIcon";
import { playSound, SOUNDS } from "@/lib/sounds";

interface Achievement {
  tipo: string;
  nome: string;
  icone: string;
}

interface ToastItem extends Achievement {
  id: number;
}

let nextId = 0;

export function useAchievementToast() {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | null>(null);

  const push = useCallback((achievements: Achievement[]) => {
    setQueue((q) => [...q, ...achievements.map((a) => ({ ...a, id: nextId++ }))]);
  }, []);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    playSound(SOUNDS.levelUp, 0.5);
    const t = setTimeout(() => setCurrent(null), 4000);
    return () => clearTimeout(t);
  }, [current, queue]);

  return { current, push };
}

interface Props {
  achievement: ToastItem | null;
}

export function AchievementToast({ achievement }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[60]">
      <AnimatePresence>
        {achievement && (
          <motion.div
            key={achievement.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xl shadow-amber-500/30 min-w-[280px]"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <LucideIcon name={achievement.icone} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-medium text-white/80 flex items-center gap-1">
                <Award size={10} /> Conquista desbloqueada!
              </div>
              <div className="font-display font-bold text-sm truncate">{achievement.nome}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
