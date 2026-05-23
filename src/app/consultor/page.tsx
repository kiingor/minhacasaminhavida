"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Briefcase,
  UserPlus,
  MessageCircle,
  CalendarClock,
  ChevronRight,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConviteFamiliaDialog } from "@/components/consultor/ConviteFamiliaDialog";
import { formatDate } from "@/lib/formatters";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} ${hora}:${min}`;
}

export default function ConsultorHomePage() {
  const token = useSessionToken();
  const [showConviteDialog, setShowConviteDialog] = useState(false);

  const dashboard = useQuery(
    api.consultor.dashboardConsultor,
    token ? { sessionToken: token } : "skip"
  );
  const clientes = useQuery(
    api.consultor.meusClientes,
    token ? { sessionToken: token } : "skip"
  );

  const ativos = clientes?.filter((c) => c.status === "ativo") ?? [];
  const pendentes = clientes?.filter((c) => c.status === "pendente") ?? [];
  const revogados = clientes?.filter((c) => c.status === "revogado") ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Briefcase className="text-primary" size={28} /> Painel do Consultor
          </h1>
          <p className="text-slate-500">Acompanhe seus clientes e organize suas reuniões.</p>
        </div>
        <Button onClick={() => setShowConviteDialog(true)}>
          <UserPlus size={16} /> Convidar nova família
        </Button>
      </motion.div>

      {/* Cards de estatisticas */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="text-primary" size={20} />}
          label="Clientes ativos"
          value={dashboard?.qtdClientesAtivos ?? "—"}
        />
        <StatCard
          icon={<Clock className="text-amber-500" size={20} />}
          label="Convites pendentes"
          value={dashboard?.qtdConvitesPendentes ?? "—"}
        />
        <StatCard
          icon={<MessageCircle className="text-blue-500" size={20} />}
          label="Comentários abertos"
          value={dashboard?.qtdComentariosAbertos ?? "—"}
        />
        <StatCard
          icon={<CalendarClock className="text-emerald-500" size={20} />}
          label="Próximas reuniões"
          value={dashboard?.qtdReunioesProximas ?? "—"}
        />
      </motion.div>

      {/* Atalhos */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/consultor/comentarios"
          className="rounded-2xl bg-white border border-slate-200 p-4 hover:bg-slate-50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <MessageCircle className="text-blue-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800">Comentários abertos</div>
            <div className="text-xs text-slate-500">Caixa de entrada agregada de todas as famílias</div>
          </div>
          <ChevronRight className="text-slate-400" size={18} />
        </Link>
        <Link
          href="/consultor/agenda"
          className="rounded-2xl bg-white border border-slate-200 p-4 hover:bg-slate-50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CalendarClock className="text-emerald-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800">Agenda de reuniões</div>
            <div className="text-xs text-slate-500">Próximas e passadas</div>
          </div>
          <ChevronRight className="text-slate-400" size={18} />
        </Link>
      </motion.div>

      {/* Lista de clientes ativos */}
      <motion.section variants={item} className="space-y-3">
        <h2 className="font-display text-xl font-bold">
          Clientes ativos {ativos.length > 0 && <span className="text-slate-400 text-sm font-normal">({ativos.length})</span>}
        </h2>
        {clientes === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : ativos.length === 0 ? (
          <EmptyState
            titulo="Nenhum cliente ativo"
            mensagem="Convide uma família para começar. Você gera um código e seu cliente aprova nas configurações dele."
            cta={
              <Button onClick={() => setShowConviteDialog(true)}>
                <UserPlus size={16} /> Convidar agora
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ativos.map((c) => (
              <Link
                key={c.acessoId}
                href={`/consultor/${c.familyId}`}
                className="rounded-2xl bg-white border border-slate-200 p-4 hover:bg-slate-50 transition-colors block"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-slate-800 truncate">
                      {c.nomeFamilia}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      Acesso desde {c.aprovadoEm ? formatDate(c.aprovadoEm.slice(0, 10)) : "—"}
                    </div>
                  </div>
                  <ChevronRight className="text-slate-400 shrink-0" size={18} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} />
                    {c.comentariosPendentes} pendente{c.comentariosPendentes === 1 ? "" : "s"}
                  </span>
                  {c.proximaReuniao && (
                    <span className="flex items-center gap-1">
                      <CalendarClock size={12} />
                      {formatDataHora(c.proximaReuniao.dataHora)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* Convites pendentes */}
      {pendentes.length > 0 && (
        <motion.section variants={item} className="space-y-3">
          <h2 className="font-display text-xl font-bold">
            Convites pendentes <span className="text-slate-400 text-sm font-normal">({pendentes.length})</span>
          </h2>
          <div className="space-y-2">
            {pendentes.map((c) => (
              <div
                key={c.acessoId}
                className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3"
              >
                <Clock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 mb-1">Aguardando aprovação</div>
                  <div className="text-xs text-slate-600 mb-2">
                    Compartilhe o código com seu cliente. Validade: 30 dias da criação.
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-700 bg-white border border-amber-300 rounded-md px-2 py-1 inline-block break-all">
                    {c.conviteCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Acessos revogados (historico) */}
      {revogados.length > 0 && (
        <motion.section variants={item} className="space-y-3">
          <details className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">
              Acessos revogados ({revogados.length})
            </summary>
            <div className="mt-3 space-y-2">
              {revogados.map((c) => (
                <div key={c.acessoId} className="text-sm text-slate-500">
                  {c.nomeFamilia}
                </div>
              ))}
            </div>
          </details>
        </motion.section>
      )}

      <ConviteFamiliaDialog
        open={showConviteDialog}
        onClose={() => setShowConviteDialog(false)}
      />
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 md:p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 truncate">{label}</span>
        {icon}
      </div>
      <div className="font-display text-2xl md:text-3xl font-extrabold text-slate-800">{value}</div>
    </div>
  );
}

function EmptyState({
  titulo,
  mensagem,
  cta,
}: {
  titulo: string;
  mensagem: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
      <AlertCircle className="text-slate-300 mx-auto mb-3" size={32} />
      <div className="font-medium text-slate-700 mb-1">{titulo}</div>
      <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">{mensagem}</p>
      {cta}
    </div>
  );
}
