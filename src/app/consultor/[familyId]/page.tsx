"use client";
import { useState, use } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  MessageCircle, CalendarPlus, Receipt, Target, MessageSquare, ChevronRight, Eye,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { FinanceiroDashboard } from "@/components/financeiro/FinanceiroDashboard";
import { ComentarioCard } from "@/components/consultor/ComentarioCard";
import { NovoComentarioForm } from "@/components/consultor/NovoComentarioForm";
import { AgendarReuniaoDialog } from "@/components/consultor/AgendarReuniaoDialog";
import { formatBRL } from "@/lib/formatters";
import { currentMonth } from "@/lib/monthUtils";

export default function ConsultorClientePage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = use(params);
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const [showAgendar, setShowAgendar] = useState(false);
  const [tabAtiva, setTabAtiva] = useState<"dashboard" | "comentarios" | "reunioes" | "dividas" | "metas">("dashboard");

  const resumo = useQuery(
    api.consultor.resumoCliente,
    token ? { sessionToken: token, familyId } : "skip",
  );

  if (resumo === undefined) {
    return (
      <div className="py-6 md:py-10 space-y-6">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="py-6 md:py-10 space-y-6">
      {/* Header com nome do cliente + ações consultor */}
      <PageHeader
        backHref="/consultor"
        backLabel="Voltar para meus clientes"
        title={resumo.nomeFamilia}
        subtitle={`${resumo.qtdPessoas} ${resumo.qtdPessoas === 1 ? "pessoa" : "pessoas"} · ${resumo.qtdContas} ${resumo.qtdContas === 1 ? "conta" : "contas"} · ${resumo.qtdDividasAtivas} dívidas · ${resumo.qtdMetasAtivas} metas`}
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-cream-100 text-ink-500 text-xs font-semibold">
              <Eye size={13} /> Modo leitura
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowAgendar(true)}>
              <CalendarPlus size={14} /> Agendar
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-cream-200 overflow-x-auto -mx-4 px-4">
        <TabBtn ativo={tabAtiva === "dashboard"} onClick={() => setTabAtiva("dashboard")}>
          Dashboard
        </TabBtn>
        <TabBtn ativo={tabAtiva === "comentarios"} onClick={() => setTabAtiva("comentarios")}>
          <MessageSquare size={13} /> Comentários
        </TabBtn>
        <TabBtn ativo={tabAtiva === "reunioes"} onClick={() => setTabAtiva("reunioes")}>
          <CalendarPlus size={13} /> Reuniões
        </TabBtn>
        <TabBtn ativo={tabAtiva === "dividas"} onClick={() => setTabAtiva("dividas")}>
          <Receipt size={13} /> Dívidas
          {resumo.qtdDividasAtivas > 0 && <Pill tone="coral" size="xs">{resumo.qtdDividasAtivas}</Pill>}
        </TabBtn>
        <TabBtn ativo={tabAtiva === "metas"} onClick={() => setTabAtiva("metas")}>
          <Target size={13} /> Metas
          {resumo.qtdMetasAtivas > 0 && <Pill tone="neutral" size="xs">{resumo.qtdMetasAtivas}</Pill>}
        </TabBtn>
      </div>

      {/* Tab content */}
      {tabAtiva === "dashboard" && (
        <div>
          <div className="flex justify-end mb-4">
            <MonthSelector mes={mes} onChange={setMes} />
          </div>
          <FinanceiroDashboard
            familyIdAlvo={familyId}
            readonly
            mes={mes}
            onMesChange={setMes}
            hideHeader
          />
        </div>
      )}

      {tabAtiva === "comentarios" && <TabComentarios familyId={familyId} />}
      {tabAtiva === "reunioes" && <TabReunioes familyId={familyId} setShowAgendar={setShowAgendar} />}
      {tabAtiva === "dividas" && <TabDividas familyId={familyId} />}
      {tabAtiva === "metas" && <TabMetas familyId={familyId} />}

      <AgendarReuniaoDialog
        open={showAgendar}
        onClose={() => setShowAgendar(false)}
        familyId={familyId}
      />
    </div>
  );
}

