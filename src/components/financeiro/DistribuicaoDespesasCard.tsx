"use client";
import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Download, AlertCircle, TrendingUp, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Paleta monocromática warm — gradação coral → ink
const PALETTE = ["#FF6B47", "#F0512C", "#FFA88B", "#1A1A1A", "#5C5C5C", "#FFCBB7", "#8A8A8A", "#262626", "#C73E1F"];

interface CategoriaItem {
  categoriaId: string;
  label: string;
  valor: number;
  cor: string;
  icone?: string;
}

interface EstouradaItem {
  categoriaId: string;
  nome: string;
  percentual: number;
}

interface ResumoShape {
  totalReceitas: number;
}

interface Props {
  data?: CategoriaItem[];
  estouradas?: EstouradaItem[];
  resumo?: ResumoShape;
  mesLabel?: string;
  /** Mês YYYY-MM — usado pra gerar link para /financeiro/lancamentos filtrado */
  mes?: string;
}

export function DistribuicaoDespesasCard({ data, estouradas, resumo, mesLabel, mes }: Props) {
  const ordenado = useMemo(
    () => (data ?? []).slice().sort((a, b) => b.valor - a.valor),
    [data],
  );

  const total = useMemo(() => ordenado.reduce((s, c) => s + c.valor, 0), [ordenado]);
  const maxValor = ordenado[0]?.valor ?? 0;

  const estouroSet = useMemo(
    () => new Set((estouradas ?? []).map((e) => e.categoriaId)),
    [estouradas],
  );

  // Maior gasto
  const maiorGasto = ordenado[0];

  // Categoria crítica (mais estourada)
  const categoriaCritica = useMemo(() => {
    if (!estouradas || estouradas.length === 0) return null;
    return estouradas.reduce((max, e) => (e.percentual > max.percentual ? e : max));
  }, [estouradas]);

  // Despesa ÷ Receita
  const pctRenda =
    resumo && resumo.totalReceitas > 0 ? Math.round((total / resumo.totalReceitas) * 100) : null;
  const sobraLivre =
    resumo && resumo.totalReceitas > 0 ? resumo.totalReceitas - total : null;

  if (!data) {
    return <Skeleton className="h-[400px] rounded-3xl" />;
  }

  if (data.length === 0) {
    return (
      <Card>
        <Header mesLabel={mesLabel} />
        <div className="text-center py-12 text-sm text-ink-400">Sem despesas neste mês.</div>
      </Card>
    );
  }

  // Top 8 + "Outros" se houver mais
  const visiveis = ordenado.slice(0, 8);
  const restantes = ordenado.slice(8);
  const valorOutros = restantes.reduce((s, c) => s + c.valor, 0);
  const linhas: CategoriaItem[] = valorOutros > 0
    ? [...visiveis, { categoriaId: "__outros__", label: "Outros", valor: valorOutros, cor: "#B8AC99" }]
    : visiveis;

  // Cores do donut: mistura entre cor da categoria e a paleta monocromática
  const linhasComCor = linhas.map((c, i) => ({
    ...c,
    corPaleta: PALETTE[i % PALETTE.length],
  }));

  return (
    <Card>
      <Header mesLabel={mesLabel} />

      <div className="grid gap-6 md:grid-cols-[260px_1fr] mt-3 items-start">
        {/* Donut */}
        <div className="relative w-full h-[240px] mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={linhasComCor}
                dataKey="valor"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={108}
                innerRadius={76}
                paddingAngle={2}
                strokeWidth={0}
              >
                {linhasComCor.map((c, i) => <Cell key={c.categoriaId} fill={c.corPaleta} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <div className="font-mono font-bold text-lg sm:text-xl text-ink-900 tabular-nums leading-tight tracking-tight whitespace-nowrap">
              {formatBRL(total)}
            </div>
            <div className="text-[9px] uppercase tracking-[0.1em] text-ink-400 font-semibold mt-1 whitespace-nowrap">
              Total despesas
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div>
          <div className="grid grid-cols-[1fr_88px_48px] sm:grid-cols-[1fr_120px_90px_60px] gap-2 sm:gap-3 px-1 pb-2 border-b border-cream-200">
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">Categoria</span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">Distribuição</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold text-right">Valor</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold text-right">%</span>
          </div>

          <ul className="divide-y divide-cream-100">
            {linhasComCor.map((c, i) => {
              const Icon = iconeDaCategoria(c.icone);
              const pct = total > 0 ? (c.valor / total) * 100 : 0;
              const barPct = maxValor > 0 ? (c.valor / maxValor) * 100 : 0;
              const estourou = estouroSet.has(c.categoriaId);

              const href = `/financeiro/lancamentos?categoriaId=${c.categoriaId}&tipo=despesa${mes ? `&mes=${mes}` : ""}`;
              return (
                <motion.li
                  key={c.categoriaId}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={href}
                    className="grid grid-cols-[1fr_88px_48px] sm:grid-cols-[1fr_120px_90px_60px] gap-2 sm:gap-3 px-1 py-2 items-center rounded-lg hover:bg-cream-50 transition-colors"
                    title={`Ver lançamentos de ${c.label} em ${mesLabel ?? "este mês"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: c.corPaleta }}
                        aria-hidden
                      />
                      <Icon size={13} className="text-ink-500 shrink-0" />
                      <span className="text-[13px] font-medium text-ink-900 truncate">{c.label}</span>
                      {estourou && <Pill tone="dark" size="xs">estouro</Pill>}
                    </div>

                    <div className="hidden sm:block h-1.5 rounded-full bg-cream-200 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: c.corPaleta }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>

                    <span className="font-mono text-[13px] font-semibold text-ink-900 text-right tabular-nums">
                      {formatBRL(c.valor)}
                    </span>

                    <span className="text-[11px] font-semibold text-ink-500 text-right tabular-nums">
                      {pct.toFixed(1).replace(".", ",")}%
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-cream-200">
        <SummaryItem
          icon={Wallet}
          label="Maior gasto"
          value={maiorGasto?.label ?? "—"}
          sub={maiorGasto
            ? `${total > 0 ? ((maiorGasto.valor / total) * 100).toFixed(1).replace(".", ",") : "0"}% — ${formatBRL(maiorGasto.valor)}`
            : "Sem dados"
          }
        />
        <SummaryItem
          icon={AlertCircle}
          label="Categoria crítica"
          value={categoriaCritica ? categoriaCritica.nome : "Nenhuma"}
          sub={categoriaCritica
            ? `${categoriaCritica.percentual}% do orçamento previsto`
            : "Todas dentro do orçamento"
          }
          critical={!!categoriaCritica}
        />
        <SummaryItem
          icon={TrendingUp}
          label="Despesa / Receita"
          value={pctRenda !== null ? `${pctRenda}%` : "—"}
          sub={sobraLivre !== null
            ? `${sobraLivre >= 0 ? "Sobram" : "Faltam"} ${formatBRL(Math.abs(sobraLivre))}`
            : "Sem receita registrada"
          }
        />
      </div>
    </Card>
  );
}

function Header({ mesLabel }: { mesLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display font-bold text-lg text-ink-900">
        Distribuição das despesas
        {mesLabel && <span className="text-ink-400 font-normal text-sm ml-2 capitalize">— {mesLabel}</span>}
      </h2>
      <button
        type="button"
        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-coral-600 transition-colors"
        title="Exportar (em breve)"
        disabled
      >
        <Download size={13} /> Exportar
      </button>
    </div>
  );
}

function SummaryItem({
  icon: Icon, label, value, sub, critical,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub: string;
  critical?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
        critical ? "bg-coral-500 text-white" : "bg-cream-100 text-ink-700",
      )}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">{label}</div>
        <div className={cn(
          "font-display font-bold text-base mt-0.5 truncate",
          critical ? "text-coral-600" : "text-ink-900",
        )}>
          {value}
        </div>
        <div className="text-[11px] text-ink-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
