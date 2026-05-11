"use client";
import { useState, use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Wallet,
  TrendingDown,
  Target,
  MessageCircle,
  CalendarPlus,
  PieChart,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate } from "@/lib/formatters";
import { ComentarioCard } from "@/components/consultor/ComentarioCard";
import { NovoComentarioForm } from "@/components/consultor/NovoComentarioForm";
import { AgendarReuniaoDialog } from "@/components/consultor/AgendarReuniaoDialog";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type Tab = "resumo" | "dividas" | "metas" | "comentarios" | "reunioes";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsultorClientePage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = use(params);
  const token = useSessionToken();
  const [tab, setTab] = useState<Tab>("resumo");
  const [showAgendar, setShowAgendar] = useState(false);
  const [mes, setMes] = useState(currentMonth());

  const resumo = useQuery(
    api.consultor.resumoCliente,
    token ? { sessionToken: token, familyId } : "skip"
  );

  if (resumo === undefined) {
    return <ResumoSkeleton />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <Link
          href="/consultor"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Voltar para clientes
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-extrabold">{resumo.nomeFamilia}</h1>
            <p className="text-slate-500 text-sm">
              {resumo.qtdPessoas} {resumo.qtdPessoas === 1 ? "pessoa" : "pessoas"}, {resumo.qtdContas} contas
            </p>
          </div>
          <Button onClick={() => setShowAgendar(true)} variant="outline">
            <CalendarPlus size={16} /> Agendar reunião
          </Button>
        </div>
      </motion.div>

      {/* Pessoas */}
      {resumo.pessoas.length > 0 && (
        <motion.div variants={item} className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Users size={16} className="text-slate-400" /> Pessoas da família
          </div>
          <div className="flex flex-wrap gap-2">
            {resumo.pessoas.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1"
              >
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: p.corTema }}
                  >
                    {(p.apelido ?? p.nome).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-slate-700">{p.apelido ?? p.nome}</span>
                <span className="text-[10px] text-slate-400">Nv {p.nivelAtual}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={item} className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          <TabBtn active={tab === "resumo"} onClick={() => setTab("resumo")}>
            <PieChart size={14} /> Resumo
          </TabBtn>
          <TabBtn active={tab === "dividas"} onClick={() => setTab("dividas")}>
            <TrendingDown size={14} /> Dívidas
          </TabBtn>
          <TabBtn active={tab === "metas"} onClick={() => setTab("metas")}>
            <Target size={14} /> Metas
          </TabBtn>
          <TabBtn active={tab === "comentarios"} onClick={() => setTab("comentarios")}>
            <MessageCircle size={14} /> Comentários
          </TabBtn>
          <TabBtn active={tab === "reunioes"} onClick={() => setTab("reunioes")}>
            <CalendarPlus size={14} /> Reuniões
          </TabBtn>
        </div>
      </motion.div>

      {/* Conteudo */}
      <motion.div variants={item}>
        {tab === "resumo" && <TabResumo familyId={familyId} mes={mes} setMes={setMes} />}
        {tab === "dividas" && <TabDividas familyId={familyId} />}
        {tab === "metas" && <TabMetas familyId={familyId} />}
        {tab === "comentarios" && <TabComentarios familyId={familyId} />}
        {tab === "reunioes" && <TabReunioes familyId={familyId} setShowAgendar={setShowAgendar} />}
      </motion.div>

      <AgendarReuniaoDialog
        open={showAgendar}
        onClose={() => setShowAgendar(false)}
        familyId={familyId}
      />
    </motion.div>
  );
}

function ResumoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
        active
          ? "border-primary text-primary font-medium"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// =================== TAB RESUMO ===================
function TabResumo({
  familyId,
  mes,
  setMes,
}: {
  familyId: string;
  mes: string;
  setMes: (m: string) => void;
}) {
  const token = useSessionToken();
  const resumoMes = useQuery(
    api.consultor.resumoMesCliente,
    token ? { sessionToken: token, familyId, mes } : "skip"
  );

  function shiftMonth(delta: number) {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-lg">Resumo financeiro</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="px-2 py-1 rounded-md text-sm text-slate-500 hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[80px] text-center">{mes}</span>
          <button
            onClick={() => shiftMonth(1)}
            className="px-2 py-1 rounded-md text-sm text-slate-500 hover:bg-slate-100"
          >
            ›
          </button>
        </div>
      </div>

      {resumoMes === undefined ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ValorCard label="Receitas" valor={resumoMes.totalReceitas} cor="text-emerald-600" />
            <ValorCard label="Despesas" valor={resumoMes.totalDespesas} cor="text-rose-600" />
            <ValorCard
              label="Saldo"
              valor={resumoMes.saldo}
              cor={resumoMes.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}
            />
            <ValorCard
              label="Economia"
              valor={resumoMes.economia}
              cor={resumoMes.economia >= 0 ? "text-emerald-600" : "text-rose-600"}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            <ValorCard label="A pagar" valor={resumoMes.aPagar} cor="text-slate-700" />
            <ValorCard label="A receber" valor={resumoMes.aReceber} cor="text-slate-700" />
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Wallet size={16} /> Visão de leitura
            </div>
            Você está vendo dados de leitura. Para deixar uma observação, use a aba <strong>Comentários</strong>.
          </div>
        </>
      )}

      <NovoComentarioForm
        familyId={familyId}
        contextoTela={`/consultor/${familyId}/resumo:${mes}`}
        placeholder={`Comentário sobre ${mes}...`}
      />
    </div>
  );
}

