"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Flame, Zap } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { getTituloByNivel } from "@/lib/levelTitles";
import { calcularNivel } from "@/lib/xpCalculator";
import { PersonAvatar } from "./PersonAvatar";
import { PersonForm } from "./PersonForm";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";

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
      <Card className="flex flex-col gap-4" interactive>
        <div className="flex items-start gap-3">
          <PersonAvatar pessoa={pessoa} size={56} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-base truncate text-ink-900">
              {pessoa.apelido ?? pessoa.nome}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Pill tone="neutral" size="xs">Nv {pessoa.nivelAtual}</Pill>
              <span className="text-[11px] text-ink-400">{titulo.titulo}</span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <IconButton variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Editar">
              <Pencil size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => token && removePessoa({ sessionToken: token, id: pessoa._id })}
              aria-label="Remover"
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-coral-600 inline-flex items-center gap-1">
              <Zap size={12} /> {pessoa.xpTotal.toLocaleString("pt-BR")} XP
            </span>
            <span className="text-ink-400">Faltam {(xpProximo - xpAtual).toLocaleString("pt-BR")}</span>
          </div>
          <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-coral-500"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-cream-50 p-3">
            <div className="font-display font-bold text-lg text-ink-900">{pessoa.tarefasCompletadasTotal}</div>
            <div className="text-ink-400 text-[10px] uppercase tracking-wide font-semibold mt-0.5">Tarefas</div>
          </div>
          <div className="rounded-2xl bg-cream-50 p-3">
            <div className="font-display font-bold text-lg text-ink-900 inline-flex items-center gap-1">
              <Flame size={14} className="text-coral-500" /> {pessoa.streakDias}
            </div>
            <div className="text-ink-400 text-[10px] uppercase tracking-wide font-semibold mt-0.5">Streak</div>
          </div>
          <div className="rounded-2xl bg-cream-50 p-3">
            <div className="font-display font-bold text-base text-ink-900 capitalize">{pessoa.tipo}</div>
            <div className="text-ink-400 text-[10px] uppercase tracking-wide font-semibold mt-0.5">Tipo</div>
          </div>
        </div>
      </Card>

      {editing && <PersonForm pessoa={pessoa} onClose={() => setEditing(false)} />}
    </>
  );
}
