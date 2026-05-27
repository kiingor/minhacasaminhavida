"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Target, Shield, Home as HomeIcon, GraduationCap, Plane, Sparkles, Wallet } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";

interface Props {
  limite?: number; // qtas metas mostrar (default 4)
}

function iconeDaMeta(nome: string, tipoEspecial?: string): typeof Shield {
  if (tipoEspecial === "reserva_emergencia") return Shield;
  const n = nome.toLowerCase();
  if (n.includes("imóvel") || n.includes("imovel") || n.includes("casa") || n.includes("apto")) return HomeIcon;
  if (n.includes("educa") || n.includes("escola") || n.includes("universidade") || n.includes("filho")) return GraduationCap;
  if (n.includes("viagem") || n.includes("férias") || n.includes("ferias")) return Plane;
  if (n.includes("aposenta")) return Sparkles;
  return Wallet;
}

// Tom monocromático baseado no progresso (sem semáforo verde/amarelo/vermelho)
function tomDaMeta(percentual: number, mesesRestantes: number, semPrazo: boolean) {
  if (percentual >= 100) return { bar: "bg-ink-900", label: "text-ink-900" };
  if (!semPrazo && mesesRestantes > 0 && mesesRestantes < 6 && percentual < 50) {
    // Próximo do prazo e atrasado
    return { bar: "bg-coral-600", label: "text-coral-700" };
  }
  if (percentual >= 50) return { bar: "bg-ink-800", label: "text-ink-800" };
  if (percentual >= 25) return { bar: "bg-coral-400", label: "text-coral-600" };
  return { bar: "bg-coral-500", label: "text-coral-700" };
}

export function MetasFinanceirasCard({ limite = 4 }: Props) {
  const token = useSessionToken();
  const data = useQuery(
    api.financeiro.metas.comAporteSugerido,
    token ? { sessionToken: token } : "skip"
  );

  const metasOrdenadas = useMemo(() => {
    if (!data) return [];
    // Reserva sempre primeira; depois outras por percentual asc (mais atrasadas em cima)
    const arr = [];
    if (data.reserva) arr.push(data.reserva);
    arr.push(...[...data.outras].sort((a, b) => a.percentual - b.percentual));
    return arr.slice(0, limite);
  }, [data, limite]);

  if (data === undefined) {
    return <Skeleton className="h-72 rounded-2xl" />;
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-base text-ink-900 flex items-center gap-2">
          <Target size={16} className="text-coral-500" />
          Metas financeiras
        </h2>
        <Link
          href="/financeiro/metas"
          className="text-xs text-coral-600 hover:underline font-medium"
        >
          Simular →
        </Link>
      </div>

      {metasOrdenadas.length === 0 ? (
        <div className="text-center py-8 text-sm text-ink-400">
          <p>Nenhuma meta ativa.</p>
          <Link href="/financeiro/metas" className="text-coral-600 hover:underline">
            Criar primeira meta →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {metasOrdenadas.map((m) => {
            const Icon = iconeDaMeta(m.titulo, m.tipoEspecial);
            const widthBar = Math.min(100, Math.round(m.percentual));
            const tom = tomDaMeta(m.percentual, m.mesesRestantes, m.semPrazo);
            const ehReserva = m.tipoEspecial === "reserva_emergencia";
            return (
              <li key={m._id} className="flex items-center gap-3 p-3 rounded-2xl bg-cream-50/60 hover:bg-cream-100/80 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white border border-cream-200 flex items-center justify-center text-ink-700 shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm text-ink-900 truncate">{m.titulo}</span>
                    <span className={`text-sm font-mono font-bold tabular-nums ${tom.label}`}>
                      {Math.round(m.percentual)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-500 mt-0.5">
                    <span className="font-mono">
                      {formatBRL(m.valorAtual)} <span className="text-ink-400">de</span> {formatBRL(m.valorAlvo)}
                    </span>
                    {ehReserva && m.mesesCobertura && (
                      <span className="text-ink-400">· {m.mesesCobertura} meses de custo</span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-cream-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${tom.bar}`}
                      style={{ width: `${widthBar}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  {!m.concluida && !m.semPrazo && m.mesesRestantes > 0 && (
                    <div className="text-[10px] text-ink-400">~{m.mesesRestantes} meses</div>
                  )}
                  {m.semPrazo && (
                    <div className="text-[10px] text-ink-400">sem prazo</div>
                  )}
                  {m.concluida && (
                    <div className="text-[10px] text-ink-700 font-medium">Concluída</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