function ValorCard({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`font-display font-bold text-lg ${cor}`}>{formatBRL(valor)}</div>
    </div>
  );
}

// =================== TAB DIVIDAS ===================
function TabDividas({ familyId }: { familyId: string }) {
  const token = useSessionToken();
  const dividas = useQuery(
    api.consultor.dividasCliente,
    token ? { sessionToken: token, familyId } : "skip"
  );
  const ativas = dividas?.filter((d) => d.ativa) ?? [];
  const totalSaldo = ativas.reduce((s, d) => s + d.saldoDevedor, 0);

  return (
    <div className="space-y-3">
      <h2 className="font-display font-bold text-lg">Dívidas</h2>
      {dividas === undefined ? (
        <Skeleton className="h-32" />
      ) : ativas.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nenhuma dívida ativa.</p>
      ) : (
        <>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-rose-600" />
            <span className="text-rose-900">
              <strong>{ativas.length}</strong> dívida{ativas.length === 1 ? "" : "s"} ativa{ativas.length === 1 ? "" : "s"} — Saldo total{" "}
              <strong>{formatBRL(totalSaldo)}</strong>
            </span>
          </div>
          <div className="space-y-2">
            {ativas.map((d) => (
              <div key={d._id} className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{d.nome}</div>
                    {d.credor && <div className="text-xs text-slate-500 truncate">{d.credor}</div>}
                  </div>
                  <div className="text-sm font-bold text-rose-600 shrink-0">
                    {formatBRL(d.saldoDevedor)}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                  <span>Tipo: {d.tipo}</span>
                  <span>
                    Parcelas: {d.parcelasPagas}/{d.totalParcelas}
                  </span>
                  <span>Juros: {d.taxaJuros}% {d.taxaPeriodicidade === "mensal" ? "a.m." : "a.a."}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <NovoComentarioForm
        familyId={familyId}
        contextoTela={`/consultor/${familyId}/dividas`}
        placeholder="Comentário sobre as dívidas..."
      />
    </div>
  );
}

// =================== TAB METAS ===================
function TabMetas({ familyId }: { familyId: string }) {
  const token = useSessionToken();
  const metas = useQuery(
    api.consultor.metasCliente,
    token ? { sessionToken: token, familyId } : "skip"
  );
  const ativas = metas?.filter((m) => m.ativa) ?? [];

  return (
    <div className="space-y-3">
      <h2 className="font-display font-bold text-lg">Metas / Objetivos</h2>
      {metas === undefined ? (
        <Skeleton className="h-32" />
      ) : ativas.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nenhuma meta ativa.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ativas.map((m) => {
            const pct = m.valorAlvo > 0 ? Math.min(100, Math.round((m.valorAtual / m.valorAlvo) * 100)) : 0;
            return (
              <div key={m._id} className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
                    style={{ backgroundColor: m.cor }}
                  >
                    {m.tipoEspecial === "reserva_emergencia" ? "🛡" : "🎯"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{m.titulo}</div>
                    <div className="text-xs text-slate-500">
                      {formatBRL(m.valorAtual)} / {formatBRL(m.valorAlvo)}
                    </div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: m.cor }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className="text-slate-500">{pct}% concluído</span>
                  {m.prazo && <span className="text-slate-400">Até {formatDate(m.prazo)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <NovoComentarioForm
        familyId={familyId}
        contextoTela={`/consultor/${familyId}/metas`}
        placeholder="Comentário sobre as metas..."
      />
    </div>
  );
}

// =================== TAB COMENTARIOS ===================
function TabComentarios({ familyId }: { familyId: string }) {
  const token = useSessionToken();
  const [incluirResolvidos, setIncluirResolvidos] = useState(false);
  const comentarios = useQuery(
    api.consultor.comentarios,
    token ? { sessionToken: token, familyId, incluirResolvidos } : "skip"
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-lg">Todos os comentários</h2>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={incluirResolvidos}
            onChange={(e) => setIncluirResolvidos(e.target.checked)}
          />
          Incluir resolvidos
        </label>
      </div>
      <NovoComentarioForm
        familyId={familyId}
        contextoTela={`/consultor/${familyId}/geral`}
        placeholder="Novo comentário geral..."
      />
      {comentarios === undefined ? (
        <Skeleton className="h-24" />
      ) : comentarios.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nenhum comentário.</p>
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

// =================== TAB REUNIOES ===================
function TabReunioes({
  familyId,
  setShowAgendar,
}: {
  familyId: string;
  setShowAgendar: (b: boolean) => void;
}) {
  const token = useSessionToken();
  const reunioes = useQuery(
    api.consultor.reunioes,
    token ? { sessionToken: token, familyId } : "skip"
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-lg">Reuniões</h2>
        <Button size="sm" onClick={() => setShowAgendar(true)}>
          <CalendarPlus size={14} /> Agendar
        </Button>
      </div>
      {reunioes === undefined ? (
        <Skeleton className="h-24" />
      ) : reunioes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Nenhuma reunião agendada.</p>
      ) : (
        <div className="space-y-2">
          {reunioes.map((r) => (
            <div
              key={r._id}
              className={`rounded-xl border p-3 ${
                r.status === "cancelada"
                  ? "bg-slate-50 border-slate-200 opacity-70"
                  : r.status === "realizada"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{r.titulo}</div>
                  <div className="text-xs text-slate-500">
                    {formatDataHora(r.dataHora)} · {r.duracaoMinutos}min
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
                    r.status === "agendada"
                      ? "bg-blue-100 text-blue-700"
                      : r.status === "realizada"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.pauta && (
                <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{r.pauta}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
