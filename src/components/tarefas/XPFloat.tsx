"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FloatItem {
  id: number;
  xp: number;
  positive: boolean;
}

interface Props {
  events: FloatItem[];
}

export function XPFloat({ events }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible z-20">
      <AnimatePresence>
        {events.map((ev) => (
          <motion.div
            key={ev.id}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 font-gamer font-bold text-lg select-none ${ev.positive ? "text-amber-400" : "text-red-400"}`}
            initial={{ y: 0, opacity: 1, scale: 0.8 }}
            animate={{ y: -70, opacity: 0, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {ev.positive ? "+" : ""}{ev.xp} XP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook para gerenciar eventos de XP flutuante
export function useXPFloat() {
  const [events, setEvents] = useState<FloatItem[]>([]);
  let counter = 0;

  function fire(xp: number, positive = true) {
    const id = ++counter;
    setEvents((prev) => [...prev, { id, xp, positive }]);
    setTimeout(() => setEvents((prev) => prev.filter((e) => e.id !== id)), 1400);
  }

  return { events, fire };
}
