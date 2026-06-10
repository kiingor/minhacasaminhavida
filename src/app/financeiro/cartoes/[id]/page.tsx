"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { CreditCard, CheckCircle2, Circle, AlertTriangle, ChevronDown, Layers, Info } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatBRL, formatDate } from "@/lib/formatters";
import { monthLabelLong } from "@/lib/monthUtils";

type Status = "aberta" | "a_pagar" | "vencida" | "paga";

const STATUS_INFO: Record<Status, { label: string; classe: string }> = {
  aberta: { label: "Aberta", classe: "bg-sky-100 text-sky-700" },
  a_pagar: { label: "A pagar", classe: "bg-amber-100 text-amber-700" },
  vencida: { label: "Vencida", classe: "bg-rose-100 text-rose-700" },
  paga: { label: "Paga", classe: "bg-emerald-100 text-emerald-700" },
};

function StatusPill({ status }: { status: Status }) {
  const info = STATUS_INFO[status];
  return <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${info.classe}`}>{info.label}</span>;
}

type Lancamento = {
  despesaId: Id<"despesas">;
  descricao: string;
  valor: number;
  dataRef: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  pago: boolean;
};

function ListaLancamentos({ lancamentos }: { lancamentos: Lancamento[] }) {
  if (lancamentos.length === 0) {
    return <p className="text-sm text-slate-400 py-3 text-center">Sem lançamentos nesta fatura.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {lancamentos.map((l, i) => (
        <li key={`${l.despesaId}-${i}`} className="py-2.5 flex items-center gap-3">
          {l.pago ? (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <Circle size={16} className="text-slate-300 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-800 truncate">
              {l.descricao}
              {l.parcelaAtual && l.totalParcelas && (
                <span className="ml-1.5 text-[11px] text-slate-400">{l.parcelaAtual}/{l.totalParcelas}</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">{formatDate(l.dataRef)}</div>
          </div>
          <div className="font-mono text-sm font-medium text-slate-800 tabular-nums shrink-0">{formatBRL(l.valor)}</div>
        </li>
      ))}
    </ul>
  );
}

export default function CartaoDetalhePage({ params }: { params: { id: string } }) {
  const token = useSessionToken();
  const cartaoId = params.id as Id<"cartoes">;
  const data = useQuery(
    api.financeiro.faturas.detalheCartao,
    token ? { sessionToken: token, cartaoId } : "skip"
  );
  const [histAberto, setHistAberto] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const { cartao, faturaAtual, historico, futuras, parcelamentos } = data;

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        backHref="/financeiro/cartoes"
        backLabel="Voltar para Cartões"
        title={cartao.nome}
        subtitle={[
          cartao.bandeira,
          cartao.temCiclo ? `Fecha dia ${cartao.diaFechamento} · vence dia ${cartao.diaVencimento}` : null,
          cartao.limiteTotal != null ? `Limite ${formatBRL(cartao.limiteTotal)}` : null,
        ].filter(Boolean).join(" · ")}
      />

      {!cartao.temCiclo && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-sm text-amber-800">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Configure o <b>dia de fechamento e vencimento</b> deste cartão para ver as faturas por competência.
            Por enquanto, os lançamentos estão agrupados por mês-calendário.
          </span>
        </div>
      )}

      {/* Fatura atual */}
      <section className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/60">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-primary" />
              <h2 className="font-display font-bold">Fatura atual</h2>
            </div>
            {faturaAtual && <StatusPill status={faturaAtual.status as Status} />}
          </div>
          <div className="text-sm text-slate-500 capitalize">{monthLabelLong(data.compAtual)}</div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total</div>
              <div className="font-mono font-bold text-2xl text-slate-900 tabular-nums">
                {formatBRL(faturaAtual?.valorTotal ?? 0)}
              </div>
            </div>
            {faturaAtual && cartao.temCiclo && faturaAtual.dataVencimento && (
              <div className="text-right text-xs text-slate-500">
                <div>Vence {formatDate(faturaAtual.dataVencimento)}</div>
                {faturaAtual.valorPago > 0 && <div className="text-emerald-600">Pago {formatBRL(faturaAtual.valorPago)}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-2">
          <ListaLancamentos lancamentos={(faturaAtual?.lancamentos ?? []) as Lancamento[]} />
        </div>
      </section>

      {/* Parcelamentos em andamento */}
      {parcelamentos.length > 0 && (
        <section className="rounded-2xl bg-white border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} className="text-primary" />
            <h2 className="font-display font-bold">Parcelamentos em andamento</h2>
          </div>
          <ul className="space-y-2.5">
            {parcelamentos.map((p) => (
              <li key={p.despesaId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate">{p.descricao}</div>
                  <div className="text-[11px] text-slate-400">
                    {p.parcelasPagas}/{p.totalParcelas} pagas · faltam {p.parcelasRestantes} de {formatBRL(p.valorParcela)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-medium text-slate-800 tabular-nums">{formatBRL(p.valorOriginal)}</div>
                  <div className="text-[11px] text-slate-400">total</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Faturas futuras (comprometido) */}
      {futuras.length > 0 && (
        <section className="rounded-2xl bg-white border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-sm text-slate-600">Próximas faturas (comprometido)</h2>
          </div>
          <ul className="space-y-1.5">
            {futuras.map((f) => (
              <li key={f.competencia} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600">{monthLabelLong(f.competencia)}</span>
                <span className="font-mono tabular-nums text-slate-700">{formatBRL(f.valorTotal)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Histórico */}
      <section className="rounded-2xl bg-white border shadow-sm p-4">
        <h2 className="font-display font-bold mb-3">Histórico de faturas</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-slate-400 py-2 text-center">Nenhuma fatura anterior.</p>
        ) : (
          <ul className="space-y-1">
            {historico.map((f) => {
              const aberto = histAberto === f.competencia;
              return (
                <li key={f.competencia} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setHistAberto(aberto ? null : f.competencia)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors"
                  >
                    {f.status === "vencida" ? (
                      <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                    ) : (
                      <CheckCircle2 size={15} className={f.status === "paga" ? "text-emerald-500 shrink-0" : "text-slate-300 shrink-0"} />
                    )}
                    <span className="capitalize text-sm font-medium text-slate-700 flex-1 text-left">{monthLabelLong(f.competencia)}</span>
                    <StatusPill status={f.status as Status} />
                    <span className="font-mono text-sm tabular-nums text-slate-800">{formatBRL(f.valorTotal)}</span>
                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
                  </button>
                  {aberto && (
                    <div className="px-3 pb-2 border-t border-slate-100">
                      <ListaLancamentos lancamentos={f.lancamentos as Lancamento[]} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
