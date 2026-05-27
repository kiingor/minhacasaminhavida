"use client";
import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  Target, Sparkles, ListTree, Gauge, Coffee, ArrowRight, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { ProgressoMesCard } from "@/components/financeiro/ProgressoMesCard";
import { FixasVsVariaveisChart } from "@/components/financeiro/FixasVsVariaveisChart";
import { CartaoVsAVistaChart } from "@/components/financeiro/CartaoVsAVistaChart";
import { AlertasInsightsCard } from "@/components/financeiro/AlertasInsightsCard";
import { ScoreSaudeCard } from "@/components/financeiro/ScoreSaudeCard";
import { KpiStrip } from "@/components/financeiro/KpiStrip";
import { DistribuicaoDespesasCard } from "@/components/financeiro/DistribuicaoDespesasCard";
import { FluxoCaixaCard } from "@/components/financeiro/FluxoCaixaCard";
import { OrcamentoCategoriasCard } from "@/components/financeiro/OrcamentoCategoriasCard";
import { MetasFinanceirasCard } from "@/components/financeiro/MetasFinanceirasCard";
import { PagadorCasalChart } from "@/components/financeiro/PagadorCasalChart";
import { DivisaoProporcionalCard } from "@/components/financeiro/DivisaoProporcionalCard";
import { DicaDoDia } from "@/components/educacao/DicaDoDia";
import { AcoesRapidas } from "@/components/financeiro/AcoesRapidas";
import { AtalhosSecundarios } from "@/components/financeiro/AtalhosSecundarios";
import { PainelDiario } from "@/components/financeiro/PainelDiario";
import { SecaoColapsavel } from "@/components/financeiro/SecaoColapsavel";
import { Skeleton } from "@/components/ui/skeleton";
import { monthLabelLong } from "@/lib/monthUtils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

interface AtalhoPrimario {
  href: string;
  label: string;
  descricao: string;
  Icon: LucideIcon;
  tone: "coral" | "dark" | "white";
}

const ATALHOS_PRIMARIOS: AtalhoPrimario[] = [
  { href: "/financeiro/agente",     label: "Agente IA",   descricao: "Converse e lance",   Icon: Sparkles, tone: "coral" },
  { href: "/financeiro/lancamentos", label: "Lançamentos", descricao: "Despesas e receitas", Icon: ListTree, tone: "dark" },
  { href: "/financeiro/money-date", label: "Money Date",  descricao: "Pauta do casal",     Icon: Coffee, tone: "white" },
  { href: "/financeiro/orcamento",  label: "Orçamento",   descricao: "Limites e semáforo", Icon: Gauge, tone: "white" },
  { href: "/financeiro/metas",      label: "Metas",       descricao: "Poupança",           Icon: Target, tone: "white" },
];

function AtalhoCard({ href, label, descricao, Icon, tone }: AtalhoPrimario) {
  const toneClass =
    tone === "coral" ? "bg-coral-500 text-white shadow-pop"
    : tone === "dark" ? "bg-ink-900 text-white"
    : "bg-white text-ink-900 shadow-soft";
  return (
    <Link
      href={href}
      className={`group rounded-3xl p-5 flex flex-col justify-between min-h-[120px] transition-all hover:-translate-y-1 hover:shadow-card ${toneClass}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tone === "white" ? "bg-cream-100 text-ink-700" : "bg-white/15"}`}>
        <Icon size={18} />
      </div>
      <div className="mt-3">
        <div className="font-display font-bold text-base flex items-center gap-1.5">
          {label}
          <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
        <div className={`text-xs mt-0.5 ${tone === "white" ? "text-ink-400" : "text-white/65"}`}>{descricao}</div>
      </div>
    </Link>
  );
}

interface Props {
  /** Familia alvo (se nao informado, usa a familia do user logado). */
  familyIdAlvo?: string;
  /** Modo leitura: esconde acoes de write (criar/editar lancamento, atalhos primarios, atalhos secundarios). */
  readonly?: boolean;
  /** Mes selecionado (formato YYYY-MM). */
  mes: string;
  /** Callback ao trocar mes. */
  onMesChange: (mes: string) => void;
  /** Esconde o header (titulo + MonthSelector) — util quando o pai ja renderiza header proprio. */
  hideHeader?: boolean;
  /** Esconde o header titulo mas mantem o MonthSelector como bloco proprio. */
  showMonthSelectorStandalone?: boolean;
}

