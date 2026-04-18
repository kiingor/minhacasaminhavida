"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { playSound, SOUNDS } from "@/lib/sounds";
import { LucideIcon } from "./LucideIcon";
import { XPFloat, useXPFloat } from "./XPFloat";

interface Props {
  lancamento: Doc<"tarefasLancamentos">;
  onAchievements?: (achievements: Array<{ tipo: string; nome: string; icone: string }>) => void;
}

export function TaskCheckButton({ lancamento, onAchievements }: Props) {
  const token = useSessionToken();
  const marcar = useMutation(api.tarefas.lancamentos.marcarCompletada);
  const desmarcar = useMutation(api.tarefas.lancamentos.desmarcarCompletada);
  const [loading, setLoading] = useState(false);
  const { events, fire } = useXPFloat();

  async function toggle() {
    if (loading || !token) return;
    setLoading(true);
    try {
      if (lancamento.completada) {
        const res = await desmarcar({ sessionToken: token, id: lancamento._id });
        if (res && !("alreadyUndone" in res)) {
          fire(lancamento.xpGanho, false);
          playSound(SOUNDS.taskUncheck, 0.4);
        }
      } else {
        const res = await marcar({ sessionToken: token, id: lancamento._id });
        if (res && !("alreadyDone" in res)) {
          fire(res.xpGanho, true);
          playSound(SOUNDS.taskCheck, 0.6);
          playSound(SOUNDS.xpGain, 0.3);
          if (res.newAchievements?.length && onAchievements) {
            onAchievements(res.newAchievements);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer select-none ${
        lancamento.completada
          ? "bg-slate-50 border-slate-200 opacity-75"
          : "bg-white border-slate-200 hover:border-primary/40"
      }`}
      whileTap={{ scale: 0.97 }}
      onClick={toggle}
    >
      {/* XP float overlay */}
      <XPFloat events={events} />

      {/* Checkbox */}
      <motion.div
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 transition-colors ${
          lancamento.completada
            ? "bg-success border-success"
            : "border-slate-300 hover:border-primary bg-white"
        }`}
        whileTap={{ scale: 0.85 }}
      >
        <AnimatePresence>
          {lancamento.completada && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Check size={18} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring when completing */}
        <AnimatePresence>
          {lancamento.completada && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-success"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tarefa info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${lancamento.corSnapshot}20`, color: lancamento.corSnapshot }}
          >
            <LucideIcon name={lancamento.iconeSnapshot} size={13} />
          </div>
          <span className={`font-medium text-sm truncate ${lancamento.completada ? "line-through text-slate-400" : ""}`}>
            {lancamento.nomeSnapshot}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
          <span>{lancamento.tempoExecucaoSnapshot}min</span>
          <span className="font-semibold text-amber-500">+{lancamento.xpGanho} XP</span>
          {lancamento.horarioAgendado && (
            <span className="text-slate-400">{lancamento.horarioAgendado.inicio} – {lancamento.horarioAgendado.fim}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
      )}
    </motion.div>
  );
}
