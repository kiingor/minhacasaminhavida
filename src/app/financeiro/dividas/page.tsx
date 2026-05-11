"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  TrendingDown,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DividaForm,
  getIconeDivida,
  type TipoDivida,
  type TaxaPeriodicidade,
} from "@/components/financeiro/DividaForm";
import { RegistrarPagamentoDividaDialog } from "@/components/financeiro/RegistrarPagamentoDividaDialog";
import { CurvaQuitacaoChart } from "@/components/financeiro/CurvaQuitacaoChart";
import { formatBRL, formatDate } from "@/lib/formatters";
import { monthLabelLong } from "@/lib/monthUtils";
import { TermoTooltip } from "@/components/educacao/TermoTooltip";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const TIPO_LABELS: Record<TipoDivida, string> = {
  cartao: "Cartao",
  financiamento: "Financiamento",
  emprestimo: "Emprestimo",
  parcelamento: "Parcelamento",
  outro: "Outro",
};

interface EditState {
  _id: Id<"dividas">;
  nome: string;
  credor?: string;
  tipo: TipoDivida;
  valorOriginal: number;
  saldoDevedor: number;
  taxaJuros: number;
  taxaPeriodicidade: TaxaPeriodicidade;
  totalParcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  proximoVencimento: string;
  diaVencimento: number;
  cor: string;
  icone?: string;
  observacao?: string;
  ativa: boolean;
}

interface PagamentoState {
  dividaId: Id<"dividas">;
  dividaNome: string;
  saldoDevedor: number;
  valorParcela: number;
  cor: string;
}

