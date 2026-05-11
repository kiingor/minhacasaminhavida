"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Trash2, Check, AlertCircle, Calendar } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSession, useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/formatters";
import { Id } from "../../../../convex/_generated/dataModel";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function ConsultorAcessoPage() {
  const token = useSessionToken();
  const { session } = useSession();
  const isAdmin = session?.role === "admin";

  const consultores = useQuery(
    api.consultor.consultoresDaFamilia,
    token ? { sessionToken: token } : "skip"
  );
  const reunioes = useQuery(
    api.consultor.reunioes,
    token ? { sessionToken: token } : "skip"
  );

  const aceitar = useMutation(api.consultor.aceitarConvite);
  const revogar = useMutation(api.consultor.revogarAcesso);

  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAceitar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await aceitar({ sessionToken: token, conviteCode: codigo });
      setCodigo("");
      setSuccess("Convite aprovado! Seu consultor já tem acesso.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aceitar convite");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevogar(acessoId: Id<"acessosConsultor">) {
    if (!token) return;
    if (!window.confirm("Revogar o acesso deste consultor? Ele não poderá mais ver seus dados.")) return;
    try {
      await revogar({ sessionToken: token, acessoId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao revogar");
    }
  }

  const ativos = consultores?.filter((c) => c.status === "ativo") ?? [];
  const revogados = consultores?.filter((c) => c.status === "revogado") ?? [];
  const proximasReunioes = reunioes?.filter((r) => r.status === "agendada" && r.dataHora >= new Date().toISOString()) ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-2xl">
      <motion.div variants={item}>
        <Link href="/configuracoes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="font-display text-3xl font-extrabold mt-2 flex items-center gap-2">
          <Briefcase className="text-primary" size={28} /> Consultor financeiro
        </h1>
        <p className="text-slate-500">
          Aprove o acesso de um consultor à sua família. Ele verá seus dados em modo leitura e poderá deixar comentários.
        </p>
      </motion.div>

      {/* Aceitar convite */}
      {isAdmin ? (
        <motion.div variants={item} className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Aprovar novo convite</h2>
          <p className="text-sm text-slate-500">
            Recebeu um código de um consultor? Cole abaixo para liberar o acesso dele.
          </p>
          <form onSubmit={handleAceitar} className="space-y-3">
            <Input
              label="Código de convite"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: 1A2B3C4D5E6F"
              required
            />
            {error && (
              <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={16} /> {success}
              </p>
            )}
            <Button type="submit" disabled={loading || codigo.trim().length === 0}>
              {loading ? "Aprovando..." : "Aprovar acesso"}
            </Button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          variants={item}
          className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-sm"
        >
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <p className="text-amber-900">
            Apenas o administrador da família pode aprovar ou revogar acesso de consultores.
          </p>
        </motion.div>
      )}

      {/* Consultores ativos */}
      <motion.div variants={item} className="space-y-2">
        <h2 className="font-display font-bold text-lg">Consultores com acesso</h2>
        {consultores === undefined ? (
          <Skeleton className="h-24" />
        ) : ativos.length === 0 ? (
          <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">Nenhum consultor ativo no momento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ativos.map((c) => (
              <div
                key={c.acessoId}
                className="rounded-xl bg-white border border-slate-200 p-3 flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{c.nomeConsultor}</div>
                  <div className="text-xs text-slate-500 truncate">{c.emailConsultor}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Acesso desde {c.aprovadoEm ? formatDate(c.aprovadoEm.slice(0, 10)) : "—"}
                  </div>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => handleRevogar(c.acessoId)}>
                    <Trash2 size={12} className="text-danger" /> Revogar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Proximas reunioes */}
      {proximasReunioes.length > 0 && (
        <motion.div variants={item} className="space-y-2">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Calendar size={18} /> Próximas reuniões
          </h2>
          <div className="space-y-2">
            {proximasReunioes.map((r) => (
              <div key={r._id} className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="font-medium text-slate-800">{r.titulo}</div>
                <div className="text-xs text-slate-500">
                  {new Date(r.dataHora).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {r.duracaoMinutos}min · com {r.nomeConsultor}
                </div>
                {r.pauta && <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{r.pauta}</div>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Acessos revogados (historico) */}
      {revogados.length > 0 && (
        <motion.div variants={item}>
          <details className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">
              Acessos revogados ({revogados.length})
            </summary>
            <div className="mt-3 space-y-1">
              {revogados.map((c) => (
                <div key={c.acessoId} className="text-sm text-slate-500">
                  {c.nomeConsultor} ({c.emailConsultor})
                </div>
              ))}
            </div>
          </details>
        </motion.div>
      )}
    </motion.div>
  );
}
