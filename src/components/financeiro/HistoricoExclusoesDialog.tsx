"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Archive,
  History,
  CalendarX,
  RotateCcw,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "lancamentos" | "exclusoes";

const ENTITY_LABEL: Record<string, string> = {
  despesa: "Despesa",
  receita: "Receita",
  transferencia: "Transferência",
  conta: "Conta",
  draft: "Draft (IA)",
  conversa: "Conversa (IA)",
  pagamento: "Pagamento",
  recebimento: "Recebimento",
  override_excluida: "Mês oculto",
};

const ENTITY_TONE: Record<string, string> = {
  despesa: "bg-coral-50 text-coral-700",
  receita: "bg-emerald-50 text-emerald-700",
  transferencia: "bg-cream-100 text-ink-700",
  conta: "bg-ink-50 text-ink-700",
  draft: "bg-cream-100 text-ink-600",
  conversa: "bg-cream-100 text-ink-600",
  pagamento: "bg-coral-50 text-coral-700",
  recebimento: "bg-emerald-50 text-emerald-700",
  override_excluida: "bg-cream-200 text-ink-700",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (d.toDateString() === hoje.toDateString()) return `Hoje ${hh}:${mm}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem ${hh}:${mm}`;
  return d.toLocaleDateString("pt-BR") + ` ${hh}:${mm}`;
}

