"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  Target,
  Sparkles,
  ListTree,
  Gauge,
  Coffee,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { ProgressoMesCard } from "@/components/financeiro/ProgressoMesCard";
import { FixasVsVariaveisChart } from "@/components/financeiro/FixasVsVariaveisChart";
import { CartaoVsAVistaChart } from "@/components/financeiro/CartaoVsAVistaChart";
import { CategoriasEstouradas } from "@/components/financeiro/CategoriasEstouradas";
import { SaldoEfetivadoProjetadoCard } from "@/components/financeiro/SaldoEfetivadoProjetadoCard";
import { IndicadoresSaudeCard } from "@/components/financeiro/IndicadoresSaudeCard";
import { PagadorCasalChart } from "@/components/financeiro/PagadorCasalChart";
import { DivisaoProporcionalCard } from "@/components/financeiro/DivisaoProporcionalCard";
import { DicaDoDia } from "@/components/educacao/DicaDoDia";
import { AcoesRapidas } from "@/components/financeiro/AcoesRapidas";
import { AtalhosSecundarios } from "@/components/financeiro/AtalhosSecundarios";
import { FaixaResumoMes } from "@/components/financeiro/FaixaResumoMes";
import { PainelDiario } from "@/components/financeiro/PainelDiario";
import { SecaoColapsavel } from "@/components/financeiro/SecaoColapsavel";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

interface AtalhoPrimario {
  href: string;
  label: string;
  descricao: string;
  Icon: typeof Sparkles;
  gradiente: string;
}

const ATALHOS_PRIMARIOS: AtalhoPrimario[] = [
  {
    href: "/financeiro/agente",
    label: "Agente IA",
    descricao: "Converse e lance",
    Icon: Sparkles,
    gradiente: "from-violet-500 to-fuchsia-600",
  },
  {
    href: "/financeiro/lancamentos",
    label: "Lançamentos",
    descricao: "Despesas e receitas",
    Icon: ListTree,
    gradiente: "from-rose-500 via-amber-500 to-emerald-500",
  },
  {
    href: "/financeiro/money-date",
    label: "Money Date",
    descricao: "Pauta do casal",
    Icon: Coffee,
    gradiente: "from-amber-500 to-orange-600",
  },
  {
    href: "/financeiro/orcamento",
    label: "Orçamento",
    descricao: "Limites e semáforo",
    Icon: Gauge,
    gradiente: "from-sky-500 to-cyan-600",
  },
  {
    href: "/financeiro/metas",
    label: "Metas",
    descricao: "Poupança",
    Icon: Target,
    gradiente: "from-emerald-500 to-teal-600",
  },
];