export default function DividasPage() {
  const token = useSessionToken();
  const dividas = useQuery(
    api.financeiro.dividas.list,
    token ? { sessionToken: token } : "skip"
  );
  const resumo = useQuery(
    api.financeiro.dividas.resumo,
    token ? { sessionToken: token } : "skip"
  );
  const curva = useQuery(
    api.financeiro.dividas.curvaQuitacao,
    token ? { sessionToken: token, meses: 36 } : "skip"
  );
  const remove = useMutation(api.financeiro.dividas.remove);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"dividas"> | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<PagamentoState | null>(null);

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

  const ativas = dividas?.filter((d) => d.ativa) ?? [];
  const quitadas = dividas?.filter((d) => !d.ativa) ?? [];

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
            <ChevronLeft size={14} /> Financas
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Dividas</h1>
          <p className="text-slate-500">
            Acompanhe o{" "}
            <TermoTooltip termo="saldo-devedor">saldo devedor</TermoTooltip>{" "}
            e a curva de quitacao
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nova Divida
        </Button>
      </motion.div>

      {/* KPIs topo */}
      <motion.div variants={item} className="grid gap-3 sm:grid-cols-3">
        {resumo ? (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white p-5 shadow-md">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <CircleDollarSign size={14} /> Saldo devedor total
              </div>
              <div className="font-mono font-extrabold text-2xl md:text-3xl mt-1">
                {formatBRL(resumo.totalSaldoDevedor)}
              </div>
              <div className="text-xs text-white/80 mt-1">
                {resumo.countAtivas === 0
                  ? "Nenhuma divida ativa"
                  : resumo.countAtivas === 1
                  ? "1 divida ativa"
                  : `${resumo.countAtivas} dividas ativas`}
                {resumo.countQuitadas > 0 && ` · ${resumo.countQuitadas} quitada${resumo.countQuitadas > 1 ? "s" : ""}`}
              </div>
            </div>

            <div className="rounded-2xl bg-white border p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarClock size={14} /> Parcela do mes
              </div>
              <div className="font-mono font-extrabold text-2xl md:text-3xl mt-1 text-slate-800">
                {formatBRL(resumo.parcelaMesAtual)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {resumo.countDividasMesAtual === 0
                  ? "Nenhuma parcela vence neste mes"
                  : resumo.countDividasMesAtual === 1
                  ? "1 divida vence neste mes"
                  : `${resumo.countDividasMesAtual} dividas vencem neste mes`}
              </div>
            </div>

            <div className="rounded-2xl bg-white border p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 size={14} /> Quitacao total em
              </div>
              <div className="font-display font-extrabold text-xl md:text-2xl mt-1 text-slate-800">
                {resumo.mesQuitacaoMaisDistante
                  ? monthLabelLong(resumo.mesQuitacaoMaisDistante)
                  : "—"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {resumo.parcelasRestantesMaiorTotal > 0
                  ? `${resumo.parcelasRestantesMaiorTotal} parcela${resumo.parcelasRestantesMaiorTotal > 1 ? "s" : ""} restante${resumo.parcelasRestantesMaiorTotal > 1 ? "s" : ""}`
                  : "Sem parcelas previstas"}
              </div>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        )}
      </motion.div>

      {/* Curva de quitacao */}
      <motion.div variants={item} className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-bold text-lg">Curva de quitacao</h2>
            <p className="text-xs text-slate-500">
              Projecao mes a mes do saldo devedor consolidado (com juros)
            </p>
          </div>
        </div>
        {curva === undefined ? (
          <Skeleton className="h-[260px]" />
        ) : (
          <CurvaQuitacaoChart data={curva} />
        )}
      </motion.div>

      {/* Lista de dividas */}
      {dividas === undefined ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : dividas.length === 0 ? (
        <motion.div
          variants={item}
          className="text-center py-16 border-2 border-dashed rounded-2xl"
        >
          <ReceiptText size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhuma divida cadastrada</p>
          <p className="text-sm text-slate-400 mb-4">
            Cadastre cartoes, financiamentos e emprestimos para acompanhar a quitacao
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova Divida
          </Button>
        </motion.div>
      ) : (
        <>
          {ativas.length > 0 && (
            <motion.section variants={item} className="space-y-2">
              <h2 className="font-display font-bold text-base text-slate-700">
                Ativas ({ativas.length})
              </h2>
              <ul className="space-y-2">
                {ativas.map((d) => (
                  <DividaItem
                    key={d._id}
                    divida={d}
                    onEdit={() =>
                      setEditing({
                        _id: d._id,
                        nome: d.nome,
                        credor: d.credor,
                        tipo: d.tipo,
                        valorOriginal: d.valorOriginal,
                        saldoDevedor: d.saldoDevedor,
                        taxaJuros: d.taxaJuros,
                        taxaPeriodicidade: d.taxaPeriodicidade,
                        totalParcelas: d.totalParcelas,
                        parcelasPagas: d.parcelasPagas,
                        valorParcela: d.valorParcela,
                        proximoVencimento: d.proximoVencimento,
                        diaVencimento: d.diaVencimento,
                        cor: d.cor,
                        icone: d.icone,
                        observacao: d.observacao,
                        ativa: d.ativa,
                      })
                    }
                    onDelete={() => setDeleteId(d._id)}
                    onPagamento={() =>
                      setPagamento({
                        dividaId: d._id,
                        dividaNome: d.nome,
                        saldoDevedor: d.saldoDevedor,
                        valorParcela: d.valorParcela,
                        cor: d.cor,
                      })
                    }
                  />
                ))}
              </ul>
            </motion.section>
          )}

          {quitadas.length > 0 && (
            <motion.section variants={item} className="space-y-2">
              <h2 className="font-display font-bold text-base text-slate-500">
                Quitadas ({quitadas.length})
              </h2>
              <ul className="space-y-2">
                {quitadas.map((d) => (
                  <DividaItem
                    key={d._id}
                    divida={d}
                    onEdit={() =>
                      setEditing({
                        _id: d._id,
                        nome: d.nome,
                        credor: d.credor,
                        tipo: d.tipo,
                        valorOriginal: d.valorOriginal,
                        saldoDevedor: d.saldoDevedor,
                        taxaJuros: d.taxaJuros,
                        taxaPeriodicidade: d.taxaPeriodicidade,
                        totalParcelas: d.totalParcelas,
                        parcelasPagas: d.parcelasPagas,
                        valorParcela: d.valorParcela,
                        proximoVencimento: d.proximoVencimento,
                        diaVencimento: d.diaVencimento,
                        cor: d.cor,
                        icone: d.icone,
                        observacao: d.observacao,
                        ativa: d.ativa,
                      })
                    }
                    onDelete={() => setDeleteId(d._id)}
                    onPagamento={null}
                  />
                ))}
              </ul>
            </motion.section>
          )}
        </>
      )}

      {showForm && <DividaForm onClose={() => setShowForm(false)} />}
      {editing && <DividaForm onClose={() => setEditing(null)} editData={editing} />}
      {pagamento && (
        <RegistrarPagamentoDividaDialog
          dividaId={pagamento.dividaId}
          dividaNome={pagamento.dividaNome}
          saldoDevedor={pagamento.saldoDevedor}
          valorParcela={pagamento.valorParcela}
          cor={pagamento.cor}
          onClose={() => setPagamento(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir divida"
        description="Tem certeza? Se houver pagamentos registrados, voce precisara marcar como inativa."
      />

      {removeError && (
        <ConfirmDialog
          open
          onClose={() => setRemoveError(null)}
          onConfirm={() => setRemoveError(null)}
          title="Nao e possivel excluir"
          description={removeError}
          confirmLabel="Entendi"
        />
      )}
    </motion.div>
  );
}

interface DividaItemProps {
  divida: {
    _id: Id<"dividas">;
    nome: string;
    credor?: string;
    tipo: TipoDivida;
    saldoDevedor: number;
    valorOriginal: number;
    valorParcela: number;
    proximoVencimento: string;
    parcelasPagas: number;
    totalParcelas: number;
    taxaJuros: number;
    taxaPeriodicidade: TaxaPeriodicidade;
    cor: string;
    icone?: string;
    ativa: boolean;
  };
  onEdit: () => void;
  onDelete: () => void;
  onPagamento: (() => void) | null;
}

function DividaItem({ divida, onEdit, onDelete, onPagamento }: DividaItemProps) {
  const Icon = getIconeDivida(divida.icone);
  const parcelasRestantes =
    divida.totalParcelas > 0
      ? Math.max(0, divida.totalParcelas - divida.parcelasPagas)
      : null;
  const progressoPercent =
    divida.totalParcelas > 0
      ? Math.min(100, (divida.parcelasPagas / divida.totalParcelas) * 100)
      : divida.valorOriginal > 0
      ? Math.min(
          100,
          ((divida.valorOriginal - divida.saldoDevedor) / divida.valorOriginal) * 100
        )
      : 0;

  return (
    <li
      className={`rounded-xl border bg-white overflow-hidden ${
        divida.ativa ? "" : "opacity-60"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${divida.cor}20`, color: divida.cor }}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{divida.nome}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {TIPO_LABELS[divida.tipo]}
              </span>
              {!divida.ativa && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 size={10} /> Quitada
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              {divida.credor && <span>{divida.credor}</span>}
              {divida.credor && <span className="text-slate-300">·</span>}
              <span>
                {divida.taxaJuros > 0
                  ? `${String(divida.taxaJuros).replace(".", ",")}% ${divida.taxaPeriodicidade === "mensal" ? "a.m." : "a.a."}`
                  : "sem juros"}
              </span>
              {divida.totalParcelas > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>
                    {divida.parcelasPagas}/{divida.totalParcelas} parcelas
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={`font-mono font-bold ${
                divida.saldoDevedor > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {formatBRL(divida.saldoDevedor)}
            </div>
            <div className="text-xs text-slate-400">saldo devedor</div>
          </div>
        </div>

        {/* Barra de progresso */}
        {progressoPercent > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${progressoPercent}%`,
                  background: divida.cor,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>{progressoPercent.toFixed(0)}% pago</span>
              {parcelasRestantes !== null && parcelasRestantes > 0 && (
                <span>
                  {parcelasRestantes} parcela{parcelasRestantes > 1 ? "s" : ""} restante
                  {parcelasRestantes > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Linha de detalhes */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {divida.valorParcela > 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-400">Valor da parcela</div>
              <div className="font-mono font-semibold text-slate-700">
                {formatBRL(divida.valorParcela)}
              </div>
            </div>
          )}
          {divida.ativa && (
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-400">Proximo vencimento</div>
              <div className="font-semibold text-slate-700">
                {formatDate(divida.proximoVencimento)}
              </div>
            </div>
          )}
        </div>

        {/* Acoes */}
        <div className="mt-3 flex items-center justify-end gap-2">
          {onPagamento && (
            <Button
              type="button"
              size="sm"
              onClick={onPagamento}
              className="text-xs"
              style={{ background: divida.cor }}
            >
              <TrendingDown size={14} /> Registrar pagamento
            </Button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
            aria-label="Editar divida"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-danger hover:bg-danger/10 rounded transition-colors"
            aria-label="Excluir divida"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}
