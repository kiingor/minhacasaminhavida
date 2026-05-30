"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Trophy, ListPlus, CalendarDays, BookOpen, Flame, TrendingUp, CheckSquare, Target, Tv2, ArrowRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Pill } from "@/components/ui/pill";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { XPLineChart } from "@/components/tarefas/XPLineChart";
import { TarefasPorPessoaChart } from "@/components/tarefas/TarefasPorPessoaChart";
import { CategoryPieChart } from "@/components/financeiro/CategoryPieChart";
import { getTituloByNivel } from "@/lib/levelTitles";
import { calcularNivel } from "@/lib/xpCalculator";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

interface ShortcutProps {
  href: string;
  icon: typeof Trophy;
  title: string;
  subtitle: string;
  tone: "coral" | "dark" | "white";
  external?: boolean;
}

function Shortcut({ href, icon: Icon, title, subtitle, tone, external }: ShortcutProps) {
  const toneClass =
    tone === "coral" ? "bg-coral-500 text-white shadow-pop"
    : tone === "dark" ? "bg-ink-900 text-white"
    : "bg-white text-ink-900 shadow-soft";
  const Component = external ? "a" : Link;
  const linkProps = external ? { href, target: "_blank", rel: "noopener noreferrer" as const } : { href };

  return (
    <Component
      {...linkProps as { href: string }}
      className={`group rounded-3xl p-5 flex flex-col justify-between min-h-[140px] transition-all hover:-translate-y-1 hover:shadow-card ${toneClass}`}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${tone === "white" ? "bg-cream-100 text-ink-700" : "bg-white/15"}`}>
        <Icon size={20} />
      </div>
      <div className="mt-3">
        <div className="font-display font-bold text-lg flex items-center gap-1.5">
          {title}
          <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
        <div className={`text-xs mt-0.5 ${tone === "white" ? "text-ink-400" : "text-white/65"}`}>{subtitle}</div>
      </div>
    </Component>
  );
}

export default function TarefasPage() {
  const token = useSessionToken();
  const ranking = useQuery(api.pessoas.ranking, token ? { sessionToken: token } : "skip");
  const xp7Dias = useQuery(api.tarefas.dashboardTarefas.xpUltimos7Dias, token ? { sessionToken: token } : "skip");
  const tarefasPessoa = useQuery(api.tarefas.dashboardTarefas.tarefasPorPessoa, token ? { sessionToken: token } : "skip");
  const tarefasCategoria = useQuery(api.tarefas.dashboardTarefas.tarefasPorCategoria, token ? { sessionToken: token } : "skip");
  const taxas = useQuery(api.tarefas.dashboardTarefas.taxaConclusao, token ? { sessionToken: token } : "skip");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="py-6 md:py-10 space-y-6">
      <motion.section variants={item}>
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Gamificação</span>
          <span className="h-px w-8 bg-cream-300" />
          <span className="text-[10px] text-ink-400 font-medium">Família</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
          Tarefas
        </h1>
        <p className="text-ink-500 mt-1">Dashboard gamificado da família</p>
      </motion.section>

      <motion.section variants={item} className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Shortcut href="/tarefas/hoje"     icon={ListPlus}     title="Hoje"          subtitle="Checks gamificados" tone="coral" />
        <Shortcut href="/tarefas/catalogo" icon={BookOpen}     title="Catálogo"      subtitle="Gerenciar tarefas"  tone="white" />
        <Shortcut href="/tarefas/agenda"   icon={CalendarDays} title="Definir"       subtitle="Encaixe inteligente" tone="white" />
        <Shortcut href="/tv"               icon={Tv2}          title="Modo Painel"   subtitle="Tela cheia"          tone="dark" external />
      </motion.section>

      <motion.section variants={item} className="grid gap-4 grid-cols-3">
        {taxas === undefined
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)
          : [
              { label: "Hoje",   valor: taxas.taxaHoje,   icon: CheckSquare, tone: "white" as const },
              { label: "Semana", valor: taxas.taxaSemana, icon: TrendingUp,  tone: "dark"  as const },
              { label: "Mês",    valor: taxas.taxaMes,    icon: Target,      tone: "coral" as const },
            ].map(({ label, valor, icon, tone }) => (
              <Stat
                key={label}
                label={label}
                icon={icon}
                tone={tone}
                value={
                  valor !== null
                    ? <>{valor}<span className="text-2xl opacity-60">%</span></>
                    : "—"
                }
              />
            ))}
      </motion.section>

      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="text-coral-500" size={22} />
          <h2 className="font-display font-bold text-xl text-ink-900">Ranking da Família</h2>
        </div>
        {ranking === undefined ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
        ) : ranking.length === 0 ? (
          <Card>
            <div className="text-center py-6 text-ink-400 text-sm">
              <Link href="/pessoas" className="text-coral-600 font-semibold hover:underline">
                Cadastre pessoas para ver o ranking →
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {ranking.map((p, idx) => {
              const titulo = getTituloByNivel(p.nivelAtual);
              const { xpAtual, xpProximo } = calcularNivel(p.xpTotal);
              const pct = Math.min((xpAtual / xpProximo) * 100, 100);
              const isLeader = idx === 0;
              return (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card tone={isLeader ? "dark" : "white"} className="flex items-center gap-4" padding="md">
                    <div className={`font-display font-extrabold text-2xl w-10 text-center ${isLeader ? "text-coral-400" : "text-ink-300"}`}>
                      {idx + 1}
                    </div>
                    <PersonAvatar pessoa={p} size={52} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-display font-bold ${isLeader ? "text-white" : "text-ink-900"}`}>
                          {p.apelido ?? p.nome}
                        </span>
                        <Pill tone={isLeader ? "coral" : "neutral"} size="xs">
                          Nv {p.nivelAtual} · {titulo.titulo}
                        </Pill>
                        {p.streakDias >= 3 && (
                          <span className={`text-xs inline-flex items-center gap-0.5 font-semibold ${isLeader ? "text-coral-300" : "text-coral-600"}`}>
                            <Flame size={12} /> {p.streakDias}d
                          </span>
                        )}
                      </div>
                      <div className={`mt-2 h-2 rounded-full overflow-hidden ${isLeader ? "bg-white/15" : "bg-cream-200"}`}>
                        <motion.div
                          className={isLeader ? "h-full rounded-full bg-coral-400" : "h-full rounded-full bg-coral-500"}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.07 }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold ${isLeader ? "text-coral-400" : "text-ink-900"}`}>
                        {p.xpTotal.toLocaleString()} XP
                      </div>
                      <div className={`text-xs ${isLeader ? "text-white/60" : "text-ink-400"}`}>
                        {p.tarefasCompletadasTotal} tarefas
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      <motion.section variants={item} className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display font-bold text-lg mb-3 text-ink-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-coral-500" /> XP — Últimos 7 dias
          </h2>
          {xp7Dias ? (
            <XPLineChart dias={xp7Dias.dias} pessoasXp={xp7Dias.pessoasXp} />
          ) : (
            <Skeleton className="h-[260px]" />
          )}
        </Card>
        <Card>
          <h2 className="font-display font-bold text-lg mb-3 text-ink-900">Tarefas por pessoa</h2>
          {tarefasPessoa ? (
            <TarefasPorPessoaChart data={tarefasPessoa} />
          ) : (
            <Skeleton className="h-[220px]" />
          )}
        </Card>
      </motion.section>

      <motion.section variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg mb-3 text-ink-900">Tarefas por categoria (30 dias)</h2>
          {tarefasCategoria ? (
            <CategoryPieChart data={tarefasCategoria} />
          ) : (
            <Skeleton className="h-[280px]" />
          )}
        </Card>
      </motion.section>
    </motion.div>
  );
}
