"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "./LucideIcon";
import { Clock, Zap, Repeat } from "lucide-react";

interface Props {
  pessoaId: Id<"pessoas">;
  pessoaNome: string;
  data: string;
  onClose: () => void;
}

const DIFF_COLOR: Record<string, string> = {
  facil: "#10B981",
  media: "#F59E0B",
  dificil: "#EF4444",
};

export function AtribuirTarefasModal({ pessoaId, pessoaNome, data, onClose }: Props) {
  const token = useSessionToken();
  const tarefas = useQuery(api.tarefas.tarefasCatalogo.list, token ? { sessionToken: token } : "skip");
  const recorrentesAtivas = useQuery(api.tarefas.recorrentes.listByPessoa, token ? { sessionToken: token, pessoaId } : "skip");
  const atribuir = useMutation(api.tarefas.lancamentos.atribuir);
const [selected, setSelected] = useState<Set<Id<"tarefasCatalogo">>>(new Set());
  const [loading, setLoading] = useState(false);

  // IDs das tarefas já configuradas como recorrentes para esta pessoa
  const recorrentesIds = new Set((recorrentesAtivas ?? []).map((r) => r.tarefaCatalogoId));

  const grupos = new Map<string, Doc<"tarefasCatalogo">[]>();
  tarefas?.forEach((t) => {
    if (!grupos.has(t.categoria)) grupos.set(t.categoria, []);
    grupos.get(t.categoria)!.push(t);
  });

  function toggle(id: Id<"tarefasCatalogo">) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function onSubmit() {
    if (selected.size === 0 || !token) return;
    setLoading(true);
    try {
      // atribuir já ativa recorrência automática para todos os dias
      await atribuir({ sessionToken: token, pessoaId, data, tarefaIds: Array.from(selected) });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const totalMin = tarefas?.filter((t) => selected.has(t._id)).reduce((s, t) => s + t.tempoExecucaoMinutos, 0) ?? 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Atribuir tarefas — ${pessoaNome}`}
      className="max-h-[90vh] overflow-y-auto max-w-2xl"
    >
      <div className="space-y-4">
        {tarefas === undefined ? (
          <div className="text-slate-400 py-6 text-center text-sm">Carregando...</div>
        ) : tarefas.length === 0 ? (
          <div className="text-slate-400 py-6 text-center text-sm">
            Catálogo vazio. <a href="/tarefas/catalogo" className="text-primary underline">Criar catálogo →</a>
          </div>
        ) : (
          Array.from(grupos.entries()).map(([categoria, lista]) => (
            <div key={categoria}>
              <h3 className="font-medium text-sm text-slate-500 uppercase tracking-wide mb-2">{categoria}</h3>
              <div className="grid gap-1.5 md:grid-cols-2">
                {lista.map((t) => {
                  const isSelected = selected.has(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggle(t._id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: `${t.cor}20`, color: t.cor }}
                      >
                        <LucideIcon name={t.icone} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                          {t.nome}
                          {recorrentesIds.has(t._id) && (
                            <Repeat size={9} className="text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="inline-flex items-center gap-0.5"><Clock size={9} />{t.tempoExecucaoMinutos}min</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: DIFF_COLOR[t.dificuldade] }}>
                            <Zap size={9} />{t.xpBase} XP
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white pt-3 border-t space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Repeat size={11} className="text-primary" />
            Tarefas adicionadas se repetem automaticamente todos os dias
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              {selected.size > 0 && (
                <span className="font-medium text-slate-800">{selected.size} tarefa{selected.size > 1 ? "s" : ""} · {totalMin}min</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={onSubmit} disabled={selected.size === 0 || loading}>
                {loading ? "Adicionando..." : `Adicionar ${selected.size > 0 ? selected.size : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
