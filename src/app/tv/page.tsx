"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Maximize2, Minimize2, Home } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonColumn } from "@/components/tarefas/PersonColumn";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, todayISO } from "@/lib/formatters";

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Hoje";
  if (iso === shiftDate(today, -1)) return "Ontem";
  if (iso === shiftDate(today, 1)) return "Amanhã";
  return formatDate(iso);
}

export default function TVPage() {
  const token = useSessionToken();
  const [data, setData] = useState(todayISO());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const ativas = pessoas?.filter((p) => p.ativo) ?? [];

  // Sincroniza estado com mudanças no fullscreen (ex: tecla Esc)
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Atualiza data à meia-noite automaticamente
  useEffect(() => {
    const now = new Date();
    const msAteMeiaNoite =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(() => setData(todayISO()), msAteMeiaNoite);
    return () => clearTimeout(t);
  }, [data]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[#1E1B4B] text-white px-4 md:px-6 py-3 flex items-center gap-4 shadow-lg">
        {/* Logo */}
        <div className="hidden sm:flex items-center gap-2 font-display font-extrabold text-lg shrink-0">
          <Home size={18} className="text-white/70" />
          <span>Minha Casa</span>
        </div>

        <div className="hidden sm:block h-5 w-px bg-white/20" />

        {/* Seletor de data — centralizado */}
        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 border border-white/20 px-1 py-1">
            <button
              onClick={() => setData(shiftDate(data, -1))}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              aria-label="Dia anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 flex items-center gap-1.5 text-sm font-semibold min-w-[120px] justify-center">
              <CalendarDays size={13} className="text-white/70" />
              {dateLabel(data)}
            </div>
            <button
              onClick={() => setData(shiftDate(data, 1))}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              aria-label="Próximo dia"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Botão fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition-colors"
          title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span className="hidden sm:inline">{isFullscreen ? "Sair" : "Tela cheia"}</span>
        </button>
      </header>

      {/* Conteúdo — rola independente */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {pessoas === undefined ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
          >
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : ativas.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-4">👥</div>
            <p className="font-display font-bold text-xl text-slate-700">Nenhuma pessoa cadastrada</p>
            <p className="text-slate-500 mt-1 text-sm">Cadastre pessoas em <strong>Pessoas</strong> para começar.</p>
          </motion.div>
        ) : (
          <div
            className="grid gap-4 h-full"
            style={{
              gridTemplateColumns: `repeat(${ativas.length}, minmax(0, 1fr))`,
            }}
          >
            {ativas.map((pessoa) => (
              <PersonColumn key={pessoa._id} pessoa={pessoa} data={data} tvMode />
            ))}
          </div>
        )}
      </main>

      {/* Rodapé com contagem */}
      {ativas.length > 0 && (
        <footer className="shrink-0 bg-white border-t px-6 py-2 flex items-center justify-between text-xs text-slate-400">
          <span>{ativas.length} pessoa{ativas.length > 1 ? "s" : ""}</span>
          <span>Minha Casa Minha Vida — atualização em tempo real</span>
        </footer>
      )}
    </div>
  );
}