export default function FinanceiroPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());

  const resumo = useQuery(
    api.financeiro.dashboardFinanceiro.resumoMes,
    token ? { sessionToken: token, mes } : "skip"
  );
  const progresso = useQuery(
    api.financeiro.dashboardFinanceiro.progressoMes,
    token ? { sessionToken: token, mes } : "skip"
  );
  const fixasVar = useQuery(
    api.financeiro.dashboardFinanceiro.fixasVsVariaveis,
    token ? { sessionToken: token, mes } : "skip"
  );
  const cartaoVista = useQuery(
    api.financeiro.dashboardFinanceiro.cartaoVsAVista,
    token ? { sessionToken: token, mes } : "skip"
  );
  const estouradas = useQuery(
    api.financeiro.dashboardFinanceiro.categoriasEstouradas,
    token ? { sessionToken: token, mes } : "skip"
  );
  const saldoEfetivado = useQuery(
    api.financeiro.dashboardFinanceiro.saldoEfetivado,
    token ? { sessionToken: token } : "skip"
  );
  const saldoProjetado = useQuery(
    api.financeiro.dashboardFinanceiro.saldoProjetado,
    token ? { sessionToken: token } : "skip"
  );
  const indicadoresSaude = useQuery(
    api.financeiro.dashboardFinanceiro.indicadoresSaude,
    token ? { sessionToken: token, mes } : "skip"
  );
  const pagadorCasal = useQuery(
    api.financeiro.dashboardFinanceiro.despesasPorPagadorCasal,
    token ? { sessionToken: token, mes } : "skip"
  );
  const divisaoProporcional = useQuery(
    api.financeiro.dashboardFinanceiro.divisaoProporcionalSugerida,
    token ? { sessionToken: token, mes } : "skip"
  );
  const categorias = useQuery(
    api.financeiro.categorias.list,
    token ? { sessionToken: token } : "skip"
  );
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  // Auto-seed categorias padrão na primeira vez
  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias]);

  const temCategoriasEstouradas = !!estouradas && estouradas.length > 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 1. Header */}
      <motion.div
        variants={item}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-3xl font-extrabold">Finanças</h1>
          <p className="text-slate-500">Visão geral da família</p>
        </div>
        <MonthSelector mes={mes} onChange={setMes} />
      </motion.div>

      {/* 2. Hero: saldo + faixa numerica inline */}
      <motion.div variants={item} className="space-y-2">
        <SaldoEfetivadoProjetadoCard
          efetivado={saldoEfetivado}
          projetado={saldoProjetado}
        />
        <FaixaResumoMes data={resumo ?? undefined} />
      </motion.div>

      {/* 3. Acoes rapidas */}
      <motion.div variants={item}>
        <AcoesRapidas />
      </motion.div>

      {/* 4. Atalhos primarios (5 com gradiente) */}
      <motion.div
        variants={item}
        className="grid gap-3 grid-cols-3 lg:grid-cols-5"
      >
        {ATALHOS_PRIMARIOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`rounded-xl bg-gradient-to-br ${a.gradiente} text-white p-4 hover:shadow-lg transition-shadow group`}
          >
            <a.Icon
              size={22}
              className="group-hover:scale-110 transition-transform"
            />
            <div className="font-display font-bold text-base mt-2">{a.label}</div>
            <div className="text-xs text-white/85">{a.descricao}</div>
          </Link>
        ))}
      </motion.div>

      {/* 5. Atalhos secundarios (colapsavel) */}
      <motion.div variants={item}>
        <AtalhosSecundarios />
      </motion.div>

      {/* 6. Categorias estouradas (condicional) */}
      {temCategoriasEstouradas && (
        <motion.div variants={item}>
          <CategoriasEstouradas data={estouradas} />
        </motion.div>
      )}

      {/* 7. Painel Diario + Progresso do mes */}
      <motion.div
        variants={item}
        className="grid gap-3 grid-cols-1 md:grid-cols-2"
      >
        <PainelDiario />
        {progresso ? (
          <ProgressoMesCard data={progresso} />
        ) : (
          <Skeleton className="h-32 rounded-2xl" />
        )}
      </motion.div>

      {/* 8. Indicadores de saude */}
      <motion.div variants={item}>
        <IndicadoresSaudeCard data={indicadoresSaude} />
      </motion.div>

      {/* 9. Secao Casal — colapsavel em mobile */}
      <motion.div variants={item}>
        <SecaoColapsavel
          titulo="Ver divisão do casal"
          mobileOnly
          defaultAberto={false}
        >
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {pagadorCasal !== undefined ? (
              <PagadorCasalChart data={pagadorCasal} />
            ) : (
              <Skeleton className="h-64 rounded-2xl" />
            )}
            {divisaoProporcional !== undefined ? (
              <DivisaoProporcionalCard data={divisaoProporcional} />
            ) : (
              <Skeleton className="h-64 rounded-2xl" />
            )}
          </div>
        </SecaoColapsavel>
      </motion.div>

      {/* 10. Secao Analises (colapsada por padrao) */}
      <motion.div variants={item}>
        <SecaoColapsavel
          titulo="Ver análises detalhadas"
          defaultAberto={false}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {fixasVar ? (
              <FixasVsVariaveisChart data={fixasVar} />
            ) : (
              <Skeleton className="h-32 rounded-2xl" />
            )}
            {cartaoVista ? (
              <CartaoVsAVistaChart data={cartaoVista} />
            ) : (
              <Skeleton className="h-32 rounded-2xl" />
            )}
          </div>
        </SecaoColapsavel>
      </motion.div>

      {/* 11. Dica do dia — rodape compacto */}
      <motion.div variants={item}>
        <DicaDoDia compact />
      </motion.div>
    </motion.div>
  );
}
