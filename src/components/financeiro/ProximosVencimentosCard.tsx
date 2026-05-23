"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { formatBRL, todayISO } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";
import type { Id } from "../../../convex/_generated/dataModel";

type Tipo = "despesa" | "receita";

interface Item {
  tipo: Tipo;
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  contaId?: string;
}

interface Props {
  data: Item[] | undefined;
}

export function ProximosVencimentosCard({ data }: Props) {
  const token = useSessionToken();
  const togglePago = useMutation(api.financeiro.despesas.togglePago);
  const toggleRecebido = useMutation(api.financeiro.receitas.toggleRecebido);
  const [processando, setProcessando] = useState<string | null>(null);

  if (data === undefined) {
    return <Skeleton className="h-28 rounded-2xl" />;
  }

  async function handleConfirmar(item: Item) {
    if (!token || processando) return;
    setProcessando(item.id);
    try {
      // Card opera sempre no mes corrente da data de vencimento projetada
      // (a query proximosVencimentos7Dias projeta para mes corrente ou proximo)
      const mesItem = item.dataVencimento.slice(0, 7) || currentMonth();
      if (item.tipo === "despesa") {
        await togglePago({
          sessionToken: token,
          id: item.id as Id<"despesas">,
          mes: mesItem,
        });
      } else {
        await toggleRecebido({
          sessionToken: token,
          id: item.id as Id<"receitas">,
          mes: mesItem,
        });
      }
    } finally {
      setProcessando(null);
    }
  }

  return (
    <section
      aria-labelledby="proximos-7-dias"
      className="rounded-2xl bg-white border p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <Clock size={14} className="text-amber-500" aria-hidden />
          <h2 id="proximos-7-dias">Próximos 7 dias</h2>
        </div>
        {data.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
            {data.length}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-4 gap-1">
          <CheckCircle2 size={20} className="text-emerald-500" aria-hidden />
          <p className="text-sm text-slate-500">
            Tudo em dia! Sem vencimentos próximos.
          </p>
        </div>
      ) : (
        <ul
          className={`divide-y divide-slate-100 ${
            data.length > 7 ? "max-h-80 overflow-y-auto" : ""
          }`}
        >
          <AnimatePresence initial={false}>
            {data.map((item) => (
              <motion.li
                key={item.id}
                layout
                layoutId={`venc-${item.id}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="py-2 flex items-center gap-2 overflow-hidden"
              >
                <BadgeUrgencia data={item.dataVencimento} />
                {item.tipo === "receita" ? (
                  <ArrowUpCircle
                    size={16}
                    className="text-emerald-500 shrink-0"
                    aria-label="Receita"
                  />
                ) : (
                  <ArrowDownCircle
                    size={16}
                    className="text-rose-500 shrink-0"
                    aria-label="Despesa"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.descricao}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {formatBRL(item.valor)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleConfirmar(item)}
                  disabled={processando === item.id}
                  aria-label={
                    item.tipo === "despesa"
                      ? `Marcar ${item.descricao} como paga`
                      : `Marcar ${item.descricao} como recebida`
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 h-7 rounded-md text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {processando === item.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {item.tipo === "despesa" ? "Pagar" : "Receber"}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function BadgeUrgencia({ data }: { data: string }) {
  const hoje = todayISO();
  const amanha = addDaysISO(hoje, 1);
  let label: string;
  let className: string;
  if (data === hoje) {
    label = "Hoje";
    className = "bg-rose-100 text-rose-700";
  } else if (data === amanha) {
    label = "Amanhã";
    className = "bg-amber-100 text-amber-700";
  } else {
    const [, mm, dd] = data.split("-");
    label = `${dd}/${mm}`;
    className = "bg-slate-100 text-slate-600";
  }
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 w-12 text-center ${className}`}
    >
      {label}
    </span>
  );
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
