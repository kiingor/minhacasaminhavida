"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Sun,
  CalendarCheck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { formatBRL, todayISO } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import type { Id } from "../../../convex/_generated/dataModel";

type Tab = "hoje" | "proximos";

type TipoLancHoje = "despesa" | "receita" | "transferencia";
interface LancamentoHoje {
  tipo: TipoLancHoje;
  id: string;
  descricao: string;
  valor: number;
  categoriaId?: string;
  contaId?: string;
  criadoEm: string;
}

type TipoVenc = "despesa" | "receita";
interface ItemPendente {
  tipo: TipoVenc;
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  contaId?: string;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Painel diario unificado com 2 abas: Hoje e Proximos.
 * Substitui LancamentosDoDiaCard + ProximosVencimentosCard + "Demais vencimentos do mes".
 *
 * - Aba Hoje: lancamentos efetivados hoje (pagamentos, recebimentos, transferencias)
 * - Aba Proximos: todos pendentes — proximos 7 dias (despesas + receitas) e demais
 *   despesas do mes (separados por divisor "Mais adiante")
 */
export function PainelDiario() {
  const token = useSessionToken();
  const [tab, setTab] = useState<Tab>("hoje");
  const [processando, setProcessando] = useState<string | null>(null);

  const togglePago = useMutation(api.financeiro.despesas.togglePago);
  const toggleRecebido = useMutation(api.financeiro.receitas.toggleRecebido);

  const lancamentosHoje = useQuery(
    api.financeiro.dashboardFinanceiro.lancamentosDoDia,
    token ? { sessionToken: token } : "skip"
  ) as LancamentoHoje[] | undefined;
  const proximos7 = useQuery(
    api.financeiro.dashboardFinanceiro.proximosVencimentos7Dias,
    token ? { sessionToken: token } : "skip"
  ) as ItemPendente[] | undefined;
  const proximasContas = useQuery(
    api.financeiro.dashboardFinanceiro.proximasContas,
    token ? { sessionToken: token } : "skip"
  );
  const categorias = useQuery(
    api.financeiro.categorias.list,
    token ? { sessionToken: token } : "skip"
  );

  const hoje = todayISO();
  const limite7 = addDaysISO(hoje, 7);

  // Demais vencimentos do mes alem dos proximos 7 dias (somente despesas — usa
  // proximasContas, que ja exclui as pagas). Receitas alem de 7 dias nao sao
  // mostradas (alinhado ao comportamento atual da home).
  const itensPendentes = useMemo<ItemPendente[] | undefined>(() => {
    if (proximos7 === undefined || proximasContas === undefined) return undefined;
    const idsProx = new Set(proximos7.map((i) => i.id));
    const extras: ItemPendente[] = proximasContas
      .filter((d) => d.dataVencimento > limite7 && !idsProx.has(d._id as string))
      .map((d) => ({
        tipo: "despesa" as const,
        id: d._id as string,
        descricao: d.descricao,
        valor: d.valor,
        dataVencimento: d.dataVencimento,
        contaId: d.contaId as string | undefined,
      }));
    return [...proximos7, ...extras].sort((a, b) =>
      a.dataVencimento.localeCompare(b.dataVencimento)
    );
  }, [proximos7, proximasContas, limite7]);

  const totalProximos = itensPendentes?.length ?? 0;

  async function handleConfirmar(item: ItemPendente) {
    if (!token || processando) return;
    setProcessando(item.id);
    try {
      const mesItem = item.dataVencimento.slice(0, 7) || currentMonth();
      if (item.tipo === "despesa") {
        await togglePago({
          sessionToken: token,
          id: item.id as Id<"despesas">,
          mes: mesItem,
        });
      } else {
        await toggleRecebido({
          sessionToken: token,
          id: item.id as Id<"receitas">,
          mes: mesItem,
        });
      }
    } finally {
      setProcessando(null);
    }
  }

  const carregandoHoje = lancamentosHoje === undefined;
  const carregandoProximos = itensPendentes === undefined;

  if (carregandoHoje && carregandoProximos) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  const catMap = new Map(
    (categorias ?? []).map((c) => [c._id as string, c])
  );

  return (
    <section
      aria-labelledby="painel-diario"
      className="rounded-2xl bg-white border p-4 shadow-sm"
    >
      <h2 id="painel-diario" className="sr-only">
        Painel diário
      </h2>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 mb-3 -mx-1 px-1">
        <TabButton
          ativo={tab === "hoje"}
          onClick={() => setTab("hoje")}
          Icon={CalendarCheck}
          label="Hoje"
        />
        <TabButton
          ativo={tab === "proximos"}
          onClick={() => setTab("proximos")}
          Icon={Clock}
          label={`Próximos${totalProximos ? ` (${totalProximos})` : ""}`}
        />
      </div>

      {tab === "hoje" ? (
        <AbaHoje data={lancamentosHoje} catMap={catMap} />
      ) : (
        <AbaProximos
          itens={itensPendentes}
          limite7={limite7}
          processando={processando}
          onConfirmar={handleConfirmar}
        />
      )}
    </section>
  );
}

function TabButton({
  ativo,
  onClick,
  Icon,
  label,
}: {
  ativo: boolean;
  onClick: () => void;
  Icon: typeof Clock;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={ativo}
      role="tab"
      className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
        ativo ? "text-primary" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon size={14} aria-hidden />
      <span>{label}</span>
      {ativo && (
        <motion.div
          layoutId="painel-diario-tab-indicator"
          className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-t"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
    </button>
  );
}

function AbaHoje({
  data,
  catMap,
}: {
  data: LancamentoHoje[] | undefined;
  catMap: Map<string, { nome: string; cor: string; icone?: string }>;
}) {
  if (data === undefined) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
        <Sun size={28} className="text-amber-400" aria-hidden />
        <p className="text-sm text-slate-500">
          Nenhum lançamento hoje. Que tal registrar agora?
        </p>
        <Link
          href="/financeiro/lancamentos"
          className="text-xs font-medium text-primary hover:underline"
        >
          Registrar
        </Link>
      </div>
    );
  }

  const visiveis = data.slice(0, 8);
  const totalEntradas = data
    .filter((l) => l.tipo === "receita")
    .reduce((s, l) => s + l.valor, 0);
  const totalSaidas = data
    .filter((l) => l.tipo === "despesa")
    .reduce((s, l) => s + l.valor, 0);

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {visiveis.map((l, i) => {
          const cat = l.categoriaId ? catMap.get(l.categoriaId) : undefined;
          return (
            <motion.li
              key={l.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="py-2 flex items-center gap-2.5"
            >
              <IconeTipo tipo={l.tipo} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{l.descricao}</div>
                {cat && <CategoriaBadge cat={cat} />}
              </div>
              <span
                className={`font-mono text-sm font-semibold shrink-0 ${
                  l.tipo === "receita"
                    ? "text-emerald-600"
                    : l.tipo === "despesa"
                    ? "text-rose-600"
                    : "text-violet-600"
                }`}
              >
                {formatBRL(l.valor)}
              </span>
            </motion.li>
          );
        })}
      </ul>
      {data.length > 8 && (
        <div className="mt-2 text-[11px] text-slate-400 text-center">
          + {data.length - 8} {data.length - 8 === 1 ? "outro" : "outros"}
        </div>
      )}
      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Entradas{" "}
          <span className="font-mono font-semibold text-emerald-600">
            {formatBRL(totalEntradas)}
          </span>
        </span>
        <span className="text-slate-500">
          Saídas{" "}
          <span className="font-mono font-semibold text-rose-600">
            {formatBRL(totalSaidas)}
          </span>
        </span>
      </div>
    </>
  );
}

function AbaProximos({
  itens,
  limite7,
  processando,
  onConfirmar,
}: {
  itens: ItemPendente[] | undefined;
  limite7: string;
  processando: string | null;
  onConfirmar: (item: ItemPendente) => void;
}) {
  if (itens === undefined) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
        <CheckCircle2 size={28} className="text-emerald-500" aria-hidden />
        <p className="text-sm text-slate-500">
          Tudo em dia! Sem vencimentos pendentes.
        </p>
      </div>
    );
  }

  // Determina posicao do divisor "Mais adiante" — entre proximos 7 dias e demais
  const ultimoEm7 = (() => {
    let idx = -1;
    for (let i = 0; i < itens.length; i++) {
      if (itens[i].dataVencimento <= limite7) idx = i;
    }
    return idx;
  })();

  return (
    <ul
      className={`divide-y divide-slate-100 ${
        itens.length > 8 ? "max-h-96 overflow-y-auto" : ""
      }`}
    >
      <AnimatePresence initial={false}>
        {itens.map((item, idx) => (
          <motion.div key={item.id} layout>
            <motion.li
              layoutId={`painel-${item.id}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                paddingTop: 0,
                paddingBottom: 0,
              }}
              transition={{ duration: 0.2 }}
              className="py-2 flex items-center gap-2 overflow-hidden"
            >
              <BadgeUrgencia data={item.dataVencimento} />
              {item.tipo === "receita" ? (
                <ArrowUpCircle
                  size={16}
                  className="text-emerald-500 shrink-0"
                  aria-label="Receita"
                />
              ) : (
                <ArrowDownCircle
                  size={16}
                  className="text-rose-500 shrink-0"
                  aria-label="Despesa"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.descricao}</div>
                <div className="font-mono text-xs text-slate-500">
                  {formatBRL(item.valor)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onConfirmar(item)}
                disabled={processando === item.id}
                aria-label={
                  item.tipo === "despesa"
                    ? `Marcar ${item.descricao} como paga`
                    : `Marcar ${item.descricao} como recebida`
                }
                className="inline-flex items-center gap-1 text-xs font-medium px-2 h-7 rounded-md text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
              >
                {processando === item.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {item.tipo === "despesa" ? "Pagar" : "Receber"}
              </button>
            </motion.li>
            {idx === ultimoEm7 && idx < itens.length - 1 && (
              <div className="flex items-center gap-2 py-2">
                <hr className="flex-1 border-slate-200" />
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                  Mais adiante
                </span>
                <hr className="flex-1 border-slate-200" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function IconeTipo({ tipo }: { tipo: TipoLancHoje }) {
  if (tipo === "receita") {
    return (
      <ArrowUpCircle
        size={18}
        className="text-emerald-500 shrink-0"
        aria-label="Receita"
      />
    );
  }
  if (tipo === "despesa") {
    return (
      <ArrowDownCircle
        size={18}
        className="text-rose-500 shrink-0"
        aria-label="Despesa"
      />
    );
  }
  return (
    <ArrowLeftRight
      size={18}
      className="text-violet-500 shrink-0"
      aria-label="Transferência"
    />
  );
}

function CategoriaBadge({
  cat,
}: {
  cat: { nome: string; cor: string; icone?: string };
}) {
  const Icon = iconeDaCategoria(cat.icone);
  return (
    <span
      className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ background: `${cat.cor}1a`, color: cat.cor }}
    >
      <Icon size={9} />
      {cat.nome}
    </span>
  );
}

function BadgeUrgencia({ data }: { data: string }) {
  const hoje = todayISO();
  const amanha = addDaysISO(hoje, 1);
  let label: string;
  let className: string;
  if (data === hoje) {
    label = "Hoje";
    className = "bg-rose-100 text-rose-700";
  } else if (data === amanha) {
    label = "Amanhã";
    className = "bg-amber-100 text-amber-700";
  } else {
    const [, mm, dd] = data.split("-");
    label = `${dd}/${mm}`;
    className = "bg-slate-100 text-slate-600";
  }
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 w-12 text-center ${className}`}
    >
      {label}
    </span>
  );
}
