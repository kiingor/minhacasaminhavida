"use client";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CalendarCheck,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { formatBRL } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { iconeDaCategoria } from "@/lib/categoriaIcons";

type Tipo = "despesa" | "receita" | "transferencia";

interface Lancamento {
  tipo: Tipo;
  id: string;
  descricao: string;
  valor: number;
  categoriaId?: string;
  contaId?: string;
  criadoEm: string;
}

interface Props {
  data: Lancamento[] | undefined;
}

export function LancamentosDoDiaCard({ data }: Props) {
  const token = useSessionToken();
  const categorias = useQuery(
    api.financeiro.categorias.list,
    token ? { sessionToken: token } : "skip"
  );

  if (data === undefined) {
    return <Skeleton className="h-28 rounded-2xl" />;
  }

  const total = data.length;
  const visiveis = data.slice(0, 5);

  const totalEntradas = data
    .filter((l) => l.tipo === "receita")
    .reduce((s, l) => s + l.valor, 0);
  const totalSaidas = data
    .filter((l) => l.tipo === "despesa")
    .reduce((s, l) => s + l.valor, 0);

  const catMap = new Map(
    (categorias ?? []).map((c) => [c._id as string, c])
  );

  return (
    <section
      aria-labelledby="lanc-hoje"
      className="rounded-2xl bg-white border p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <CalendarCheck size={14} className="text-primary" aria-hidden />
          <h2 id="lanc-hoje">Hoje</h2>
        </div>
        {total > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {total} {total === 1 ? "lançamento" : "lançamentos"}
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-4 gap-1">
          <Sun size={20} className="text-amber-400" aria-hidden />
          <p className="text-sm text-slate-500">
            Nenhum lançamento efetivado hoje.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {visiveis.map((l, i) => {
              const cat = l.categoriaId ? catMap.get(l.categoriaId) : undefined;
              return (
                <motion.li
                  key={l.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="py-2 flex items-center gap-2.5"
                >
                  <IconeTipo tipo={l.tipo} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {l.descricao}
                    </div>
                    {cat && (
                      <CategoriaBadge nome={cat.nome} cor={cat.cor} icone={cat.icone} />
                    )}
                  </div>
                  <span
                    className={`font-mono text-sm font-semibold shrink-0 ${
                      l.tipo === "receita"
                        ? "text-emerald-600"
                        : l.tipo === "despesa"
                        ? "text-rose-600"
                        : "text-violet-600"
                    }`}
                  >
                    {formatBRL(l.valor)}
                  </span>
                </motion.li>
              );
            })}
          </ul>
          {total > 5 && (
            <div className="mt-2 text-[11px] text-slate-400 text-center">
              + {total - 5} {total - 5 === 1 ? "outro" : "outros"}
            </div>
          )}
          <div className="mt-2 text-center">
            <Link
              href="/financeiro/lancamentos"
              className="text-xs text-primary hover:underline"
            >
              Ver todos do dia →
            </Link>
          </div>
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Entradas{" "}
              <span className="font-mono font-semibold text-emerald-600">
                {formatBRL(totalEntradas)}
              </span>
            </span>
            <span className="text-slate-500">
              Saídas{" "}
              <span className="font-mono font-semibold text-rose-600">
                {formatBRL(totalSaidas)}
              </span>
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function IconeTipo({ tipo }: { tipo: Tipo }) {
  if (tipo === "receita") {
    return (
      <ArrowUpCircle
        size={18}
        className="text-emerald-500 shrink-0"
        aria-label="Receita"
      />
    );
  }
  if (tipo === "despesa") {
    return (
      <ArrowDownCircle
        size={18}
        className="text-rose-500 shrink-0"
        aria-label="Despesa"
      />
    );
  }
  return (
    <ArrowLeftRight
      size={18}
      className="text-violet-500 shrink-0"
      aria-label="Transferência"
    />
  );
}

function CategoriaBadge({
  nome,
  cor,
  icone,
}: {
  nome: string;
  cor: string;
  icone?: string;
}) {
  const Icon = iconeDaCategoria(icone);
  return (
    <span
      className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ background: `${cor}1a`, color: cor }}
    >
      <Icon size={9} />
      {nome}
    </span>
  );
}
