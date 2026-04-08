"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, AlertCircle, ArrowDownCircle, ArrowUpCircle, Target, Tag, CreditCard, BarChart3 } from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { SummaryCard } from "@/components/financeiro/SummaryCard";
import { CategoryPieChart } from "@/components/financeiro/CategoryPieChart";
import { HistoryChart } from "@/components/financeiro/HistoryChart";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";
import { formatBRL, formatDate } from "@/lib/formatters";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function FinanceiroPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());

  const resumo = useQuery(api.financeiro.dashboardFinanceiro.resumoMes, token ? { sessionToken: token, mes } : "skip");
  const porCategoria = useQuery(api.financeiro.dashboardFinanceiro.despesasPorCategoria, token ? { sessionToken: token, mes } : "skip");
  const historico = useQuery(api.financeiro.dashboardFinanceiro.historico6Meses, token ? { sessionToken: token, mesAtual: mes } : "skip");
  const proximas = useQuery(api.financeiro.dashboardFinanceiro.proximasContas, token ? { sessionToken: token } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token } : "skip");
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  // Auto-seed categorias padrão na primeira vez
  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Finanças</h1>
          <p className="text-slate-500">Visão geral da família</p>
        </div>
        <MonthSelector mes={mes} onChange={setMes} />
      </motion.div>

      {/* Atalhos */}
      <motion.div variants={item} className="grid gap-3 grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
        <Link href="/financeiro/despesas" className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 hover:shadow-lg transition-shadow group">
          <ArrowDownCircle size={22} className="group-hover:scale-110 transition-transform" />
          <div className="font-display font-bold text-base mt-2">Despesas</div>
          <div className="text-xs text-white/80">Lançar e controlar</div>
        </Link>
        <Link href="/financeiro/receitas" className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 hover:shadow-lg transition-shadow group">
          <ArrowUpCircle size={22} className="group-hover:scale-110 transition-transform" />
          <div className="font-display font-bold text-base mt-2">Receitas</div>
          <div className="text-xs text-white/80">Entradas do mês</div>
        </Link>
        <Link href="/financeiro/metas" className="rounded-xl bg-white border p-4 hover:shadow-md transition-shadow group">
          <Target size={22} className="text-primary group-hover:scale-110 transition-transform" />
          <div className="font-display font-bold text-base mt-2">Metas</div>
          <div className="text-xs text-slate-500">Poupança</div>
        </Link>
        <Link href="/financeiro/cartoes" className="rounded-xl bg-white border p-4 hover:shadow-md transition-shadow group">
          <CreditCard size={22} className="text-slate-600 group-hover:scale-110 group-hover:text-primary transition-all" />
          <div className="font-display font-bold text-base mt-2">Cartões</div>
          <div className="text-xs text-slate-500">Gerenciar</div>
        </Link>
        <Link href="/financeiro/relatorios" className="rounded-xl bg-white border p-4 hover:shadow-md transition-shadow group">
          <BarChart3 size={22} className="text-slate-600 group-hover:scale-110 group-hover:text-primary transition-all" />
          <div className="font-display font-bold text-base mt-2">Relatórios</div>
          <div className="text-xs text-slate-500">Por pessoa</div>
        </Link>
        <Link href="/financeiro/categorias" className="rounded-xl bg-white border p-4 hover:shadow-md transition-shadow group">
          <Tag size={22} className="text-slate-600 group-hover:scale-110 group-hover:text-primary transition-all" />
          <div className="font-display font-bold text-base mt-2">Categorias</div>
          <div className="text-xs text-slate-500">Organizar</div>
        </Link>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={item}>
        {resumo ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <SummaryCard label="Saldo" valor={resumo.saldo} icon={Wallet} color={resumo.saldo >= 0 ? "#10B981" : "#F43F5E"} />
            <SummaryCard label="A Receber" valor={resumo.aReceber} icon={TrendingUp} color="#10B981" />
            <SummaryCard label="A Pagar" valor={resumo.aPagar} icon={TrendingDown} color="#F43F5E" />
            <SummaryCard label="Economia" valor={resumo.economia} icon={PiggyBank} color="#6366F1" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        )}
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white border p-5 shadow-sm">
          <h2 className="font-display font-bold text-lg mb-3">Despesas por Categoria</h2>
          {porCategoria ? <CategoryPieChart data={porCategoria} /> : <Skeleton className="h-[280px]" />}
        </div>
        <div className="rounded-2xl bg-white border p-5 shadow-sm">
          <h2 className="font-display font-bold text-lg mb-3">Últimos 6 meses</h2>
          {historico ? <HistoryChart data={historico} /> : <Skeleton className="h-[280px]" />}
        </div>
      </motion.div>

      {/* Próximas contas */}
      <motion.div variants={item} className="rounded-2xl bg-white border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Próximas Contas</h2>
          <Link href="/financeiro/despesas" className="text-sm text-primary hover:underline">Ver todas →</Link>
        </div>
        {proximas === undefined ? (
          <Skeleton className="h-32" />
        ) : proximas.length === 0 ? (
          <div className="text-center text-slate-400 py-6 text-sm">Nenhuma conta pendente no mês 🎉</div>
        ) : (
          <ul className="divide-y">
            {proximas.map((d) => (
              <li key={d._id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle size={14} className="text-warning shrink-0" />
                  <span className="font-medium truncate">{d.descricao}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <span>{formatDate(d.dataVencimento)}</span>
                  <span className="font-mono font-semibold text-slate-800">{formatBRL(d.valor)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </motion.div>
  );
}
