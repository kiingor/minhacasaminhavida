"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Plus, Trash2, Flame } from "lucide-react";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { XPBar } from "./XPBar";
import { TaskCheckButton } from "./TaskCheckButton";
import { AtribuirTarefasModal } from "./AtribuirTarefasModal";
import { LevelUpModal } from "./LevelUpModal";
import { AchievementToast, useAchievementToast } from "./AchievementToast";
import { useLevelUp } from "@/hooks/useLevelUp";

interface Props {
  pessoa: Doc<"pessoas">;
  data: string;
  tvMode?: boolean;
  filterBusca?: string;
  filterCategoria?: string;
}

export function PersonColumn({ pessoa, data, tvMode, filterBusca, filterCategoria }: Props) {
  const token = useSessionToken();
  const [showAtribuir, setShowAtribuir] = useState(false);
  const gerarParaData = useMutation(api.tarefas.recorrentes.gerarParaData);
  const { current: achievementToast, push: pushAchievements } = useAchievementToast();

  // Gera lançamentos recorrentes ao carregar/trocar de data
  const geradoKey = useRef("");
  useEffect(() => {
    const key = `${pessoa._id}:${data}`;
    if (!token || geradoKey.current === key) return;
    geradoKey.current = key;
    gerarParaData({ sessionToken: token, pessoaId: pessoa._id, data }).catch(() => {});
  }, [token, pessoa._id, data, gerarParaData]);
  const [levelUpEv, setLevelUpEv] = useState<{
    nivelAnterior: number;
    nivelNovo: number;
    tituloNovo: string;
  } | null>(null);

  const lancamentos = useQuery(
    api.tarefas.lancamentos.listByPessoaDate,
    token ? { sessionToken: token, pessoaId: pessoa._id, data } : "skip"
  );
  const removeLanc = useMutation(api.tarefas.lancamentos.remove);

  // Detectar level up pendente e disparar modal
  useLevelUp(pessoa._id, (ev) => {
    setLevelUpEv({ nivelAnterior: ev.nivelAnterior, nivelNovo: ev.nivelNovo, tituloNovo: ev.tituloNovo });
  });

  // Filtrar lançamentos por busca e categoria
  const filteredLancamentos = useMemo(() => {
    if (!lancamentos) return undefined;
    if (!filterBusca && !filterCategoria) return lancamentos;
    return lancamentos.filter((l) => {
      if (filterBusca) {
        const term = filterBusca.toLowerCase();
        if (!l.nomeSnapshot.toLowerCase().includes(term)) return false;
      }
      if (filterCategoria) {
        const cat = (l as any).categoriaSnapshot as string | undefined;
        if (cat && cat !== filterCategoria) return false;
      }
      return true;
    });
  }, [lancamentos, filterBusca, filterCategoria]);

  const total = filteredLancamentos?.length ?? 0;
  const feitas = filteredLancamentos?.filter((l) => l.completada).length ?? 0;
  const pctDia = total > 0 ? Math.round((feitas / total) * 100) : 0;

  return (
    <>
      <motion.div
        className={`flex flex-col gap-3 ${tvMode ? "min-w-0 w-full" : "min-w-[280px] md:min-w-0"}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header da coluna */}
        <div className="rounded-2xl bg-white border p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <PersonAvatar pessoa={pessoa} size={48} />
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold truncate">
                {pessoa.apelido ?? pessoa.nome}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{feitas}/{total} hoje</span>
                {pessoa.streakDias >= 2 && (
                  <span className="inline-flex items-center gap-0.5 text-orange-500 font-semibold">
                    <Flame size={11} /> {pessoa.streakDias}d
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm font-medium">
              <span className={pctDia === 100 ? "text-success font-bold" : "text-slate-500"}>
                {pctDia}%
              </span>
            </div>
          </div>

          {/* Barra de progresso do dia */}
          {total > 0 && (
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${pctDia === 100 ? "bg-success" : "bg-primary"}`}
                animate={{ width: `${pctDia}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {/* Barra de XP */}
          <XPBar xpTotal={pessoa.xpTotal} nivel={pessoa.nivelAtual} />
        </div>

        {/* Lista de tarefas */}
        <div className="space-y-1.5">
          {filteredLancamentos === undefined ? (
            <div className="rounded-xl bg-white border p-4 text-center text-slate-400 text-sm animate-pulse">
              Carregando...
            </div>
          ) : filteredLancamentos.length === 0 ? (
            <div className="rounded-xl bg-white border border-dashed p-4 text-center text-slate-400 text-sm">
              {filterBusca || filterCategoria ? "Nenhuma tarefa com esses filtros" : "Nenhuma tarefa hoje"}
            </div>
          ) : (
            filteredLancamentos.map((lanc) => (
              <div key={lanc._id} className="group relative">
                <TaskCheckButton lancamento={lanc} onAchievements={pushAchievements} />
                <button
                  onClick={() => token && removeLanc({ sessionToken: token, id: lanc._id })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-danger rounded transition-all"
                  aria-label="Remover"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Botão adicionar */}
        <button
          onClick={() => setShowAtribuir(true)}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-3 text-sm text-slate-400 hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} /> Adicionar tarefa
        </button>
      </motion.div>

      {showAtribuir && (
        <AtribuirTarefasModal
          pessoaId={pessoa._id}
          pessoaNome={pessoa.apelido ?? pessoa.nome}
          data={data}
          onClose={() => setShowAtribuir(false)}
        />
      )}

      <AchievementToast achievement={achievementToast} />

      {levelUpEv && (
        <LevelUpModal
          pessoa={pessoa}
          nivelAnterior={levelUpEv.nivelAnterior}
          nivelNovo={levelUpEv.nivelNovo}
          onClose={() => setLevelUpEv(null)}
        />
      )}
    </>
  );
}
