"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Gauge, ArrowRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";

interface Props {
  mes: string;
  limite?: number; // qtas categorias mostrar (default 6)
}

type Status = "ok" | "atencao" | "estourada" | "sem_limite";

function barraTone(status: Status, percentual: number): { bg: string; bar: string; label: string } {
  if (status === "estourada") {
    return { bg: "bg-coral-100", bar: "bg-coral-600", label: "text-coral-700" };
  }
  if (status === "atencao") {
    return { bg: "bg-coral-50", bar: "bg-coral-400", label: "text-coral-600" };
  }
  // ok
  return { bg: "bg-cream-200", bar: "bg-ink-800", label: "text-ink-700" };
}

export function OrcamentoCategoriasCard({ mes, limite = 6 }: Props) {
  const token = useSessionToken();
  const itens = useQuery(
    api.financeiro.orcamento.listMes,
    token ? { sessionToken: token, mes } : "skip"
  );

  // Filtra só com limite definido e ordena por percentual desc
  const lista = useMemo(() => {
    if (!itens) return [];
    return itens
      .filter((i) => i.limite > 0)
      .sort((a, b) => b.percentual - a.percentual)
      .slice(0, limite);
  }, [itens, limite]);

  if (itens === undefined) {
    return <Skeleton className="h-72 rounded-2xl" />;
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-base text-ink-900 flex items-center gap-2">
          <Gauge size={16} className="text-coral-500" />
          Orçamento por categoria
        </h2>
        <Link
          href="/financeiro/orcamento"
          className="text-xs text-coral-600 hover:underline font-medium"
        >
          Realocar →
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-8 text-sm text-ink-400">
          <p>Nenhum limite definido neste mês.</p>
          <Link href="/financeiro/orcamento" className="text-coral-600 hover:underline">
            Definir o primeiro limite →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((it) => {
            const tone = barraTone(it.status as Status, it.percentual);
            const Icon = iconeDaCategoria(it.icone);
            const widthBar = Math.min(100, it.percentual);
            const href = `/financeiro/lancamentos?categoriaId=${it.categoriaId}&tipo=despesa&mes=${mes}`;
            return (
              <li key={it.categoriaId}>
                <Link
                  href={href}
                  className="block space-y-1.5 -mx-2 px-2 py-1.5 rounded-lg hover:bg-cream-50 transition-colors group"
                  title={`Ver lançamentos de ${it.nome}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: `${it.cor}20`, color: it.cor }}
                      >
                        <Icon size={12} />
                      </div>
                      <span className="text-sm text-ink-800 truncate group-hover:text-coral-700">{it.nome}</span>
                      <ArrowRight size={10} className="text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <span className="font-mono text-ink-500 tabular-nums">
                        {formatBRL(it.realizado)} / {formatBRL(it.limite)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] tabular-nums ${tone.label} ${tone.bg}`}
                      >
                        {it.percentual}%
                      </span>
                    </div>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${tone.bg}`}>
                    <div
                      className={`h-full rounded-full transition-all ${tone.bar}`}
                      style={{ width: `${widthBar}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
