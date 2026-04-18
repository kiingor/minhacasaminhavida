"use client";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Check, Trash2, Pencil, ChevronLeft, Search, Filter, ArrowUpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { ReceitaForm } from "@/components/financeiro/ReceitaForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ParcelasView } from "@/components/financeiro/ParcelasView";
import { currentMonth, monthLabelLong } from "@/lib/monthUtils";
import { formatBRL, formatDate } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";

type StatusFilter = "todos" | "recebido" | "pendente";

export default function ReceitasPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingReceita, setEditingReceita] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<Id<"receitas"> | null>(null);
  const [togglingId, setTogglingId] = useState<Id<"receitas"> | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFilter>("todos");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parcelaReceita, setParcelaReceita] = useState<any>(null);

  const receitas = useQuery(api.financeiro.receitas.listByMonth, token ? { sessionToken: token, mes } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "receita" } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const pagadores = useQuery(api.financeiro.pagadores.list, token ? { sessionToken: token, incluirInativos: true } : "skip");
  const toggleRecebido = useMutation(api.financeiro.receitas.toggleRecebido);
  const remove = useMutation(api.financeiro.receitas.remove);
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);

  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedCategorias({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedCategorias]);

  const catMap = new Map(categorias?.map((c) => [c._id, c]) ?? []);
  const pessoaMap = new Map(pessoas?.map((p) => [p._id, p]) ?? []);
  const pagadorMap = new Map(pagadores?.map((p) => [p._id, p]) ?? []);

  const filtered = useMemo(() => {
    if (!receitas) return [];
    return receitas.filter((r) => {
      if (filtroStatus === "recebido" && !r.recebido) return false;
      if (filtroStatus === "pendente" && r.recebido) return false;
      if (busca) {
        const term = busca.toLowerCase();
        const cat = catMap.get(r.categoriaId);
        const pessoa = pessoaMap.get(r.pessoaId);
        const pag = r.pagadorId ? pagadorMap.get(r.pagadorId) : undefined;
        const pagNome = pag ? (pag.apelido ?? pag.nome) : r.pagadorNome;
        if (
          !r.descricao.toLowerCase().includes(term) &&
          !(cat?.nome.toLowerCase().includes(term)) &&
          !(pessoa?.nome.toLowerCase().includes(term)) &&
          !(pagNome?.toLowerCase().includes(term))
        ) return false;
      }
      return true;
    });
  }, [receitas, filtroStatus, busca, catMap, pessoaMap, pagadorMap]);

  const total = receitas?.reduce((s, r) => s + r.valor, 0) ?? 0;
  const totalRecebido = receitas?.filter((r) => r.recebido).reduce((s, r) => s + r.valor, 0) ?? 0;
  const totalPendente = total - totalRecebido;

  async function handleToggle(id: Id<"receitas">, mesProj: string) {
    if (!token || togglingId) return;
    setTogglingId(id);
    try {
      await toggleRecebido({ sessionToken: token, id, mes: mesProj });
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
          <h1 className="font-display text-3xl font-extrabold">Receitas</h1>
          <div className="flex flex-wrap gap-3 text-sm mt-0.5">
            <span className="text-slate-500">Total: <span className="font-mono font-semibold text-success">{formatBRL(total)}</span></span>
            <span className="text-slate-400">|</span>
            <span className="text-success">Recebido: <span className="font-mono font-semibold">{formatBRL(totalRecebido)}</span></span>
            <span className="text-slate-400">|</span>
            <span className="text-warning">Pendente: <span className="font-mono font-semibold">{formatBRL(totalPendente)}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova</Button>
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria ou pessoa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-1">
          {([
            { value: "todos", label: "Todos" },
            { value: "pendente", label: "Pendentes" },
            { value: "recebido", label: "Recebidos" },
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
          <span className="text-amber-800">Sem categorias.</span>
          <Button size="sm" variant="outline" onClick={() => token && seedCategorias({ sessionToken: token })}>Criar padrão</Button>
        </div>
      )}

      {receitas === undefined ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : receitas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <ArrowUpCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhuma receita neste mês</p>
          <p className="text-sm text-slate-400 mb-4">Comece adicionando sua primeira receita</p>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova Receita</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <Filter size={24} className="mx-auto mb-2 opacity-40" />
          Nenhuma receita encontrada com esses filtros.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r, idx) => {
            const cat = catMap.get(r.categoriaId);
            const IconCat = iconeDaCategoria(cat?.icone);
            const pessoa = pessoaMap.get(r.pessoaId);
            const pag = r.pagadorId ? pagadorMap.get(r.pagadorId) : undefined;
            const pagNome = pag ? (pag.apelido ?? pag.nome) : r.pagadorNome;
            const isToggling = togglingId === r._id;
            const mesProj = r._projectedMes ?? r.dataPrevisao.slice(0, 7);
            const mesExt = monthLabelLong(mesProj);
            return (
              <motion.li
                key={r._id + (r._parcela ?? "")}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
                  r.recebido
                    ? "bg-emerald-50/50 border-emerald-200/50"
                    : "bg-white border-slate-200"
                }`}
              >
                <button
                  role="checkbox"
                  aria-checked={r.recebido}
                  onClick={() => handleToggle(r._id, mesProj)}
                  disabled={isToggling}
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                    r.recebido ? "bg-success border-success text-white" : "border-slate-300 hover:border-success"
                  } ${isToggling ? "opacity-50" : ""}`}
                  aria-label={r.recebido ? `Remover recebimento de ${mesExt}` : `Marcar recebimento de ${mesExt}`}
                >
                  {isToggling ? <Loader2 size={14} className="animate-spin" /> : r.recebido && <Check size={16} />}
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
                    <span className={`font-medium ${r.recebido ? "line-through text-slate-400" : ""}`}>{r.descricao}</span>
                    {r._parcela && (
                      <button
                        onClick={() => setParcelaReceita(r)}
                        className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        {r._parcela}/{r.totalParcelas}
                      </button>
                    )}
                    {r.tipo === "fixa" && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Fixa</span>}
                    {r.recebido
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Recebido</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Pendente</span>
                    }
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {pessoa && <span>{pessoa.apelido ?? pessoa.nome}</span>}
                    {pagNome && <span> · de {pagNome}</span>}
                    {cat && <span style={{ color: cat.cor }}> · {cat.nome}</span>}
                    <span> · {formatDate(r.dataPrevisao)}</span>
                  </div>
                </div>

                <div className="font-mono font-semibold text-success shrink-0">{formatBRL(r.valor)}</div>
                <button onClick={() => setEditingReceita(r)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10" aria-label="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(r._id)} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10" aria-label="Remover">
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && <ReceitaForm onClose={() => setShowForm(false)} />}
      {editingReceita && <ReceitaForm onClose={() => setEditingReceita(null)} editData={editingReceita} />}

      {parcelaReceita && (
        <ParcelasView
          open
          onClose={() => setParcelaReceita(null)}
          descricao={parcelaReceita.descricao}
          dataInicio={parcelaReceita.dataPrevisao}
          totalParcelas={parcelaReceita.totalParcelas ?? 1}
          parcelaAtual={parcelaReceita._parcela ?? 1}
          valor={parcelaReceita.valor}
          tipo="receita"
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (token && deleteId) remove({ sessionToken: token, id: deleteId }); }}
        title="Excluir receita"
        description="Tem certeza que deseja excluir esta receita? Essa ação não pode ser desfeita."
      />
    </div>
  );
}
