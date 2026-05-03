"use client";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Check, Trash2, Pencil, CreditCard, ChevronLeft, Sparkles, Search, Filter, ArrowDownCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { DespesaForm } from "@/components/financeiro/DespesaForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ParcelasView } from "@/components/financeiro/ParcelasView";
import { currentMonth, monthLabelLong } from "@/lib/monthUtils";
import { formatBRL, formatDate } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";

type StatusFilter = "todos" | "pago" | "pendente";

export default function DespesasPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingDespesa, setEditingDespesa] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<Id<"despesas"> | null>(null);
  const [togglingId, setTogglingId] = useState<Id<"despesas"> | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFilter>("todos");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parcelaDespesa, setParcelaDespesa] = useState<any>(null);

  const despesas = useQuery(api.financeiro.despesas.listByMonth, token ? { sessionToken: token, mes } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "despesa" } : "skip");
  const togglePago = useMutation(api.financeiro.despesas.togglePago);
  const remove = useMutation(api.financeiro.despesas.remove);
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias]);

  const catMap = new Map(categorias?.map((c) => [c._id, c]) ?? []);

  const filtered = useMemo(() => {
    if (!despesas) return [];
    return despesas.filter((d) => {
      if (filtroStatus === "pago" && !d.pago) return false;
      if (filtroStatus === "pendente" && d.pago) return false;
      if (busca) {
        const term = busca.toLowerCase();
        const cat = catMap.get(d.categoriaId);
        if (
          !d.descricao.toLowerCase().includes(term) &&
          !(cat?.nome.toLowerCase().includes(term)) &&
          !(d.cartao?.toLowerCase().includes(term))
        ) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.pago !== b.pago) return a.pago ? 1 : -1;
      return a.dataVencimento.localeCompare(b.dataVencimento);
    });
  }, [despesas, filtroStatus, busca, catMap]);

  const total = despesas?.reduce((s, d) => s + d.valor, 0) ?? 0;
  const totalPago = despesas?.filter((d) => d.pago).reduce((s, d) => s + d.valor, 0) ?? 0;
  const totalPendente = total - totalPago;

  async function handleToggle(id: Id<"despesas">, mesProj: string) {
    if (!token || togglingId) return;
    setTogglingId(id);
    try {
      await togglePago({ sessionToken: token, id, mes: mesProj });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Despesas</h1>
          <div className="flex flex-wrap gap-3 text-sm mt-0.5">
            <span className="text-slate-500">Total: <span className="font-mono font-semibold text-danger">{formatBRL(total)}</span></span>
            <span className="text-slate-400">|</span>
            <span className="text-success">Pago: <span className="font-mono font-semibold">{formatBRL(totalPago)}</span></span>
            <span className="text-slate-400">|</span>
            <span className="text-warning">Pendente: <span className="font-mono font-semibold">{formatBRL(totalPendente)}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <Link href="/financeiro/despesas/fatura-ia">
            <Button variant="outline" className="text-sm"><Sparkles size={16} className="text-primary" /> <span className="hidden sm:inline">Lançamento com IA</span><span className="sm:hidden">IA</span></Button>
          </Link>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova</Button>
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria ou cartão..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-1">
          {([
            { value: "todos", label: "Todos" },
            { value: "pendente", label: "Pendentes" },
            { value: "pago", label: "Pagos" },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroStatus(f.value)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                filtroStatus === f.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
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
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <ArrowDownCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhuma despesa neste mês</p>
          <p className="text-sm text-slate-400 mb-4">Comece adicionando sua primeira despesa</p>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova Despesa</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Filter size={24} className="mx-auto mb-2 opacity-40" />
          Nenhuma despesa encontrada com esses filtros.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d, idx) => {
            const cat = catMap.get(d.categoriaId);
            const IconCat = iconeDaCategoria(cat?.icone);
            const isToggling = togglingId === d._id;
            const mesProj = d._projectedMes ?? d.dataVencimento.slice(0, 7);
            const mesExt = monthLabelLong(mesProj);
            return (
              <motion.li
                key={d._id + (d._parcela ?? "")}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
                  d.pago
                    ? "bg-emerald-50/50 border-emerald-200/50"
                    : "bg-white border-slate-200"
                }`}
              >
                <button
                  role="checkbox"
                  aria-checked={d.pago}
                  onClick={() => handleToggle(d._id, mesProj)}
                  disabled={isToggling}
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                    d.pago ? "bg-success border-success text-white" : "border-slate-300 hover:border-success"
                  } ${isToggling ? "opacity-50" : ""}`}
                  aria-label={d.pago ? `Remover pagamento de ${mesExt}` : `Marcar pagamento de ${mesExt}`}
                >
                  {isToggling ? <Loader2 size={14} className="animate-spin" /> : d.pago && <Check size={16} />}
                </button>

                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${cat?.cor ?? "#94A3B8"}20`, color: cat?.cor ?? "#94A3B8" }}
                  aria-hidden
                >
                  <IconCat size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${d.pago ? "line-through text-slate-400" : ""}`}>{d.descricao}</span>
                    {d._parcela && (
                      <button
                        onClick={() => setParcelaDespesa(d)}
                        className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        {d._parcela}/{d.totalParcelas}
                      </button>
                    )}
                    {d.tipo === "fixa" && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Fixa</span>}
                    {d.cartao && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 inline-flex items-center gap-1"><CreditCard size={10} />{d.cartao}</span>}
                    {d.pago
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Pago</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Pendente</span>
                    }
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {cat && <span style={{ color: cat.cor }}>{cat.nome}</span>}
                    {cat && " · "}
                    Venc: {formatDate(d.dataVencimento)}
                  </div>
                </div>

                <div className="font-mono font-semibold text-danger shrink-0">{formatBRL(d.valor)}</div>
                <button onClick={() => setEditingDespesa(d)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10" aria-label="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(d._id)} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10" aria-label="Remover">
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && <DespesaForm onClose={() => setShowForm(false)} />}
      {editingDespesa && <DespesaForm onClose={() => setEditingDespesa(null)} editData={editingDespesa} />}

      {parcelaDespesa && (
        <ParcelasView
          open
          onClose={() => setParcelaDespesa(null)}
          descricao={parcelaDespesa.descricao}
          dataInicio={parcelaDespesa.dataVencimento}
          totalParcelas={parcelaDespesa.totalParcelas ?? 1}
          parcelaAtual={parcelaDespesa._parcela ?? 1}
          valor={parcelaDespesa.valor}
          tipo="despesa"
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (token && deleteId) remove({ sessionToken: token, id: deleteId }); }}
        title="Excluir despesa"
        description="Tem certeza que deseja excluir esta despesa? Essa ação não pode ser desfeita."
      />
    </div>
  );
}
