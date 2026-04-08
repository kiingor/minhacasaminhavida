"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
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

export default function TarefasHojePage() {
  const token = useSessionToken();
  const [data, setData] = useState(todayISO());
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");

  const ativas = pessoas?.filter((p) => p.ativo) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Tarefas do Dia</h1>
          <p className="text-slate-500">Gerencie as tarefas da família</p>
        </div>

        {/* Botão abrir tela cheia em nova guia */}
        <a
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
          title="Abrir tela de tarefas em nova guia (modo TV)"
        >
          <ExternalLink size={15} />
          <span className="hidden sm:inline">Abrir em tela cheia</span>
        </a>

        {/* Seletor de data */}
        <div className="inline-flex items-center gap-1 rounded-lg border bg-white p-1">
          <button
            onClick={() => setData(shiftDate(data, -1))}
            className="p-1.5 rounded hover:bg-slate-100"
            aria-label="Dia anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 flex items-center gap-1.5 text-sm font-medium min-w-[100px] justify-center">
            <CalendarDays size={14} className="text-slate-400" />
            {dateLabel(data)}
          </div>
          <button
            onClick={() => setData(shiftDate(data, 1))}
            className="p-1.5 rounded hover:bg-slate-100"
            aria-label="Próximo dia"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Colunas por pessoa */}
      {pessoas === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : ativas.length === 0 ? (
        <motion.div
          className="rounded-2xl bg-white border border-dashed p-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium text-slate-700">Nenhuma pessoa cadastrada.</p>
          <a href="/pessoas" className="mt-2 inline-block text-sm text-primary hover:underline">
            Cadastrar pessoas →
          </a>
        </motion.div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(ativas.length, 4)}, minmax(280px, 1fr))`,
              minWidth: ativas.length > 2 ? `${ativas.length * 296}px` : undefined,
            }}
          >
            {ativas.map((pessoa) => (
              <PersonColumn key={pessoa._id} pessoa={pessoa} data={data} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
