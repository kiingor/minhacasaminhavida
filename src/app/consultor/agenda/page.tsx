"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, Check, X, Trash2, Pencil } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AgendarReuniaoDialog } from "@/components/consultor/AgendarReuniaoDialog";
import { Id } from "../../../../convex/_generated/dataModel";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

interface ReuniaoBase {
  _id: Id<"reunioesConsultor">;
  titulo: string;
  dataHora: string;
  duracaoMinutos: number;
  pauta?: string;
  status: "agendada" | "realizada" | "cancelada";
  familyId: string;
  nomeFamilia?: string;
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgendaPage() {
  const token = useSessionToken();
  const reunioes = useQuery(
    api.consultor.reunioes,
    token ? { sessionToken: token } : "skip"
  );
  const atualizar = useMutation(api.consultor.atualizarReuniao);
  const remover = useMutation(api.consultor.removerReuniao);
  const [editing, setEditing] = useState<ReuniaoBase | null>(null);

  const agora = new Date().toISOString();
  const futuras = reunioes?.filter((r) => r.dataHora >= agora && r.status === "agendada") ?? [];
  const passadas = reunioes?.filter((r) => r.dataHora < agora || r.status !== "agendada") ?? [];

  async function handleStatus(id: Id<"reunioesConsultor">, status: "realizada" | "cancelada") {
    if (!token) return;
    try {
      await atualizar({ sessionToken: token, id, status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleRemover(id: Id<"reunioesConsultor">) {
    if (!token) return;
    if (!window.confirm("Excluir esta reunião?")) return;
    try {
      await remover({ sessionToken: token, id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <Link href="/consultor" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="font-display text-3xl font-extrabold mt-2 flex items-center gap-2">
          <CalendarClock className="text-emerald-500" size={28} /> Agenda
        </h1>
        <p className="text-slate-500">Suas reuniões agendadas com clientes.</p>
      </motion.div>

      {reunioes === undefined ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <motion.section variants={item} className="space-y-2">
            <h2 className="font-display font-bold text-lg">
              Próximas {futuras.length > 0 && <span className="text-slate-400 text-sm font-normal">({futuras.length})</span>}
            </h2>
            {futuras.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma reunião futura.</p>
            ) : (
              <div className="space-y-2">
                {futuras.map((r) => (
                  <ReuniaoCard
                    key={r._id}
                    reuniao={r}
                    onEdit={() => setEditing(r)}
                    onMarcarRealizada={() => handleStatus(r._id, "realizada")}
                    onCancelar={() => handleStatus(r._id, "cancelada")}
                    onRemover={() => handleRemover(r._id)}
                  />
                ))}
              </div>
            )}
          </motion.section>

          {passadas.length > 0 && (
            <motion.section variants={item} className="space-y-2">
              <h2 className="font-display font-bold text-lg">Histórico</h2>
              <div className="space-y-2">
                {passadas.map((r) => (
                  <ReuniaoCard
                    key={r._id}
                    reuniao={r}
                    onEdit={() => setEditing(r)}
                    onRemover={() => handleRemover(r._id)}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </>
      )}

      {editing && (
        <AgendarReuniaoDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          familyId={editing.familyId}
          reuniaoExistente={editing}
        />
      )}
    </motion.div>
  );
}

function ReuniaoCard({
  reuniao,
  onEdit,
  onMarcarRealizada,
  onCancelar,
  onRemover,
}: {
  reuniao: ReuniaoBase;
  onEdit: () => void;
  onMarcarRealizada?: () => void;
  onCancelar?: () => void;
  onRemover: () => void;
}) {
  const statusBg =
    reuniao.status === "agendada"
      ? "bg-blue-50 border-blue-200"
      : reuniao.status === "realizada"
        ? "bg-emerald-50 border-emerald-200"
        : "bg-slate-50 border-slate-200 opacity-70";

  return (
    <div className={`rounded-xl border p-3 ${statusBg}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate">{reuniao.titulo}</div>
          <div className="text-xs text-slate-500">
            {formatDataHora(reuniao.dataHora)} · {reuniao.duracaoMinutos}min
          </div>
          <Link
            href={`/consultor/${reuniao.familyId}`}
            className="text-xs text-primary font-medium hover:underline"
          >
            {reuniao.nomeFamilia ?? "Cliente"} →
          </Link>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
            reuniao.status === "agendada"
              ? "bg-blue-100 text-blue-700"
              : reuniao.status === "realizada"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {reuniao.status}
        </span>
      </div>
      {reuniao.pauta && (
        <div className="text-xs text-slate-600 mb-2 whitespace-pre-wrap">{reuniao.pauta}</div>
      )}
      <div className="flex items-center justify-end gap-1 flex-wrap">
        {onMarcarRealizada && (
          <Button size="sm" variant="outline" onClick={onMarcarRealizada}>
            <Check size={12} /> Realizada
          </Button>
        )}
        {onCancelar && (
          <Button size="sm" variant="outline" onClick={onCancelar}>
            <X size={12} /> Cancelar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil size={12} /> Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemover}>
          <Trash2 size={12} /> Excluir
        </Button>
      </div>
    </div>
  );
}
