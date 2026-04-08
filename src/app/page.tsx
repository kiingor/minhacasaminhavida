"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Wallet, ListChecks, Target, Users, TrendingUp, Flame, CheckCheck } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { getTituloByNivel } from "@/lib/levelTitles";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";
import { todayISO } from "@/lib/formatters";
import { currentMonth } from "@/lib/monthUtils";

const atalhos = [
  { href: "/tarefas/hoje", label: "Tarefas de Hoje", icon: ListChecks, color: "#6366F1" },
  { href: "/financeiro/despesas", label: "Despesas", icon: Wallet, color: "#F43F5E" },
  { href: "/financeiro/receitas", label: "Receitas", icon: TrendingUp, color: "#10B981" },
  { href: "/financeiro/metas", label: "Metas", icon: Target, color: "#F59E0B" },
  { href: "/pessoas", label: "Pessoas", icon: Users, color: "#8B5CF6" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  const token = useSessionToken();
  const hoje = todayISO();

  const pessoas = useQuery(api.pessoas.ranking, token ? { sessionToken: token } : "skip");
  const resumoFinanceiro = useQuery(api.financeiro.dashboardFinanceiro.resumoMes, token ? { sessionToken: token, mes: currentMonth() } : "skip");
  const taxas = useQuery(api.tarefas.dashboardTarefas.taxaConclusao, token ? { sessionToken: token } : "skip");
  const lancamentosHoje = useQuery(api.tarefas.lancamentos.listByDate, token ? { sessionToken: token, data: hoje } : "skip");

  const totalHoje = lancamentosHoje?.length ?? 0;
  const feitasHoje = lancamentosHoje?.filter((l) => l.completada).length ?? 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.header variants={item}>
        <h1 className="font-display text-3xl font-extrabold">Olá, família 👋</h1>
        <p className="text-slate-500">Bem-vindos ao Minha Casa Minha Vida</p>
      </motion.header>

      {/* Resumos lado a lado */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        {/* Resumo financeiro */}
        <div className="rounded-2xl bg-white border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Resumo Financeiro</h2>
            <Link href="/financeiro" className="text-xs text-primary hover:underline">Ver mais →</Link>
          </div>
          {resumoFinanceiro === undefined ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Saldo do mês</span>
                <span className={`font-mono font-bold ${resumoFinanceiro.saldo >= 0 ? "text-success" : "text-danger"}`}>
                  {formatBRL(resumoFinanceiro.saldo)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">A receber</span>
                <span className="font-mono font-semibold text-success">{formatBRL(resumoFinanceiro.aReceber)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">A pagar</span>
                <span className="font-mono font-semibold text-danger">{formatBRL(resumoFinanceiro.aPagar)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Resumo tarefas */}
        <div className="rounded-2xl bg-white border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Tarefas Hoje</h2>
            <Link href="/tarefas/hoje" className="text-xs text-primary hover:underline">Abrir →</Link>
          </div>
          {lancamentosHoje === undefined ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-gamer font-bold ${feitasHoje === totalHoje && totalHoje > 0 ? "text-success" : "text-primary"}`}>
                  {feitasHoje}/{totalHoje}
                </div>
                <div>
                  <div className="text-sm font-medium">{feitasHoje === totalHoje && totalHoje > 0 ? "🎉 Tudo feito!" : "tarefas concluídas"}</div>
                  {taxas?.taxaHoje !== null && <div className="text-xs text-slate-500">{taxas?.taxaHoje}% de conclusão hoje</div>}
                </div>
              </div>
              {totalHoje > 0 && (
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${feitasHoje === totalHoje ? "bg-success" : "bg-primary"}`}
                    initial={{ width: 0 }}
                    animate={{ width: totalHoje > 0 ? `${(feitasHoje / totalHoje) * 100}%` : "0%" }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Pessoas da casa */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Pessoas da casa</h2>
          <Link href="/pessoas" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>
        {pessoas === undefined ? (
          <div className="flex gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="w-20 h-24 rounded-xl" />)}</div>
        ) : pessoas.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-dashed p-6 text-center text-slate-400">
            <Link href="/pessoas" className="text-primary font-medium hover:underline">Cadastre a primeira pessoa →</Link>
          </div>
        ) : (
          <div className="flex gap-4 flex-wrap">
            {pessoas.map((p) => {
              const titulo = getTituloByNivel(p.nivelAtual);
              return (
                <motion.div
                  key={p._id}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  whileHover={{ y: -4 }}
                >
                  <PersonAvatar pessoa={p} size={52} />
                  <span className="text-xs font-medium text-slate-700">{p.apelido ?? p.nome.split(" ")[0]}</span>
                  <span className="text-[10px] font-medium" style={{ color: titulo.corClasse }}>Nv {p.nivelAtual}</span>
                  {p.streakDias >= 2 && (
                    <span className="text-[10px] text-orange-500 inline-flex items-center gap-0.5">
                      <Flame size={9} />{p.streakDias}d
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Atalhos */}
      <motion.section variants={item}>
        <h2 className="font-display font-bold text-lg mb-3">Atalhos</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {atalhos.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl bg-white border p-4 flex flex-col items-start gap-2 hover:shadow-md transition-shadow group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-110"
                style={{ background: color }}
              >
                <Icon size={20} />
              </div>
              <span className="font-medium text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
