"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { getTituloByNivel } from "@/lib/levelTitles";
import { calcularNivel } from "@/lib/xpCalculator";
import { PersonAvatar } from "./PersonAvatar";
import { PersonForm } from "./PersonForm";
import { Button } from "@/components/ui/button";

interface Props {
  pessoa: Doc<"pessoas">;
}

export function PersonCard({ pessoa }: Props) {
  const token = useSessionToken();
  const [editing, setEditing] = useState(false);
  const removePessoa = useMutation(api.pessoas.remove);
  const titulo = getTituloByNivel(pessoa.nivelAtual);
  const { xpAtual, xpProximo } = calcularNivel(pessoa.xpTotal);
  const pct = Math.min((xpAtual / xpProximo) * 100, 100);

  return (
    <>
      <motion.div
        className="rounded-2xl bg-white border p-5 shadow-sm flex flex-col gap-4"
        whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <PersonAvatar pessoa={pessoa} size={52} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-base truncate">
              {pessoa.apelido ?? pessoa.nome}
            </div>
            <div className="text-xs font-medium" style={{ color: titulo.corClasse }}>
              Nível {pessoa.nivelAtual} · {titulo.titulo}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Editar">
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => token && removePessoa({ sessionToken: token, id: pessoa._id })}
              aria-label="Remover"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span className="font-gamer font-bold text-amber-500">{pessoa.xpTotal} XP</span>
            <span>Próximo: {xpProximo - xpAtual} XP</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${titulo.corClasse}, #FBBF24)` }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="font-bold text-slate-800">{pessoa.tarefasCompletadasTotal}</div>
            <div className="text-slate-500">Tarefas</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="font-bold text-orange-500">🔥 {pessoa.streakDias}</div>
            <div className="text-slate-500">Streak</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="font-bold text-slate-800 capitalize">{pessoa.tipo}</div>
            <div className="text-slate-500">Tipo</div>
          </div>
        </div>
      </motion.div>

      {editing && <PersonForm pessoa={pessoa} onClose={() => setEditing(false)} />}
    </>
  );
}
