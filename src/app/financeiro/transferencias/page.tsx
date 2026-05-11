"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Plus,
  ChevronLeft,
  ArrowRight,
  Trash2,
  ArrowLeftRight,
  X as XIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import {
  TransferenciaForm,
} from "@/components/financeiro/TransferenciaForm";
import { getIconeConta } from "@/components/financeiro/ContaForm";
import { currentMonth } from "@/lib/monthUtils";
import { formatBRL, formatDate } from "@/lib/formatters";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function TransferenciasPage() {
  const token = useSessionToken();
  const search = useSearchParams();
  const router = useRouter();
  const contaIdParam = search.get("contaId") as Id<"contas"> | null;

  const [mes, setMes] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"transferencias"> | null>(null);

  const transferencias = useQuery(
    api.financeiro.transferencias.list,
    token
      ? {
          sessionToken: token,
          mes,
          contaId: contaIdParam ?? undefined,
        }
      : "skip"
  );
  const contas = useQuery(
    api.financeiro.contas.list,
    token ? { sessionToken: token } : "skip"
  );
  const remove = useMutation(api.financeiro.transferencias.remove);

  const contaMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof contas>[number]>();
    contas?.forEach((c) => m.set(c._id, c));
    return m;
  }, [contas]);

  const contaFiltro = contaIdParam ? contaMap.get(contaIdParam) : undefined;

  const total = transferencias?.reduce((s, t) => s + t.valor, 0) ?? 0;

  function clearFilter() {
    router.push("/financeiro/transferencias");
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl"
    >
      <motion.div
        variants={item}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <Link
            href="/financeiro/contas"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
          >
            <ChevronLeft size={14} /> Contas
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Transferências</h1>
          <p className="text-slate-500 text-sm">
            Total no mês:{" "}
            <span className="font-mono font-semibold text-slate-800">
              {formatBRL(total)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova
          </Button>
        </div>
      </motion.div>

      {contaFiltro && (
        <motion.div
          variants={item}
          className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm"
        >
          <span className="text-slate-500">Filtrando por:</span>
          <span className="font-medium" style={{ color: contaFiltro.cor }}>
            {contaFiltro.nome}
          </span>
          <button
            onClick={clearFilter}
            className="ml-auto text-slate-400 hover:text-slate-700"
            aria-label="Limpar filtro"
          >
            <XIcon size={14} />
          </button>
        </motion.div>
      )}

      {transferencias === undefined ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : transferencias.length === 0 ? (
        <motion.div
          variants={item}
          className="text-center py-16 border-2 border-dashed rounded-2xl"
        >
          <ArrowLeftRight size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhuma transferência neste mês</p>
          <p className="text-sm text-slate-400 mb-4">
            Registre movimentações entre suas contas
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova Transferência
          </Button>
        </motion.div>
      ) : (
        <ul className="space-y-2">
          {transferencias.map((t) => {
            const origem = contaMap.get(t.contaOrigemId);
            const destino = contaMap.get(t.contaDestinoId);
            const OIcon = getIconeConta(origem?.icone);
            const DIcon = getIconeConta(destino?.icone);
            return (
              <motion.li
                key={t._id}
                variants={item}
                className="rounded-xl bg-white border p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          background: `${origem?.cor ?? "#94A3B8"}20`,
                          color: origem?.cor ?? "#94A3B8",
                        }}
                      >
                        <OIcon size={14} />
                      </span>
                      <span className="font-medium truncate">
                        {origem?.nome ?? "Conta excluída"}
                      </span>
                    </span>
                    <ArrowRight size={14} className="text-slate-400 shrink-0" />
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          background: `${destino?.cor ?? "#94A3B8"}20`,
                          color: destino?.cor ?? "#94A3B8",
                        }}
                      >
                        <DIcon size={14} />
                      </span>
                      <span className="font-medium truncate">
                        {destino?.nome ?? "Conta excluída"}
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDate(t.data)}
                    {t.descricao && <> · {t.descricao}</>}
                  </div>
                </div>
                <div className="font-mono font-semibold text-slate-800 shrink-0">
                  {formatBRL(t.valor)}
                </div>
                <button
                  onClick={() => setDeleteId(t._id)}
                  className="p-1.5 text-slate-300 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                  aria-label="Excluir transferência"
                >
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <TransferenciaForm
          onClose={() => setShowForm(false)}
          defaultContaOrigemId={contaIdParam ?? undefined}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!token || !deleteId) return;
          try {
            await remove({ sessionToken: token, id: deleteId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao excluir transferência";
            window.alert(msg);
          }
        }}
        title="Excluir transferência"
        description="Tem certeza que deseja excluir esta transferência? Os saldos das contas serão recalculados automaticamente."
      />
    </motion.div>
  );
}