export function HistoricoExclusoesDialog({ open, onClose }: Props) {
  const token = useSessionToken();
  const [tab, setTab] = useState<Tab>("lancamentos");

  const lancamentos = useQuery(
    api.financeiro.auditLog.diagnosticoLancamentos,
    token && open && tab === "lancamentos" ? { sessionToken: token } : "skip"
  );
  const exclusoes = useQuery(
    api.financeiro.auditLog.listarExclusoesRecentes,
    token && open && tab === "exclusoes" ? { sessionToken: token, limite: 100 } : "skip"
  );

  const restaurar = useMutation(api.financeiro.auditLog.restaurarOverrideExcluida);
  const [restaurandoId, setRestaurandoId] = useState<Id<"auditLogExclusoes"> | null>(null);
  const [erroRestauro, setErroRestauro] = useState<string | null>(null);

  async function handleRestaurar(logId: Id<"auditLogExclusoes">) {
    if (!token) return;
    setRestaurandoId(logId);
    setErroRestauro(null);
    try {
      await restaurar({ sessionToken: token, logId });
    } catch (e) {
      setErroRestauro(e instanceof Error ? e.message : "Falha ao restaurar");
    } finally {
      setRestaurandoId(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Diagnóstico e histórico" className="max-w-3xl">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-cream-200 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setTab("lancamentos")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "lancamentos"
                ? "border-coral-500 text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Archive size={14} /> Lançamentos no banco
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("exclusoes")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "exclusoes"
                ? "border-coral-500 text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <History size={14} /> Histórico de exclusões
            </span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {tab === "lancamentos" ? <ViewLancamentos data={lancamentos} /> : <ViewExclusoes
            data={exclusoes}
            onRestaurar={handleRestaurar}
            restaurandoId={restaurandoId}
            erro={erroRestauro}
          />}
        </div>
      </div>
    </Dialog>
  );
}

function ViewLancamentos({ data }: { data: ReturnType<typeof useDiagnosticoData> }) {
  if (data === undefined) {
    return <div className="space-y-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>;
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-cream-100 px-4 py-3 flex items-start gap-3 text-sm text-ink-700">
        <Info size={16} className="text-ink-500 mt-0.5 shrink-0" />
        <p>
          Lista <b>todos</b> os lançamentos no banco — incluindo os ocultos em alguns meses
          via override (não foram deletados, só não aparecem). Se a despesa/receita
          que você procura <b>não está aqui</b>, ela foi <b>deletada de verdade</b> — vá na aba
          "Histórico de exclusões" pra ver quando e por quem.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-cream-300 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-ink-500">Despesas</div>
          <div className="font-mono font-extrabold text-2xl text-ink-900 tabular-nums">
            {data.total.despesas}
          </div>
          {data.total.despesasComOverrideExcluido > 0 && (
            <div className="text-[10px] text-coral-600 mt-0.5">
              {data.total.despesasComOverrideExcluido} com mês oculto
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white border border-cream-300 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-ink-500">Receitas</div>
          <div className="font-mono font-extrabold text-2xl text-ink-900 tabular-nums">
            {data.total.receitas}
          </div>
          {data.total.receitasComOverrideExcluido > 0 && (
            <div className="text-[10px] text-coral-600 mt-0.5">
              {data.total.receitasComOverrideExcluido} com mês oculto
            </div>
          )}
        </div>
      </div>

      <Secao titulo="Receitas no banco" cor="text-emerald-700">
        {data.receitas.length === 0 ? (
          <p className="text-xs text-ink-400 px-3 py-4 text-center">Nenhuma receita</p>
        ) : (
          <ul className="divide-y divide-cream-100">
            {data.receitas.map((r) => (
              <ItemLinha
                key={r._id}
                descricao={r.descricao}
                valor={r.valor}
                tipo={r.tipo}
                parcela={r.parcelaAtual && r.totalParcelas ? `${r.parcelaAtual}/${r.totalParcelas}` : undefined}
                dataBase={r.dataPrevisao}
                mesesOcultos={r.mesesExcluidos}
              />
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Despesas no banco" cor="text-coral-700">
        {data.despesas.length === 0 ? (
          <p className="text-xs text-ink-400 px-3 py-4 text-center">Nenhuma despesa</p>
        ) : (
          <ul className="divide-y divide-cream-100">
            {data.despesas.slice(0, 100).map((d) => (
              <ItemLinha
                key={d._id}
                descricao={d.descricao}
                valor={d.valor}
                tipo={d.tipo}
                parcela={d.parcelaAtual && d.totalParcelas ? `${d.parcelaAtual}/${d.totalParcelas}` : undefined}
                dataBase={d.dataVencimento}
                mesesOcultos={d.mesesExcluidos}
                cartao={d.cartao}
              />
            ))}
            {data.despesas.length > 100 && (
              <li className="px-3 py-2 text-[10px] text-ink-400 text-center">
                + {data.despesas.length - 100} restantes
              </li>
            )}
          </ul>
        )}
      </Secao>
    </div>
  );
}

function ItemLinha(props: {
  descricao: string;
  valor: number;
  tipo: string;
  dataBase: string;
  parcela?: string;
  mesesOcultos?: string[];
  cartao?: string;
}) {
  return (
    <li className="px-3 py-2 flex items-center gap-2 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-ink-800 truncate">{props.descricao}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-500 uppercase">
            {props.tipo}
          </span>
          {props.parcela && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-500">
              {props.parcela}
            </span>
          )}
          {props.cartao && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-500">
              {props.cartao}
            </span>
          )}
          {props.mesesOcultos && props.mesesOcultos.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-coral-100 text-coral-700 inline-flex items-center gap-1">
              <CalendarX size={10} /> oculto em {props.mesesOcultos.join(", ")}
            </span>
          )}
        </div>
        <div className="text-[10px] text-ink-400 mt-0.5 font-mono">{props.dataBase}</div>
      </div>
      <span className="font-mono font-semibold text-ink-800 tabular-nums shrink-0">
        {formatBRL(props.valor)}
      </span>
    </li>
  );
}

function ViewExclusoes({
  data,
  onRestaurar,
  restaurandoId,
  erro,
}: {
  data: ReturnType<typeof useExclusoesData>;
  onRestaurar: (id: Id<"auditLogExclusoes">) => Promise<void>;
  restaurandoId: Id<"auditLogExclusoes"> | null;
  erro: string | null;
}) {
  if (data === undefined) {
    return <div className="space-y-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>;
  }
  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <Archive size={32} className="mx-auto mb-2 text-ink-300" />
        <p className="text-sm text-ink-500">Nenhuma exclusão registrada</p>
        <p className="text-xs text-ink-400 mt-1">
          Audit log começou após o último deploy. Exclusões antigas não aparecem aqui.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-cream-100 px-4 py-3 flex items-start gap-3 text-sm text-ink-700">
        <Info size={16} className="text-ink-500 mt-0.5 shrink-0" />
        <p>
          Mostra as <b>{data.length} últimas exclusões</b>. "Mês oculto" pode ser <b>restaurado</b>;
          outras exclusões são definitivas (foi feita uma exclusão completa). Use o snapshot
          pra recriar manualmente.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 px-3 py-2 text-xs text-coral-700 flex items-center gap-2">
          <AlertCircle size={14} /> {erro}
        </div>
      )}

      <ul className="divide-y divide-cream-100 rounded-2xl bg-white border border-cream-200">
        {data.map((log) => {
          const podeRestaurar = log.entityType === "override_excluida" && !log.restauradoEm;
          const restaurando = restaurandoId === log._id;
          return (
            <li key={log._id} className="px-3 py-2.5 flex items-center gap-3 text-xs">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ENTITY_TONE[log.entityType] ?? "bg-cream-100 text-ink-600"}`}>
                {ENTITY_LABEL[log.entityType] ?? log.entityType}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-ink-800 truncate">{log.resumo}</div>
                <div className="text-[10px] text-ink-400 mt-0.5">
                  {formatTimestamp(log.criadoEm)} · <span className="font-mono">{log.mutationCalled}</span>
                  {log.contexto && <span> · {log.contexto}</span>}
                  {log.restauradoEm && <span className="ml-1 text-emerald-600">· restaurado</span>}
                </div>
              </div>
              {podeRestaurar && (
                <button
                  type="button"
                  onClick={() => onRestaurar(log._id)}
                  disabled={restaurando}
                  className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-full bg-coral-500 text-white text-[11px] font-medium hover:bg-coral-600 disabled:opacity-50"
                >
                  {restaurando ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                  Restaurar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Secao({ titulo, cor, children }: { titulo: string; cor: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={`text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 px-1 ${cor}`}>{titulo}</h3>
      <div className="rounded-2xl bg-white border border-cream-200 overflow-hidden">{children}</div>
    </section>
  );
}

// Helpers de tipo (apenas pra inferir o retorno do useQuery sem ter que repetir)
type DiagnosticoData = ReturnType<typeof useDiagnosticoData>;
type ExclusoesData = ReturnType<typeof useExclusoesData>;
function useDiagnosticoData() {
  const token = useSessionToken();
  return useQuery(
    api.financeiro.auditLog.diagnosticoLancamentos,
    token ? { sessionToken: token } : "skip"
  );
}
function useExclusoesData() {
  const token = useSessionToken();
  return useQuery(
    api.financeiro.auditLog.listarExclusoesRecentes,
    token ? { sessionToken: token, limite: 100 } : "skip"
  );
}
