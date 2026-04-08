"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Check, Trash2, CreditCard, ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { DespesaForm } from "@/components/financeiro/DespesaForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";
import { formatBRL, formatDate } from "@/lib/formatters";

export default function DespesasPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const despesas = useQuery(api.financeiro.despesas.listByMonth, token ? { sessionToken: token, mes } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "despesa" } : "skip");
  const togglePago = useMutation(api.financeiro.despesas.togglePago);
  const remove = useMutation(api.financeiro.despesas.remove);
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  // Auto-seed categorias na primeira vez
  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias]);

  const total = despesas?.reduce((s, d) => s + d.valor, 0) ?? 0;
  const catMap = new Map(categorias?.map((c) => [c._id, c]) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Despesas</h1>
          <p className="text-slate-500">Total: <span className="font-mono font-semibold text-danger">{formatBRL(total)}</span></p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <Link href="/financeiro/despesas/fatura-ia">
            <Button variant="outline" className="text-sm"><Sparkles size={16} className="text-primary" /> <span className="hidden sm:inline">Lançamento com IA</span><span className="sm:hidden">IA</span></Button>
          </Link>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova</Button>
        </div>
      </div>

      {categorias && categorias.length === 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm flex items-center justify-between">
          <span className="text-amber-800">Você ainda não tem categorias cadastradas.</span>
          <Button size="sm" variant="outline" onClick={() => token && seedCategorias({ sessionToken: token })}>Criar padrão</Button>
        </div>
      )}

      {despesas === undefined ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : despesas.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Nenhuma despesa neste mês.</div>
      ) : (
        <ul className="space-y-2">
          {despesas.map((d, idx) => {
            const cat = catMap.get(d.categoriaId);
            return (
              <motion.li
                key={d._id + (d._parcela ?? "")}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl bg-white border p-4 flex items-center gap-3 ${d.pago ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => token && togglePago({ sessionToken: token, id: d._id })}
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${d.pago ? "bg-success border-success text-white" : "border-slate-300 hover:border-success"}`}
                  aria-label={d.pago ? "Desmarcar" : "Marcar como pago"}
                >
                  {d.pago && <Check size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${d.pago ? "line-through" : ""}`}>{d.descricao}</span>
                    {d._parcela && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{d._parcela}/{d.totalParcelas}</span>}
                    {d.tipo === "fixa" && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Fixa</span>}
                    {d.cartao && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 inline-flex items-center gap-1"><CreditCard size={10} />{d.cartao}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {cat && <span style={{ color: cat.cor }}>{cat.nome}</span>}
                    {cat && " · "}
                    Venc: {formatDate(d.dataVencimento)}
                  </div>
                </div>

                <div className="font-mono font-semibold text-danger shrink-0">{formatBRL(d.valor)}</div>
                <button onClick={() => token && remove({ sessionToken: token, id: d._id })} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10" aria-label="Remover">
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && <DespesaForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
