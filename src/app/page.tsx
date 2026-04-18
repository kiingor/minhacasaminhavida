"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Wallet, ListChecks, Target, Users, TrendingUp, Flame, Award,
  AlertCircle, ArrowDownCircle, ArrowUpCircle, Tv2, Trophy,
  Zap, Calendar,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useSession } from "@/contexts/SessionContext";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { LucideIcon as LucideIconDynamic } from "@/components/tarefas/LucideIcon";
import { getTituloByNivel } from "@/lib/levelTitles";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate, todayISO } from "@/lib/formatters";
import { currentMonth } from "@/lib/monthUtils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-5 ${className}`}>
      {children}
    </div>
  );
}

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  return `${diff}d atrás`;
}

export default function Home() {
  const token = useSessionToken();
  const { session } = useSession();
  const hoje = todayISO();
  const mes = currentMonth();

  const pessoas = useQuery(api.pessoas.ranking, token ? { sessionToken: token } : "skip");
  const pessoasList = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const resumo = useQuery(api.financeiro.dashboardFinanceiro.resumoMes, token ? { sessionToken: token, mes } : "skip");
  const proximas = useQuery(api.financeiro.dashboardFinanceiro.proximasContas, token ? { sessionToken: token } : "skip");
  const taxas = useQuery(api.tarefas.dashboardTarefas.taxaConclusao, token ? { sessionToken: token } : "skip");
  const conquistas = useQuery(api.tarefas.dashboardTarefas.conquistasRecentes, token ? { sessionToken: token } : "skip");
  const lancamentosHoje = useQuery(api.tarefas.lancamentos.listByDate, token ? { sessionToken: token, data: hoje } : "skip");

  const ativas = pessoasList?.filter((p) => p.ativo) ?? [];
  const totalHoje = lancamentosHoje?.length ?? 0;
  const feitasHoje = lancamentosHoje?.filter((l) => l.completada).length ?? 0;
  const xpFamilia = ativas.reduce((s, p) => s + p.xpTotal, 0);
  const maiorStreak = ativas.reduce((max, p) => Math.max(max, p.streakDias), 0);

  // Tarefas por pessoa hoje
  const tarefasPorPessoa = ativas.map((p) => {
    const lancs = lancamentosHoje?.filter((l) => l.pessoaId === p._id) ?? [];
    return { pessoa: p, total: lancs.length, feitas: lancs.filter((l) => l.completada).length };
  });

  const firstName = session?.name?.split(" ")[0] ?? "família";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.header variants={item}>
        <h1 className="font-display text-3xl font-extrabold">Olá, {firstName}!</h1>
        <p className="text-slate-500 flex items-center gap-2 mt-0.5">
          <Calendar size={14} />
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          {proximas && proximas.length > 0 && (
            <span className="text-warning text-xs font-medium ml-2">· {proximas.length} conta{proximas.length > 1 ? "s" : ""} pendente{proximas.length > 1 ? "s" : ""}</span>
          )}
        </p>
      </motion.header>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {resumo ? (
          <GlassCard>
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Saldo do mês</div>
            <div className={`font-mono font-bold text-lg mt-1 ${resumo.saldo >= 0 ? "text-success" : "text-danger"}`}>
              {formatBRL(resumo.saldo)}
            </div>
          </GlassCard>
        ) : <Skeleton className="h-20 rounded-2xl" />}

        <GlassCard>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Tarefas hoje</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-bold text-lg ${feitasHoje === totalHoje && totalHoje > 0 ? "text-success" : "text-primary"}`}>
              {taxas?.taxaHoje ?? 0}%
            </span>
            <span className="text-xs text-slate-400">{feitasHoje}/{totalHoje}</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">XP da família</div>
          <div className="font-bold text-lg text-amber-500 mt-1 flex items-center gap-1">
            <Zap size={16} />
            {xpFamilia.toLocaleString("pt-BR")}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Maior streak</div>
          <div className="font-bold text-lg text-orange-500 mt-1 flex items-center gap-1">
            <Flame size={16} />
            {maiorStreak} dia{maiorStreak !== 1 ? "s" : ""}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tarefas do dia + Finanças */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        {/* Tarefas do dia */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <ListChecks size={20} className="text-primary" /> Tarefas do Dia
            </h2>
            <Link href="/tarefas/hoje" className="text-xs text-primary hover:underline">Abrir →</Link>
          </div>
          {lancamentosHoje === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : totalHoje === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">Nenhuma tarefa hoje</div>
          ) : (
            <div className="space-y-3">
              {tarefasPorPessoa.filter((t) => t.total > 0).map(({ pessoa, total, feitas }) => {
                const pct = Math.round((feitas / total) * 100);
                return (
                  <div key={pessoa._id} className="flex items-center gap-3">
                    <PersonAvatar pessoa={pessoa} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{pessoa.apelido ?? pessoa.nome.split(" ")[0]}</span>
                        <span className={`text-xs font-semibold ${pct === 100 ? "text-success" : "text-slate-500"}`}>
                          {feitas}/{total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <motion.div
                          className={`h-full rounded-full ${pct === 100 ? "bg-success" : "bg-primary"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Finanças mini */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Wallet size={20} className="text-rose-500" /> Finanças
            </h2>
            <Link href="/financeiro" className="text-xs text-primary hover:underline">Ver mais →</Link>
          </div>
          {resumo === undefined ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
          ) : (
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1"><ArrowUpCircle size={13} className="text-success" /> A receber</span>
                <span className="font-mono font-semibold text-success">{formatBRL(resumo.aReceber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1"><ArrowDownCircle size={13} className="text-danger" /> A pagar</span>
                <span className="font-mono font-semibold text-danger">{formatBRL(resumo.aPagar)}</span>
              </div>
            </div>
          )}

          {/* Próximas contas */}
          {proximas === undefined ? (
            <Skeleton className="h-20 rounded" />
          ) : proximas.length === 0 ? (
            <div className="text-center py-3 text-slate-400 text-xs">Nenhuma conta pendente</div>
          ) : (
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Próximas contas</div>
              <ul className="space-y-1.5">
                {proximas.slice(0, 5).map((d) => (
                  <li key={d._id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle size={12} className="text-warning shrink-0" />
                      <span className="truncate">{d.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400">{formatDate(d.dataVencimento)}</span>
                      <span className="font-mono font-semibold">{formatBRL(d.valor)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Conquistas + Ranking */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        {/* Conquistas recentes */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Award size={20} className="text-amber-500" /> Conquistas
            </h2>
          </div>
          {conquistas === undefined ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
          ) : conquistas.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Award size={32} className="mx-auto mb-2 opacity-30" />
              Complete tarefas para desbloquear conquistas!
            </div>
          ) : (
            <ul className="space-y-2">
              {conquistas.slice(0, 5).map((c) => (
                <li key={c._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white shrink-0">
                    <LucideIconDynamic name={c.icone} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{c.nome}</div>
                    <div className="text-[10px] text-slate-400">{c.pessoaNome} · {timeAgo(c.desbloqueadaEm)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Ranking */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" /> Ranking
            </h2>
            <Link href="/tarefas" className="text-xs text-primary hover:underline">Ver completo →</Link>
          </div>
          {pessoas === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">Cadastre pessoas para ver o ranking</div>
          ) : (
            <ul className="space-y-2">
              {pessoas.slice(0, 5).map((p, i) => {
                const titulo = getTituloByNivel(p.nivelAtual);
                const medals = ["#FBBF24", "#94A3B8", "#B45309"];
                return (
                  <li key={p._id} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: i < 3 ? `${medals[i]}20` : "#f1f5f920",
                        color: i < 3 ? medals[i] : "#94A3B8",
                      }}
                    >
                      {i + 1}º
                    </div>
                    <PersonAvatar pessoa={p} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.apelido ?? p.nome.split(" ")[0]}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${titulo.corClasse}15`, color: titulo.corClasse }}>
                          Nv {p.nivelAtual}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{titulo.titulo}</span>
                        {p.streakDias >= 2 && (
                          <span className="text-orange-500 inline-flex items-center gap-0.5">
                            <Flame size={9} />{p.streakDias}d
                          </span>
                        )}
                        <span className="font-mono">{p.xpTotal.toLocaleString("pt-BR")} XP</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </motion.div>

      {/* Atalhos */}
      <motion.section variants={item}>
        <h2 className="font-display font-bold text-lg mb-3">Atalhos</h2>
        <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
          {[
            { href: "/tarefas/hoje", label: "Tarefas", icon: ListChecks, color: "#6366F1" },
            { href: "/financeiro/despesas", label: "Despesas", icon: ArrowDownCircle, color: "#F43F5E" },
            { href: "/financeiro/receitas", label: "Receitas", icon: ArrowUpCircle, color: "#10B981" },
            { href: "/financeiro/metas", label: "Metas", icon: Target, color: "#F59E0B" },
            { href: "/tv", label: "Modo TV", icon: Tv2, color: "#8B5CF6", target: "_blank" },
            { href: "/pessoas", label: "Pessoas", icon: Users, color: "#06B6D4" },
          ].map(({ href, label, icon: Icon, color, target }) => (
            <Link
              key={href}
              href={href}
              target={target}
              className="rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 p-3 flex flex-col items-center gap-2 hover:shadow-md hover:bg-white/70 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-sm"
                style={{ background: color }}
              >
                <Icon size={20} />
              </div>
              <span className="text-xs font-medium text-slate-600">{label}</span>
            </Link>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