export function FinanceiroDashboard({
  familyIdAlvo, readonly = false, mes, onMesChange,
  hideHeader = false, showMonthSelectorStandalone = false,
}: Props) {
  const token = useSessionToken();
  const baseArgs = token ? { sessionToken: token, familyIdAlvo } : "skip";
  const baseArgsMes = token ? { sessionToken: token, mes, familyIdAlvo } : "skip";

  const resumo = useQuery(api.financeiro.dashboardFinanceiro.resumoMes, baseArgsMes);
  const progresso = useQuery(api.financeiro.dashboardFinanceiro.progressoMes, baseArgsMes);
  const fixasVar = useQuery(api.financeiro.dashboardFinanceiro.fixasVsVariaveis, baseArgsMes);
  const cartaoVista = useQuery(api.financeiro.dashboardFinanceiro.cartaoVsAVista, baseArgsMes);
  const estouradas = useQuery(api.financeiro.dashboardFinanceiro.categoriasEstouradas, baseArgsMes);
  const saldoEfetivado = useQuery(api.financeiro.dashboardFinanceiro.saldoEfetivado, baseArgs);
  // Projeção respeita o mês selecionado na UI (mostra "como vai ficar no fim de X")
  const saldoProjetado = useQuery(api.financeiro.dashboardFinanceiro.saldoProjetado, baseArgsMes);
  const indicadoresSaude = useQuery(api.financeiro.dashboardFinanceiro.indicadoresSaude, baseArgsMes);
  const distribuicao = useQuery(api.financeiro.dashboardFinanceiro.despesasPorCategoria, baseArgsMes);
  const pagadorCasal = useQuery(api.financeiro.dashboardFinanceiro.despesasPorPagadorCasal, baseArgsMes);
  const divisaoProporcional = useQuery(api.financeiro.dashboardFinanceiro.divisaoProporcionalSugerida, baseArgsMes);
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token } : "skip");
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  // Seed só se for o próprio user e a familia tiver 0 categorias.
  useEffect(() => {
    if (!readonly && !familyIdAlvo && token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias, readonly, familyIdAlvo]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* 1. Header (opcional) */}
      {!hideHeader && (
        <motion.section variants={item} className="grid gap-4 md:grid-cols-[1fr_auto] items-start">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Dashboard</span>
              <span className="h-px w-8 bg-cream-300" />
              <span className="text-[10px] text-ink-400 font-medium capitalize">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long" })}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
              Finanças
            </h1>
            <p className="text-ink-500 mt-1">Visão geral da família</p>
          </div>
          <MonthSelector mes={mes} onChange={onMesChange} />
        </motion.section>
      )}

      {/* MonthSelector standalone quando header escondido mas ainda quero mostrar */}
      {hideHeader && showMonthSelectorStandalone && (
        <motion.section variants={item} className="flex justify-end">
          <MonthSelector mes={mes} onChange={onMesChange} />
        </motion.section>
      )}

      {/* 2. KPI Strip */}
      <motion.section variants={item}>
        <KpiStrip
          saldoEfetivado={saldoEfetivado}
          saldoProjetado={saldoProjetado}
          indicadores={indicadoresSaude}
        />
      </motion.section>

      {/* 3. Ações rápidas — só pra dono da família (write) */}
      {!readonly && (
        <motion.section variants={item}>
          <AcoesRapidas />
        </motion.section>
      )}

      {/* 4. Atalhos primários — apontam pra rotas do app, só fazem sentido pro dono */}
      {!readonly && (
        <motion.section variants={item} className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {ATALHOS_PRIMARIOS.map((a) => <AtalhoCard key={a.href} {...a} />)}
        </motion.section>
      )}

      {/* 5. Atalhos secundários — só pra dono */}
      {!readonly && (
        <motion.section variants={item}>
          <AtalhosSecundarios />
        </motion.section>
      )}

      {/* 6. Alertas e Insights + Score */}
      <motion.section variants={item} className="grid gap-4 md:grid-cols-[1fr_360px]">
        <AlertasInsightsCard estouradas={estouradas} indicadores={indicadoresSaude} />
        <ScoreSaudeCard indicadores={indicadoresSaude} progresso={progresso} />
      </motion.section>

      {/* 7. Painel + Progresso */}
      <motion.section variants={item} className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <PainelDiario familyIdAlvo={familyIdAlvo} readonly={readonly} />
        {progresso ? <ProgressoMesCard data={progresso} /> : <Skeleton className="h-36 rounded-3xl" />}
      </motion.section>

      {/* 8. Distribuição das despesas */}
      <motion.section variants={item}>
        <DistribuicaoDespesasCard
          data={distribuicao}
          estouradas={estouradas?.map((e) => ({ categoriaId: e.categoriaId, nome: e.nome, percentual: e.percentual }))}
          resumo={resumo ? { totalReceitas: resumo.totalReceitas } : undefined}
          mesLabel={monthLabelLong(mes)}
        />
      </motion.section>

      {/* 8.1 Fluxo de caixa */}
      <motion.section variants={item}>
        <FluxoCaixaCard mes={mes} meses={6} />
      </motion.section>

      {/* 8.2 Orçamento por categoria + Metas */}
      <motion.section variants={item} className="grid gap-4 md:grid-cols-2">
        <OrcamentoCategoriasCard mes={mes} limite={6} />
        <MetasFinanceirasCard limite={4} />
      </motion.section>

      {/* 9. Casal */}
      <motion.section variants={item}>
        <SecaoColapsavel titulo="Ver divisão do casal" mobileOnly defaultAberto={false}>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {pagadorCasal !== undefined ? <PagadorCasalChart data={pagadorCasal} /> : <Skeleton className="h-64 rounded-3xl" />}
            {divisaoProporcional !== undefined ? <DivisaoProporcionalCard data={divisaoProporcional} /> : <Skeleton className="h-64 rounded-3xl" />}
          </div>
        </SecaoColapsavel>
      </motion.section>

      {/* 10. Análises */}
      <motion.section variants={item}>
        <SecaoColapsavel titulo="Ver análises detalhadas" defaultAberto={false}>
          <div className="grid gap-4 md:grid-cols-2">
            {fixasVar ? <FixasVsVariaveisChart data={fixasVar} /> : <Skeleton className="h-36 rounded-3xl" />}
            {cartaoVista ? <CartaoVsAVistaChart data={cartaoVista} /> : <Skeleton className="h-36 rounded-3xl" />}
          </div>
        </SecaoColapsavel>
      </motion.section>

      {/* 11. Dica do dia — só pra dono */}
      {!readonly && (
        <motion.section variants={item}>
          <DicaDoDia compact />
        </motion.section>
      )}
    </motion.div>
  );
}
