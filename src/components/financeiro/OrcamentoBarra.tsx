"use client";
import { motion } from "framer-motion";

type Status = "ok" | "atencao" | "estourada" | "sem_limite";

interface Props {
  percentual: number; // valor pode passar de 100
  status: Status;
  altura?: "sm" | "md";
}

const CORES_BARRA: Record<Status, string> = {
  ok: "bg-success",
  atencao: "bg-warning",
  estourada: "bg-danger",
  sem_limite: "bg-slate-300",
};

export function OrcamentoBarra({ percentual, status, altura = "md" }: Props) {
  // Limita visual da preenchida em 100%; mas exibe overflow vermelho quando estourada (mostra parte alem do 100%)
  const pctVisual = Math.min(percentual, 100);
  const heightClass = altura === "sm" ? "h-2" : "h-3";

  return (
    <div
      className={`relative w-full rounded-full bg-slate-100 overflow-hidden ${heightClass}`}
      role="progressbar"
      aria-valuenow={Math.round(percentual)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`${heightClass} ${CORES_BARRA[status]} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${pctVisual}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {/* Marcador 80% */}
      <span
        className="absolute top-0 bottom-0 border-r border-slate-300/60"
        style={{ left: "80%" }}
        aria-hidden
      />
    </div>
  );
}