function TabBtn({
  ativo, onClick, children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap font-medium transition-colors ${
        ativo
          ? "text-coral-600 border-b-2 border-coral-500 -mb-px"
          : "text-ink-500 hover:text-ink-900 border-b-2 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// =================== TAB COMENTÁRIOS ===================
function TabComentarios({ familyId }: { familyId: string }) {
  const token = useSessionToken();
  const [incluirResolvidos, setIncluirResolvidos] = useState(false);
  const comentarios = useQuery(
    api.consultor.comentarios,
    token ? { sessionToken: token, familyId, incluirResolvidos } : "skip",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-lg text-ink-900">Comentários</h2>
        <label className="flex items-center gap-2 text-xs text-ink-500 cursor-pointer">
          <input
            type="checkbox"
            checked={incluirResolvidos}
            onChange={(e) => setIncluirResolvidos(e.target.checked)}
            className="accent-coral-500"
          />
          Incluir resolvidos
        </label>
      </div>
      <Card>
        <NovoComentarioForm
          familyId={familyId}
          contextoTela={`/consultor/${familyId}/geral`}
          placeholder="Novo comentário geral..."
        />
      </Card>
      {comentarios === undefined ? (
        <Skeleton className="h-24 rounded-3xl" />
      ) : comentarios.length === 0 ? (
        <Card tone="cream" className="text-center py-8 text-sm text-ink-400">
          Nenhum comentário.
        </Card>
      ) : (
        <div className="space-y-2">
          {comentarios.map((c) => (
            <ComentarioCard key={c._id} comentario={c} showContexto />
          ))}
        </div>
      )}
    </div>
  );
}

// =================== TAB REUNIÕES ===================
function TabReunioes({
  familyId, setShowAgendar,
}: {
  familyId: string;
  setShowAgendar: (b: boolean) => void;
}) {
  const token = useSessionToken();
  const reunioes = useQuery(
    api.consultor.reunioes,
    token ? { sessionToken: token, familyId } : "skip",
  );

  function formatDataHora(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-lg text-ink-900">Reuniões</h2>
        <Button size="sm" onClick={() => setShowAgendar(true)}>
          <CalendarPlus size={14} /> Agendar
        </Button>
      </div>
      {reunioes === undefined ? (
        <Skeleton className="h-24 rounded-3xl" />
      ) : reunioes.length === 0 ? (
        <Card tone="cream" className="text-center py-8 text-sm text-ink-400">
          Nenhuma reunião agendada.
        </Card>
      ) : (
        <div className="space-y-2">
          {reunioes.map((r) => (
            <Card key={r._id} padding="md" tone={r.status === "realizada" ? "cream" : "white"}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-900 truncate">{r.titulo}</div>
                  <div className="text-xs text-ink-400">
                    {formatDataHora(r.dataHora)} · {r.duracaoMinutos}min
                  </div>
                </div>
                <Pill tone={r.status === "agendada" ? "coral" : r.status === "realizada" ? "neutral" : "soft"} size="xs">
                  {r.status}
                </Pill>
              </div>
              {r.pauta && (
                <div className="text-xs text-ink-700 mt-2 whitespace-pre-wrap">{r.pauta}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== TAB DÍVIDAS ===================
function TabDividas({ familyId }: { familyId: string }) {
  const token = useSessionToken();
  const dividas = useQuery(
    api.consultor.dividasCliente,
    token ? { sessionToken: token, familyId } : "skip",
  );
  const ativas = dividas?.filter((d) => d.ativa) ?? [];
  const totalSaldo = ativas.reduce((s, d) => s + d.saldoDevedor, 0);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg text-ink-900">Dívidas ativas</h2>
      {dividas === undefined ? (
        <Skeleton className="h-32 rounded-3xl" />
      ) : ativas.length === 0 ? (
        <Card tone="cream" className="text-center py-8 text-sm text-ink-400">
          Nenhuma dívida ativa.
        </Card>
      ) : (
        <>
          <Card tone="dark">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-white/70 font-semibold">Saldo total devedor</div>
                <div className="font-mono font-bold text-2xl text-coral-400 tabular-nums mt-1">
                  {formatBRL(totalSaldo)}
                </div>
                <div className="text-xs text-white/65 mt-1">
                  {ativas.length} {ativas.length === 1 ? "dívida ativa" : "dívidas ativas"}
                </div>
              </div>
            </div>
          </Card>
          <div className="space-y-2">
            {ativas.map((d) => (
              <Card key={d._id} padding="md">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-900 truncate">{d.nome}</div>
                    {d.credor && <div className="text-xs text-ink-400 truncate">{d.credor}</div>}
                  </div>
                  <div className="font-mono text-sm font-bold text-ink-900 shrink-0 tabular-nums">
                    {formatBRL(d.saldoDevedor)}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-500 flex-wrap">
                  <Pill tone="neutral" size="xs">{d.tipo}</Pill>
                  <span>Parcelas: {d.parcelasPagas}/{d.totalParcelas}</span>
                  <span>Juros: {d.taxaJuros}% {d.taxaPeriodicidade === "mensal" ? "a.m." : "a.a."}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =================== TAB METAS ===================
function TabMetas({ familyId }: { familyId: string }) {
  const token = useSessionToken();
  const metas = useQuery(
    api.consultor.metasCliente,
    token ? { sessionToken: token, familyId } : "skip",
  );
  const ativas = metas?.filter((m) => m.ativa) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg text-ink-900">Metas / Objetivos</h2>
      {metas === undefined ? (
        <Skeleton className="h-32 rounded-3xl" />
      ) : ativas.length === 0 ? (
        <Card tone="cream" className="text-center py-8 text-sm text-ink-400">
          Nenhuma meta ativa.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ativas.map((m) => {
            const pct = m.valorAlvo > 0 ? Math.min(100, Math.round((m.valorAtual / m.valorAlvo) * 100)) : 0;
            return (
              <Card key={m._id} padding="md">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: m.cor || "#FF6B47" }}
                  >
                    <Target size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-900 truncate">{m.titulo}</div>
                    <div className="text-xs text-ink-400 font-mono tabular-nums">
                      {formatBRL(m.valorAtual)} / {formatBRL(m.valorAlvo)}
                    </div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-coral-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] mt-2 text-ink-400">
                  <span className="font-semibold text-ink-700">{pct}% concluído</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
