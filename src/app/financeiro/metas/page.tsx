"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Plus, ChevronLeft, Target as TargetIcon } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetaCard } from "@/components/financeiro/MetaCard";
import { MetaForm } from "@/components/financeiro/MetaForm";
import { ReservaEmergenciaCard } from "@/components/financeiro/ReservaEmergenciaCard";
import { formatBRL } from "@/lib/formatters";

export default function MetasPage() {
  const token = useSessionToken();
  const [showForm, setShowForm] = useState(false);
  const data = useQuery(
    api.financeiro.metas.comAporteSugerido,
    token ? { sessionToken: token } : "skip"
  );
  const reservaInfo = useQuery(
    api.financeiro.metas.getReservaEmergencia,
    token ? { sessionToken: token } : "skip"
  );

  const reserva = data?.reserva ?? null;
  const outras = data?.outras ?? [];

  const resumo = useMemo(() => {
    if (!data) return null;
    const todas = [...(reserva ? [reserva] : []), ...outras];
    if (todas.length === 0) return null;
    const totalAlvo = todas.reduce((acc, m) => acc + m.valorAlvo, 0);
    const totalAcumulado = todas.reduce((acc, m) => acc + m.valorAtual, 0);
    const totalAporteMensal = todas
      .filter((m) => !m.concluida)
      .reduce((acc, m) => acc + m.aporteSugeridoMensal, 0);
    const concluidas = todas.filter((m) => m.concluida).length;
    return {
      totalAlvo,
      totalAcumulado,
      totalAporteMensal,
      concluidas,
      qtd: todas.length,
    };
  }, [data, reserva, outras]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
          >
            <ChevronLeft size={14} /> Financas
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Metas</h1>
          <p className="text-slate-500">Objetivos financeiros da familia</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nova Meta
        </Button>
      </div>

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
              Total acumulado
            </div>
            <div className="font-mono font-bold text-xl text-emerald-600 mt-1">
              {formatBRL(resumo.totalAcumulado)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              de {formatBRL(resumo.totalAlvo)}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
              Aporte mensal sugerido
            </div>
            <div className="font-mono font-bold text-xl text-primary mt-1">
              {formatBRL(resumo.totalAporteMensal)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              somando todas as metas ativas
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
              Metas
            </div>
            <div className="font-mono font-bold text-xl text-slate-800 mt-1">
              {resumo.qtd}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {resumo.concluidas} concluida{resumo.concluidas === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      )}

      {/* Reserva de Emergencia (sempre topo) */}
      {reservaInfo === undefined ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : (
        <ReservaEmergenciaCard info={reservaInfo} />
      )}

      {/* Outros objetivos */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-700">
          Outros objetivos
        </h2>

        {data === undefined ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : outras.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <TargetIcon size={24} className="text-primary" />
            </div>
            <p className="text-base font-medium text-slate-800">
              Nenhuma outra meta cadastrada
            </p>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Crie objetivos para economizar com proposito.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} /> Criar meta
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {outras.map((m) => (
              <MetaCard key={m._id} meta={m} />
            ))}
          </div>
        )}
      </div>

      {showForm && <MetaForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
