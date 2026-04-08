"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Clock, Zap } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogoForm } from "@/components/tarefas/CatalogoForm";
import { LucideIcon } from "@/components/tarefas/LucideIcon";

const DIFF_COLOR: Record<string, string> = {
  facil: "#10B981",
  media: "#F59E0B",
  dificil: "#EF4444",
};

export default function CatalogoPage() {
  const token = useSessionToken();
  const tarefas = useQuery(api.tarefas.tarefasCatalogo.list, token ? { sessionToken: token } : "skip");
  const seed = useMutation(api.tarefas.tarefasCatalogo.seedDefaults);
  const remove = useMutation(api.tarefas.tarefasCatalogo.remove);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Doc<"tarefasCatalogo"> | null>(null);

  // Agrupar por categoria
  const grupos = new Map<string, Doc<"tarefasCatalogo">[]>();
  tarefas?.forEach((t) => {
    if (!grupos.has(t.categoria)) grupos.set(t.categoria, []);
    grupos.get(t.categoria)!.push(t);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Catálogo de Tarefas</h1>
          <p className="text-slate-500">Tarefas disponíveis para atribuir à família</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> Nova Tarefa
        </Button>
      </div>

      {tarefas === undefined ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : tarefas.length === 0 ? (
        <div className="rounded-2xl bg-white border p-8 text-center space-y-3">
          <p className="text-slate-600">Nenhuma tarefa no catálogo ainda.</p>
          <Button onClick={() => token && seed({ sessionToken: token })}>🎁 Criar catálogo padrão (29 tarefas)</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grupos.entries()).map(([categoria, lista]) => (
            <section key={categoria}>
              <h2 className="font-display font-bold text-lg mb-3" style={{ color: lista[0].cor }}>
                {categoria}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((t, i) => (
                  <motion.div
                    key={t._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl bg-white border p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${t.cor}20`, color: t.cor }}
                    >
                      <LucideIcon name={t.icone} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{t.nome}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="inline-flex items-center gap-1"><Clock size={10} />{t.tempoExecucaoMinutos}min</span>
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ color: DIFF_COLOR[t.dificuldade] }}>
                          <Zap size={10} />{t.xpBase} XP
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-primary rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => token && remove({ sessionToken: token, id: t._id })} className="p-1.5 text-slate-400 hover:text-danger rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showForm && (
        <CatalogoForm tarefa={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}
