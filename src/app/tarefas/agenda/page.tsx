"use client";
import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Wand2, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { AgendaTimeline } from "@/components/tarefas/AgendaTimeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayISO, formatDate } from "@/lib/formatters";
import { calcularAgenda } from "@/lib/agendaCalculator";

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

export default function AgendaPage() {
  const token = useSessionToken();
  const [data, setData] = useState(todayISO());
  const [pessoaSel, setPessoaSel] = useState<Id<"pessoas"> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const lancamentos = useQuery(
    api.tarefas.lancamentos.listByPessoaDate,
    token && pessoaSel ? { sessionToken: token, pessoaId: pessoaSel, data } : "skip"
  );
  const salvarAgenda = useMutation(api.tarefas.agenda.salvarAgenda);

  const ativas = pessoas?.filter((p) => p.ativo) ?? [];
  const pessoa = ativas.find((p) => p._id === pessoaSel) ?? ativas[0];

  // Seleciona primeira pessoa automaticamente
  if (pessoa && !pessoaSel) {
    setPessoaSel(pessoa._id);
  }

  // Calcula agenda (só recalcula quando input muda)
  const resultado = useMemo(() => {
    if (!pessoa || !lancamentos) return null;
    const tarefas = lancamentos.map((l) => ({
      id: l._id,
      nome: l.nomeSnapshot,
      tempoExecucaoMinutos: l.tempoExecucaoSnapshot,
      cor: l.corSnapshot,
    }));
    return calcularAgenda(pessoa.horarioTrabalho, tarefas, data);
  }, [pessoa, lancamentos, data]);

  async function handleSalvar() {
    if (!resultado || !token) return;
    setSalvando(true);
    try {
      const updates = [
        ...resultado.agendadas.map((t) => ({
          id: t.id as Id<"tarefasLancamentos">,
          horarioAgendado: t.horarioAgendado,
        })),
        ...resultado.naoCouberam.map((t) => ({
          id: t.id as Id<"tarefasLancamentos">,
          horarioAgendado: undefined,
        })),
      ];
      await salvarAgenda({ sessionToken: token, lancamentos: updates });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Agenda Inteligente</h1>
          <p className="text-slate-500">Encaixe das tarefas no seu horário livre</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border bg-white p-1">
          <button onClick={() => setData(shiftDate(data, -1))} className="p-1.5 rounded hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 flex items-center gap-1.5 text-sm font-medium min-w-[100px] justify-center">
            <CalendarDays size={14} className="text-slate-400" />
            {dateLabel(data)}
          </div>
          <button onClick={() => setData(shiftDate(data, 1))} className="p-1.5 rounded hover:bg-slate-100">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Seletor de pessoa (tabs de avatares) */}
      {pessoas === undefined ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : ativas.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed p-10 text-center">
          <p className="text-slate-500">Cadastre pessoas primeiro.</p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ativas.map((p) => {
            const selected = p._id === pessoaSel;
            return (
              <button
                key={p._id}
                onClick={() => setPessoaSel(p._id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 shrink-0 transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-transparent bg-white hover:bg-slate-50"
                }`}
              >
                <PersonAvatar pessoa={p} size={32} />
                <span className="text-sm font-medium">{p.apelido ?? p.nome.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Conteúdo */}
      {pessoa && resultado && lancamentos && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Timeline */}
          <div className="rounded-2xl bg-white border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">Timeline do dia</h2>
              {!pessoa.horarioTrabalho && (
                <span className="text-xs text-slate-400">Sem horário de trabalho configurado</span>
              )}
            </div>
            {lancamentos.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Nenhuma tarefa atribuída para este dia.
                <div className="mt-2">
                  <a href="/tarefas/hoje" className="text-primary hover:underline text-sm font-medium">
                    Atribuir tarefas →
                  </a>
                </div>
              </div>
            ) : (
              <AgendaTimeline janelas={resultado.janelas} agendadas={resultado.agendadas} />
            )}
          </div>

          {/* Resumo lateral */}
          <div className="space-y-4">
            <motion.div
              className="rounded-2xl bg-white border p-5 shadow-sm space-y-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-display font-bold">Resumo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 inline-flex items-center gap-1.5"><Clock size={14} /> Tempo total</span>
                  <span className="font-mono font-semibold">{resultado.tempoTotalMinutos}min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Agendadas</span>
                  <span className="font-semibold text-success">{resultado.agendadas.length}</span>
                </div>
                {resultado.horarioTermino && (
                  <div className="rounded-lg bg-primary/5 p-3 mt-2">
                    <div className="text-xs text-slate-500">Vai terminar às</div>
                    <div className="font-gamer font-bold text-2xl text-primary">{resultado.horarioTermino}</div>
                  </div>
                )}
              </div>
              {lancamentos.length > 0 && (
                <Button onClick={handleSalvar} disabled={salvando} className="w-full">
                  <Wand2 size={14} />
                  {salvando ? "Salvando..." : "Aplicar aos lançamentos"}
                </Button>
              )}
            </motion.div>

            {resultado.naoCouberam.length > 0 && (
              <motion.div
                className="rounded-2xl bg-amber-50 border border-amber-200 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
                  <AlertTriangle size={16} /> Não couberam ({resultado.naoCouberam.length})
                </div>
                <ul className="space-y-1 text-xs text-amber-800">
                  {resultado.naoCouberam.map((t) => (
                    <li key={t.id}>• {t.nome} ({t.tempoExecucaoMinutos}min)</li>
                  ))}
                </ul>
              </motion.div>
            )}

            {!pessoa.horarioTrabalho && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-800">
                <strong>Dica:</strong> configure o horário de trabalho em{" "}
                <a href="/pessoas" className="underline font-medium">Pessoas</a>{" "}
                para uma agenda mais precisa.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
