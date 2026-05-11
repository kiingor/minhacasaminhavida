"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  ChevronLeft,
  ChevronDown,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContaForm, getIconeConta, type TipoConta } from "@/components/financeiro/ContaForm";
import { AtualizarSaldoDialog } from "@/components/financeiro/AtualizarSaldoDialog";
import { SparklineSaldo } from "@/components/financeiro/SparklineSaldo";
import { formatBRL } from "@/lib/formatters";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const TIPO_LABELS: Record<TipoConta, string> = {
  corrente: "Corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  aplicacao: "Aplicação",
};

interface EditState {
  _id: Id<"contas">;
  nome: string;
  tipo: TipoConta;
  banco?: string;
  saldoInicial: number;
  saldoManual?: number;
  cor: string;
  icone: string;
  ativa: boolean;
}

interface AtualizarSaldoState {
  contaId: Id<"contas">;
  contaNome: string;
  saldoAtual?: number;
  cor: string;
}

export default function ContasPage() {
  const token = useSessionToken();
  const contas = useQuery(
    api.financeiro.contas.listComSaldos,
    token ? { sessionToken: token } : "skip"
  );
  const consolidado = useQuery(
    api.financeiro.contas.saldoConsolidado,
    token ? { sessionToken: token } : "skip"
  );
  const remove = useMutation(api.financeiro.contas.remove);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"contas"> | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [atualizarSaldo, setAtualizarSaldo] = useState<AtualizarSaldoState | null>(null);

  // Total especifico de aplicacoes (saldo final por conta tipo=aplicacao)
  const totalAplicacoes =
    contas?.filter((c) => c.tipo === "aplicacao" && c.ativa).reduce((s, c) => s + c.saldo.saldoFinal, 0) ?? 0;
  const qtdAplicacoes = contas?.filter((c) => c.tipo === "aplicacao" && c.ativa).length ?? 0;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (!token || !deleteId) return;
    try {
      await remove({ sessionToken: token, id: deleteId });
      setDeleteId(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Erro ao excluir");
      setDeleteId(null);
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl"
    >
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
          >
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Contas</h1>
          <p className="text-slate-500">Gerencie suas contas e veja o saldo de cada uma</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/financeiro/transferencias">
            <Button variant="outline" className="text-sm">
              <ArrowLeftRight size={16} /> Transferências
            </Button>
          </Link>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova Conta
          </Button>
        </div>
      </motion.div>

      {/* Saldo consolidado + destaque aplicacoes */}
      <motion.div variants={item} className="grid gap-3 md:grid-cols-3">
        {consolidado ? (
          <div className="rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white p-6 shadow-md md:col-span-2">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Sparkles size={14} /> Saldo Consolidado
            </div>
            <div className="font-mono font-extrabold text-3xl md:text-4xl mt-1">
              {formatBRL(consolidado.total)}
            </div>
            <div className="text-xs text-white/80 mt-1">
              {consolidado.totalContasAtivas} {consolidado.totalContasAtivas === 1 ? "conta ativa" : "contas ativas"}
            </div>
          </div>
        ) : (
          <Skeleton className="h-32 rounded-2xl md:col-span-2" />
        )}
        {contas !== undefined ? (
          <div
            className={`rounded-2xl p-5 shadow-md border ${
              qtdAplicacoes > 0
                ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white border-transparent"
                : "bg-white border-slate-200 text-slate-400"
            }`}
          >
            <div className={`flex items-center gap-2 text-xs ${qtdAplicacoes > 0 ? "text-white/80" : "text-slate-400"}`}>
              <TrendingUp size={14} /> Aplicações
            </div>
            <div className={`font-mono font-extrabold text-2xl mt-1 ${qtdAplicacoes > 0 ? "text-white" : "text-slate-400"}`}>
              {formatBRL(totalAplicacoes)}
            </div>
            <div className={`text-xs mt-1 ${qtdAplicacoes > 0 ? "text-white/80" : "text-slate-400"}`}>
              {qtdAplicacoes === 0
                ? "Nenhuma aplicação cadastrada"
                : qtdAplicacoes === 1
                ? "1 aplicação ativa"
                : `${qtdAplicacoes} aplicações ativas`}
            </div>
          </div>
        ) : (
          <Skeleton className="h-32 rounded-2xl" />
        )}
      </motion.div>

      {/* Lista de contas */}
      {contas === undefined ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : contas.length === 0 ? (
        <motion.div
          variants={item}
          className="text-center py-16 border-2 border-dashed rounded-2xl"
        >
          <Wallet size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhuma conta cadastrada</p>
          <p className="text-sm text-slate-400 mb-4">
            Comece criando sua primeira conta para acompanhar seu dinheiro
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova Conta
          </Button>
        </motion.div>
      ) : (
        <ul className="space-y-2">
          {contas.map((c) => {
            const Icon = getIconeConta(c.icone);
            const expandido = expandedIds.has(c._id);
            const isAplicacao = c.tipo === "aplicacao";
            return (
              <motion.li
                key={c._id}
                variants={item}
                className={`rounded-xl border bg-white overflow-hidden ${
                  c.ativa ? "" : "opacity-60"
                }`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${c.cor}20`, color: c.cor }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{c.nome}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {TIPO_LABELS[c.tipo]}
                      </span>
                      {!c.ativa && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          Inativa
                        </span>
                      )}
                      {c.saldo.ehManual && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                          Saldo manual
                        </span>
                      )}
                    </div>
                    {c.banco && (
                      <div className="text-xs text-slate-400 mt-0.5">{c.banco}</div>
                    )}
                    {isAplicacao && (
                      <div className="mt-2 hidden sm:block">
                        <SparklineAplicacao contaId={c._id} cor={c.cor} />
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold ${
                        c.saldo.saldoFinal < 0 ? "text-danger" : "text-slate-800"
                      }`}
                    >
                      {formatBRL(c.saldo.saldoFinal)}
                    </div>
                    <button
                      onClick={() => toggleExpand(c._id)}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary mt-0.5"
                      aria-expanded={expandido}
                      aria-label={expandido ? "Recolher detalhes" : "Ver detalhes"}
                    >
                      Detalhes
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${expandido ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                  {isAplicacao && (
                    <button
                      onClick={() =>
                        setAtualizarSaldo({
                          contaId: c._id,
                          contaNome: c.nome,
                          saldoAtual: c.saldoManual,
                          cor: c.cor,
                        })
                      }
                      className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors"
                      aria-label="Atualizar saldo"
                      title="Atualizar saldo"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setEditing({
                        _id: c._id,
                        nome: c.nome,
                        tipo: c.tipo,
                        banco: c.banco,
                        saldoInicial: c.saldoInicial,
                        saldoManual: c.saldoManual,
                        cor: c.cor,
                        icone: c.icone,
                        ativa: c.ativa,
                      })
                    }
                    className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    aria-label="Editar conta"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(c._id)}
                    className="p-1.5 text-slate-300 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                    aria-label="Excluir conta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Sparkline mobile (abaixo do header em telas pequenas) */}
                {isAplicacao && (
                  <div className="sm:hidden px-4 pb-3 -mt-1">
                    <SparklineAplicacao contaId={c._id} cor={c.cor} />
                  </div>
                )}

                <AnimatePresence>
                  {expandido && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                    >
                      <div className="p-4 space-y-1.5 text-sm">
                        <Linha label="Saldo inicial" valor={c.saldo.saldoInicial} />
                        <Linha
                          label="Receitas recebidas"
                          valor={c.saldo.totalReceitas}
                          icon={<ArrowUpRight size={12} className="text-emerald-500" />}
                        />
                        <Linha
                          label="Despesas pagas"
                          valor={-c.saldo.totalDespesas}
                          icon={<ArrowDownRight size={12} className="text-rose-500" />}
                        />
                        <Linha
                          label="Transferências recebidas"
                          valor={c.saldo.totalTransferenciasEntradas}
                          icon={<ArrowUpRight size={12} className="text-cyan-500" />}
                        />
                        <Linha
                          label="Transferências enviadas"
                          valor={-c.saldo.totalTransferenciasSaidas}
                          icon={<ArrowDownRight size={12} className="text-cyan-500" />}
                        />
                        <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between font-medium">
                          <span>Saldo calculado</span>
                          <span className="font-mono">{formatBRL(c.saldo.saldoCalculado)}</span>
                        </div>
                        {c.saldo.ehManual && (
                          <div className="flex items-center justify-between font-medium text-violet-700">
                            <span>Saldo manual (vigente)</span>
                            <span className="font-mono">{formatBRL(c.saldo.saldoFinal)}</span>
                          </div>
                        )}
                        <div className="pt-1">
                          <Link
                            href={`/financeiro/transferencias?contaId=${c._id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Ver transferências desta conta →
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && <ContaForm onClose={() => setShowForm(false)} />}
      {editing && <ContaForm onClose={() => setEditing(null)} editData={editing} />}
      {atualizarSaldo && (
        <AtualizarSaldoDialog
          contaId={atualizarSaldo.contaId}
          contaNome={atualizarSaldo.contaNome}
          saldoAtual={atualizarSaldo.saldoAtual}
          cor={atualizarSaldo.cor}
          onClose={() => setAtualizarSaldo(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir conta"
        description="Tem certeza que deseja excluir esta conta? Não será possível excluir se houver lançamentos associados."
      />

      {removeError && (
        <ConfirmDialog
          open
          onClose={() => setRemoveError(null)}
          onConfirm={() => setRemoveError(null)}
          title="Não é possível excluir"
          description={removeError}
          confirmLabel="Entendi"
        />
      )}
    </motion.div>
  );
}

function Linha({
  label,
  valor,
  icon,
}: {
  label: string;
  valor: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`font-mono ${valor < 0 ? "text-rose-600" : "text-slate-700"}`}>
        {formatBRL(valor)}
      </span>
    </div>
  );
}

// Sparkline para conta de aplicacao — busca historico de saldo manual
function SparklineAplicacao({ contaId, cor }: { contaId: Id<"contas">; cor: string }) {
  const token = useSessionToken();
  const historico = useQuery(
    api.financeiro.contas.historicoSaldoAplicacao,
    token ? { sessionToken: token, contaId, meses: 12 } : "skip"
  );

  if (historico === undefined) {
    return <div className="h-9 w-full bg-slate-50 rounded animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-w-[180px]">
        <SparklineSaldo data={historico} cor={cor} height={32} />
      </div>
      {historico.length > 0 && (
        <span className="text-[10px] text-slate-400">
          {historico.length} {historico.length === 1 ? "atualização" : "atualizações"}
        </span>
      )}
    </div>
  );
}
