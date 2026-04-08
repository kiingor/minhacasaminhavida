"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Check, Trash2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { ReceitaForm } from "@/components/financeiro/ReceitaForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth } from "@/lib/monthUtils";
import { formatBRL, formatDate } from "@/lib/formatters";

export default function ReceitasPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const receitas = useQuery(api.financeiro.receitas.listByMonth, token ? { sessionToken: token, mes } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "receita" } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const toggleRecebido = useMutation(api.financeiro.receitas.toggleRecebido);
  const remove = useMutation(api.financeiro.receitas.remove);
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  // Auto-seed categorias na primeira vez
  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias]);

  const total = receitas?.reduce((s, r) => s + r.valor, 0) ?? 0;
  const catMap = new Map(categorias?.map((c) => [c._id, c]) ?? []);
  const pessoaMap = new Map(pessoas?.map((p) => [p._id, p]) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Receitas</h1>
          <p className="text-slate-500">Total: <span className="font-mono font-semibold text-success">{formatBRL(total)}</span></p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova</Button>
        </div>
      </div>

      {categorias && categorias.length === 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm flex items-center justify-between">
          <span className="text-amber-800">Sem categorias.</span>
          <Button size="sm" variant="outline" onClick={() => token && seedCategorias({ sessionToken: token })}>Criar padrão</Button>
        </div>
      )}

      {receitas === undefined ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : receitas.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Nenhuma receita neste mês.</div>
      ) : (
        <ul className="space-y-2">
          {receitas.map((r, idx) => {
            const cat = catMap.get(r.categoriaId);
            const pessoa = pessoaMap.get(r.pessoaId);
            return (
              <motion.li
                key={r._id + (r._parcela ?? "")}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl bg-white border p-4 flex items-center gap-3 ${r.recebido ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => token && toggleRecebido({ sessionToken: token, id: r._id })}
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${r.recebido ? "bg-success border-success text-white" : "border-slate-300 hover:border-success"}`}
                  aria-label={r.recebido ? "Desmarcar" : "Marcar como recebido"}
                >
                  {r.recebido && <Check size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${r.recebido ? "line-through" : ""}`}>{r.descricao}</span>
                    {r._parcela && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{r._parcela}/{r.totalParcelas}</span>}
                    {r.tipo === "fixa" && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Fixa</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {pessoa && <span>{pessoa.apelido ?? pessoa.nome}</span>}
                    {r.pagadorNome && <span> · de {r.pagadorNome}</span>}
                    {cat && <span style={{ color: cat.cor }}> · {cat.nome}</span>}
                    <span> · {formatDate(r.dataPrevisao)}</span>
                  </div>
                </div>

                <div className="font-mono font-semibold text-success shrink-0">{formatBRL(r.valor)}</div>
                <button onClick={() => token && remove({ sessionToken: token, id: r._id })} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10" aria-label="Remover">
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && <ReceitaForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
