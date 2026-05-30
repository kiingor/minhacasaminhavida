"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  Info,
  Stethoscope,
  RotateCcw,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate } from "@/lib/formatters";
import { getIconeConta } from "@/components/financeiro/ContaForm";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DiagnosticoSaldosDialog({ open, onClose }: Props) {
  const token = useSessionToken();
  const data = useQuery(
    api.financeiro.contas.diagnostico,
    token && open ? { sessionToken: token } : "skip"
  );

  const [contasExpandidas, setContasExpandidas] = useState<Set<string>>(new Set());
  const [mostrarSemConta, setMostrarSemConta] = useState<"despesas" | "receitas" | null>(null);

  function toggleConta(id: string) {
    setContasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Diagnóstico de saldos" className="max-w-2xl">
      {data === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto -mx-1 px-1">
          {/* Explicação */}
          <div className="rounded-2xl bg-cream-100 px-4 py-3 flex items-start gap-3 text-sm text-ink-700">
            <Info size={18} className="text-ink-500 mt-0.5 shrink-0" />
            <p>
              O <b>Saldo Efetivo</b> = soma do saldoFinal de cada conta.
              Lançamentos sem conta vinculada (ou no cartão) não impactam saldo de conta.
            </p>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-ink-900 text-white p-4">
              <div className="text-[10px] uppercase tracking-wide text-white/70">Saldo Efetivo</div>
              <div className="font-mono font-extrabold text-xl mt-1 tabular-nums">
                {formatBRL(data.resumo.totalSaldoFinal)}
              </div>
              <div className="text-[10px] text-white/60 mt-1">
                {data.resumo.qtdContasAtivas} {data.resumo.qtdContasAtivas === 1 ? "conta ativa" : "contas ativas"}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-cream-300 p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink-500">Soma saldoInicial</div>
              <div className="font-mono font-extrabold text-xl mt-1 tabular-nums text-ink-900">
                {formatBRL(data.resumo.totalSaldoInicial)}
              </div>
              <div className="text-[10px] text-ink-400 mt-1">Ponto de partida das contas</div>
            </div>
          </div>

          {/* Alertas: lançamentos sem conta */}
          {(data.resumo.qtdSemContaDespesas > 0 || data.resumo.qtdSemContaReceitas > 0) && (
            <div className="rounded-2xl border border-coral-300 bg-coral-50/60 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-coral-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-ink-900">
                    Lançamentos sem conta vinculada
                  </div>
                  <p className="text-xs text-ink-600 mt-0.5">
                    Esses lançamentos foram efetivados mas <b>não afetam saldo de conta</b> —
                    nem no cadastro nem no momento do pagamento foi escolhida uma conta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {data.resumo.qtdSemContaReceitas > 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarSemConta(mostrarSemConta === "receitas" ? null : "receitas")}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      mostrarSemConta === "receitas"
                        ? "border-coral-500 bg-white"
                        : "border-coral-200 bg-white hover:border-coral-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                      <ArrowUpRight size={12} /> Receitas
                    </div>
                    <div className="font-mono font-bold text-base mt-0.5 text-ink-900 tabular-nums">
                      {formatBRL(data.resumo.valorSemContaReceitas)}
                    </div>
                    <div className="text-[10px] text-ink-500">
                      {data.resumo.qtdSemContaReceitas} {data.resumo.qtdSemContaReceitas === 1 ? "lançamento" : "lançamentos"}
                    </div>
                  </button>
                )}
                {data.resumo.qtdSemContaDespesas > 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarSemConta(mostrarSemConta === "despesas" ? null : "despesas")}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      mostrarSemConta === "despesas"
                        ? "border-coral-500 bg-white"
                        : "border-coral-200 bg-white hover:border-coral-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
                      <ArrowDownRight size={12} /> Despesas
                    </div>
                    <div className="font-mono font-bold text-base mt-0.5 text-ink-900 tabular-nums">
                      {formatBRL(data.resumo.valorSemContaDespesas)}
                    </div>
                    <div className="text-[10px] text-ink-500">
                      {data.resumo.qtdSemContaDespesas} {data.resumo.qtdSemContaDespesas === 1 ? "lançamento" : "lançamentos"}
                    </div>
                  </button>
                )}
              </div>

              {/* Lista expandida */}
              {mostrarSemConta === "despesas" && (
                <ul className="rounded-xl bg-white border border-cream-200 divide-y divide-cream-100 max-h-60 overflow-y-auto">
                  {data.pagamentosSemConta.slice(0, 50).map((p) => (
                    <li key={p._id} className="px-3 py-2 flex items-center gap-2 text-xs">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-600 shrink-0">
                        {p.mes}
                      </span>
                      <span className="flex-1 truncate text-ink-700">{p.descricao}</span>
                      <span className="font-mono text-rose-600 tabular-nums shrink-0">
                        {formatBRL(p.valor)}
                      </span>
                    </li>
                  ))}
                  {data.pagamentosSemConta.length > 50 && (
                    <li className="px-3 py-2 text-[10px] text-ink-400 text-center">
                      + {data.pagamentosSemConta.length - 50} restantes
                    </li>
                  )}
                </ul>
              )}
              {mostrarSemConta === "receitas" && (
                <ul className="rounded-xl bg-white border border-cream-200 divide-y divide-cream-100 max-h-60 overflow-y-auto">
                  {data.recebimentosSemConta.slice(0, 50).map((r) => (
                    <li key={r._id} className="px-3 py-2 flex items-center gap-2 text-xs">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-600 shrink-0">
                        {r.mes}
                      </span>
                      <span className="flex-1 truncate text-ink-700">{r.descricao}</span>
                      <span className="font-mono text-emerald-600 tabular-nums shrink-0">
                        {formatBRL(r.valor)}
                      </span>
                    </li>
                  ))}
                  {data.recebimentosSemConta.length > 50 && (
                    <li className="px-3 py-2 text-[10px] text-ink-400 text-center">
                      + {data.recebimentosSemConta.length - 50} restantes
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Pago em cartão */}
          {data.resumo.qtdPagoEmCartao > 0 && (
            <div className="rounded-2xl border border-cream-300 bg-white p-3 flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-xl bg-cream-100 text-ink-600 flex items-center justify-center shrink-0">
                <CreditCard size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900">
                  Pago em cartão sem conta: {formatBRL(data.resumo.valorPagoEmCartao)}
                </div>
                <div className="text-xs text-ink-500">
                  {data.resumo.qtdPagoEmCartao} {data.resumo.qtdPagoEmCartao === 1 ? "lançamento" : "lançamentos"} — pago no cartão mas sem conta vinculada, não afetam saldo. (Fatura paga escolhendo a conta debita normalmente.)
                </div>
              </div>
            </div>
          )}

          {/* Breakdown por conta */}
          <div className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-ink-400 font-semibold px-1">
              Breakdown por conta
            </h3>
            {data.contas.length === 0 ? (
              <p className="text-sm text-ink-500 text-center py-4">Nenhuma conta cadastrada</p>
            ) : (
              data.contas.map((c) => {
                const Icon = getIconeConta(c.icone);
                const expandido = contasExpandidas.has(c._id);
                return (
                  <div
                    key={c._id}
                    className={`rounded-2xl border bg-white overflow-hidden ${c.ativa ? "" : "opacity-60"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleConta(c._id)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-cream-50 transition-colors"
                      aria-expanded={expandido}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${c.cor}20`, color: c.cor }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium text-ink-900 truncate">{c.nome}</div>
                        {c.banco && <div className="text-[10px] text-ink-400">{c.banco}</div>}
                      </div>
                      <div className={`font-mono font-bold tabular-nums shrink-0 ${c.saldoFinal < 0 ? "text-rose-600" : "text-ink-900"}`}>
                        {formatBRL(c.saldoFinal)}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-ink-400 transition-transform shrink-0 ${expandido ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expandido && (
                      <div className="px-4 pb-3 pt-1 space-y-1 text-sm border-t border-cream-100 bg-cream-50/40">
                        <LinhaDetalhe label="Saldo inicial" valor={c.saldoInicial} />
                        <LinhaDetalhe
                          label="+ Receitas recebidas"
                          valor={c.totalReceitas}
                          tom="ganho"
                        />
                        <LinhaDetalhe
                          label="− Despesas pagas"
                          valor={-c.totalDespesas}
                          tom="perda"
                        />
                        <LinhaDetalhe
                          label="+ Transferências recebidas"
                          valor={c.totalTransferenciasEntradas}
                          tom="neutro"
                        />
                        <LinhaDetalhe
                          label="− Transferências enviadas"
                          valor={-c.totalTransferenciasSaidas}
                          tom="neutro"
                        />
                        <div className="border-t border-cream-200 pt-2 mt-2 flex items-center justify-between font-bold">
                          <span className="text-ink-900">Saldo Final</span>
                          <span className={`font-mono tabular-nums ${c.saldoFinal < 0 ? "text-rose-600" : "text-ink-900"}`}>
                            {formatBRL(c.saldoFinal)}
                          </span>
                        </div>
                        {c.ehManual && (
                          <div className="text-[10px] text-violet-700 bg-violet-50 px-2 py-1 rounded mt-1">
                            Saldo manual ativo (sobrescreve cálculo) — vigente: {formatBRL(c.saldoManual ?? 0)}
                          </div>
                        )}
                        {/* Extrato: o que está sendo contado nessa conta (com desfazer) */}
                        <ExtratoConta contaId={c._id as Id<"contas">} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function ExtratoConta({ contaId }: { contaId: Id<"contas"> }) {
  const token = useSessionToken();
  const extrato = useQuery(
    api.financeiro.contas.extratoConta,
    token ? { sessionToken: token, contaId } : "skip"
  );
  const desfazerDespesa = useMutation(api.financeiro.despesas.desfazerEfetivacao);
  const desfazerReceita = useMutation(api.financeiro.receitas.desfazerEfetivacao);
  const [desfazendo, setDesfazendo] = useState<string | null>(null);

  async function desfazer(origem: "despesa" | "receita", lancamentoId: string, mes: string) {
    if (!token) return;
    const chave = `${lancamentoId}:${mes}`;
    setDesfazendo(chave);
    try {
      if (origem === "despesa") {
        await desfazerDespesa({ sessionToken: token, id: lancamentoId as Id<"despesas">, mes });
      } else {
        await desfazerReceita({ sessionToken: token, id: lancamentoId as Id<"receitas">, mes });
      }
    } finally {
      setDesfazendo(null);
    }
  }

  if (extrato === undefined) {
    return <div className="mt-2 pt-2 border-t border-cream-200"><Skeleton className="h-12 rounded-lg" /></div>;
  }
  if (extrato.itens.length === 0) {
    return (
      <div className="mt-2 pt-2 border-t border-cream-200 text-[11px] text-ink-400">
        Nada efetivado nesta conta — saldo = apenas o saldo inicial.
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-cream-200">
      <div className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold mb-1">
        Extrato — o que está sendo contado ({extrato.itens.length})
      </div>
      <ul className="rounded-lg bg-white border border-cream-200 divide-y divide-cream-100 max-h-60 overflow-y-auto">
        {extrato.itens.map((it, idx) => {
          const ehTransfer = it.origem.startsWith("transferencia");
          const chave = `${it.lancamentoId}:${it.mes}`;
          return (
            <li key={`${it.origem}-${it.lancamentoId}-${it.mes}-${idx}`} className="px-2.5 py-1.5 flex items-center gap-2 text-xs">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-600 shrink-0">
                {it.mes ?? it.data.slice(0, 7)}
              </span>
              {ehTransfer && <ArrowLeftRight size={11} className="text-ink-400 shrink-0" />}
              <span className="flex-1 truncate text-ink-700">{it.descricao}</span>
              <span className={`font-mono tabular-nums shrink-0 ${it.sinal === "+" ? "text-emerald-600" : "text-rose-600"}`}>
                {it.sinal}{formatBRL(it.valor)}
              </span>
              {it.desfazivel && it.lancamentoId && it.mes ? (
                <button
                  type="button"
                  onClick={() => {
                    if (it.origem !== "despesa" && it.origem !== "receita") return;
                    if (it.lancamentoId && it.mes) desfazer(it.origem, it.lancamentoId, it.mes);
                  }}
                  disabled={desfazendo === chave}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-ink-400 hover:bg-cream-100 hover:text-coral-600 disabled:opacity-50"
                  aria-label="Desfazer efetivação"
                  title="Desfazer efetivação (volta para pendente)"
                >
                  {desfazendo === chave ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-ink-400 mt-1">
        O saldo soma <b>todos os meses</b>. Use ↺ para desfazer um pagamento/recebimento que não deveria contar.
      </p>
    </div>
  );
}

function LinhaDetalhe({
  label,
  valor,
  tom = "neutro",
}: {
  label: string;
  valor: number;
  tom?: "ganho" | "perda" | "neutro";
}) {
  const cor =
    tom === "ganho" ? "text-emerald-700" :
    tom === "perda" ? "text-rose-700" :
    "text-ink-700";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-600">{label}</span>
      <span className={`font-mono tabular-nums ${cor}`}>{formatBRL(valor)}</span>
    </div>
  );
}

// Export helper para abrir do botão na tela Contas
export function BotaoAbrirDiagnostico({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs text-white/90 hover:text-white underline-offset-2 hover:underline"
    >
      <Stethoscope size={12} />
      Diagnosticar
    </button>
  );
}
