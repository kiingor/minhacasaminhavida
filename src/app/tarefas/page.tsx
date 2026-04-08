"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Trophy, ListPlus, CalendarDays, BookOpen, Flame, TrendingUp, CheckSquare, Target, Tv2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { XPLineChart } from "@/components/tarefas/XPLineChart";
import { TarefasPorPessoaChart } from "@/components/tarefas/TarefasPorPessoaChart";
import { CategoryPieChart } from "@/components/financeiro/CategoryPieChart";
import { getTituloByNivel } from "@/lib/levelTitles";
import { calcularNivel } from "@/lib/xpCalculator";

const podioColors = ["#FBBF24", "#94A3B8", "#B45309"];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function TarefasPage() {
  const token = useSessionToken();
  const ranking = useQuery(api.pessoas.ranking, token ? { sessionToken: token } : "skip");
  const xp7Dias = useQuery(api.tarefas.dashboardTarefas.xpUltimos7Dias, token ? { sessionToken: token } : "skip");
  const tarefasPessoa = useQuery(api.tarefas.dashboardTarefas.tarefasPorPessoa, token ? { sessionToken: token } : "skip");
  const tarefasCategoria = useQuery(api.tarefas.dashboardTarefas.tarefasPorCategoria, token ? { sessionToken: token } : "skip");
  const taxas = useQuery(api.tarefas.dashboardTarefas.taxaConclusao, token ? { sessionToken: token } : "skip");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item}>
        <h1 className="font-display text-3xl font-extrabold">Tarefas</h1>
        <p className="text-slate-500">Dashboard gamificado da família</p>
      </motion.div>

      {/* Atalhos */}
      <motion.div variants={item} className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Link href="/tarefas/hoje" className="rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white p-5 hover:shadow-lg transition-shadow group">
          <ListPlus size={24} className="group-hover:scale-110 transition-transform" />
          <div className="font-display font-bold text-lg mt-2">Tarefas de Hoje</div>
          <div className="text-xs text-white/80">Checks gamificados</div>
        </Link>
        <Link href="/tarefas/catalogo" className="rounded-xl bg-white border p-5 hover:shadow-md transition-shadow group">
          <BookOpen size={24} className="text-primary group-hover:scale-110 transition-transform" />
          <div className="font-display font-bold text-lg mt-2">Catálogo</div>
          <div className="text-xs text-slate-500">Gerenciar tarefas</div>
        </Link>
        <Link href="/tarefas/agenda" className="rounded-xl bg-white border p-5 hover:shadow-md transition-shadow group">
          <CalendarDays size={24} className="text-primary group-hover:scale-110 transition-transform" />
          <div className="font-display font-bold text-lg mt-2">Definir Tarefas</div>
          <div className="text-xs text-slate-500">Encaixe inteligente</div>
        </Link>
        <a href="/tv" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white border p-5 hover:shadow-md transition-shadow group">
          <Tv2 size={24} className="text-slate-600 group-hover:scale-110 group-hover:text-primary transition-all" />
          <div className="font-display font-bold text-lg mt-2">Modo TV</div>
          <div className="text-xs text-slate-500">Tela cheia, nova guia</div>
        </a>
      </motion.div>

      {/* Taxa de conclusão */}
      <motion.div variants={item} className="grid gap-3 grid-cols-3">
        {taxas === undefined
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : [
              { label: "Hoje", valor: taxas.taxaHoje, icon: CheckSquare, color: "#6366F1" },
              { label: "Semana", valor: taxas.taxaSemana, icon: TrendingUp, color: "#10B981" },
              { label: "Mês", valor: taxas.taxaMes, icon: Target, color: "#F59E0B" },
            ].map(({ label, valor, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl bg-white border p-4 shadow-sm text-center">
                <Icon size={20} className="mx-auto mb-1" style={{ color }} />
                <div className="font-gamer font-bold text-2xl" style={{ color }}>
                  {valor !== null ? `${valor}%` : "—"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
      </motion.div>

      {/* Ranking */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="text-amber-500" size={22} />
          <h2 className="font-display font-bold text-xl">Ranking da Família</h2>
        </div>
        {ranking === undefined ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : ranking.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-dashed p-6 text-center text-slate-400 text-sm">
            <Link href="/pessoas" className="text-primary font-medium hover:underline">Cadastre pessoas para ver o ranking →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((p, idx) => {
              const titulo = getTituloByNivel(p.nivelAtual);
              const { xpAtual, xpProximo } = calcularNivel(p.xpTotal);
              const pct = Math.min((xpAtual / xpProximo) * 100, 100);
              return (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-xl bg-white border p-4 flex items-center gap-4"
                  style={idx < 3 ? { borderLeftWidth: 4, borderLeftColor: podioColors[idx] } : undefined}
                >
                  <div className="font-display font-extrabold text-2xl w-8 text-center" style={{ color: idx < 3 ? podioColors[idx] : "#94A3B8" }}>
                    {idx + 1}º
                  </div>
                  <PersonAvatar pessoa={p} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold">{p.apelido ?? p.nome}</span>
                      <span className="text-xs font-medium" style={{ color: titulo.corClasse }}>
                        Nv {p.nivelAtual} · {titulo.titulo}
                      </span>
                      {p.streakDias >= 3 && (
                        <span className="text-xs inline-flex items-center gap-0.5 text-orange-500 font-medium">
                          <Flame size={12} /> {p.streakDias}d
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${titulo.corClasse}, #FBBF24)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.07 }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-gamer font-bold text-amber-500">{p.xpTotal.toLocaleString()} XP</div>
                    <div className="text-xs text-slate-500">{p.tarefasCompletadasTotal} tarefas</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Gráficos */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white border p-5 shadow-sm">
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> XP — Últimos 7 dias
          </h2>
          {xp7Dias ? (
            <XPLineChart dias={xp7Dias.dias} pessoasXp={xp7Dias.pessoasXp} />
          ) : (
            <Skeleton className="h-[260px]" />
          )}
        </div>
        <div className="rounded-2xl bg-white border p-5 shadow-sm">
          <h2 className="font-display font-bold text-lg mb-3">Tarefas por pessoa</h2>
          {tarefasPessoa ? (
            <TarefasPorPessoaChart data={tarefasPessoa} />
          ) : (
            <Skeleton className="h-[220px]" />
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="rounded-2xl bg-white border p-5 shadow-sm">
        <h2 className="font-display font-bold text-lg mb-3">Tarefas por categoria (30 dias)</h2>
        {tarefasCategoria ? (
          <CategoryPieChart data={tarefasCategoria} />
        ) : (
          <Skeleton className="h-[280px]" />
        )}
      </motion.div>
    </motion.div>
  );
}
