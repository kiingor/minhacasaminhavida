"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CATEGORIA_ICONS, iconeDaCategoria } from "@/lib/categoriaIcons";

const CORES = ["#6366F1","#F97316","#06B6D4","#EF4444","#EC4899","#8B5CF6","#10B981","#F59E0B","#64748B","#14B8A6","#84CC16","#3B82F6"];

interface FormState {
  nome: string;
  tipo: "despesa" | "receita";
  icone: string;
  cor: string;
}

const DEFAULT: FormState = { nome: "", tipo: "despesa", icone: "Package", cor: "#6366F1" };

export default function CategoriasPage() {
  const token = useSessionToken();
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token } : "skip");
  const create = useMutation(api.financeiro.categorias.create);
  const updateCat = useMutation(api.financeiro.categorias.update);
  const remove = useMutation(api.financeiro.categorias.remove);
  const seedDefaults = useMutation(api.financeiro.categorias.seedDefaults);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"categorias"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"categorias"> | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"despesa" | "receita">("despesa");

  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedDefaults({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedDefaults]);

  const filtradas = categorias?.filter((c) => c.tipo === tab) ?? [];

  function openEdit(cat: { _id: Id<"categorias">; nome: string; tipo: "despesa" | "receita"; icone: string; cor: string }) {
    setEditingId(cat._id);
    setForm({ nome: cat.nome, tipo: cat.tipo, icone: cat.icone, cor: cat.cor });
    setShowForm(true);
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...DEFAULT, tipo: tab });
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form.nome.trim()) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateCat({ sessionToken: token, id: editingId, nome: form.nome.trim(), icone: form.icone, cor: form.cor });
      } else {
        await create({ sessionToken: token, nome: form.nome.trim(), tipo: form.tipo, icone: form.icone, cor: form.cor });
      }
      setShowForm(false);
      setForm(DEFAULT);
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Categorias</h1>
          <p className="text-slate-500">Organize suas finanças por tipo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => token && seedDefaults({ sessionToken: token })}>
            Restaurar padrões
          </Button>
          <Button onClick={openNew}>
            <Plus size={16} /> Nova
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["despesa", "receita"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              tab === t
                ? t === "despesa"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {t === "despesa" ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
            {t === "despesa" ? "Despesas" : "Receitas"}
            <span className="ml-1 text-xs opacity-60">
              ({categorias?.filter((c) => c.tipo === t).length ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {categorias === undefined ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          {tab === "despesa" ? <ArrowDownCircle size={40} className="mx-auto mb-3 text-slate-300" /> : <ArrowUpCircle size={40} className="mx-auto mb-3 text-slate-300" />}
          <p className="font-medium text-slate-500">Nenhuma categoria de {tab === "despesa" ? "despesa" : "receita"}</p>
          <p className="text-sm text-slate-400 mb-4">Crie uma categoria ou restaure os padrões</p>
          <Button onClick={openNew}><Plus size={16} /> Nova Categoria</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((cat, idx) => (
            <motion.li
              key={cat._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl bg-white border p-4 flex items-center gap-3"
            >
              {(() => {
                const IconCat = iconeDaCategoria(cat.icone);
                return (
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${cat.cor}20`, color: cat.cor }}
                  >
                    <IconCat size={18} />
                  </div>
                );
              })()}
              <div className="flex-1 font-medium">{cat.nome}</div>
              <button
                onClick={() => openEdit(cat)}
                className="p-1.5 rounded text-slate-300 hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setDeleteId(cat._id)}
                className="p-1.5 rounded text-slate-300 hover:text-danger hover:bg-danger/10 transition-colors"
                aria-label="Remover"
              >
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {/* Form */}
      {showForm && (
        <Dialog open onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? "Editar Categoria" : "Nova Categoria"}>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
              autoFocus
            />

            {!editingId && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Tipo</label>
                <div className="flex gap-2">
                  {(["despesa", "receita"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.tipo === t
                          ? t === "despesa"
                            ? "border-rose-400 bg-rose-50 text-rose-700"
                            : "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {t === "despesa" ? "Despesa" : "Receita"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {(() => {
                const IconPrev = iconeDaCategoria(form.icone);
                return (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${form.cor}20`, color: form.cor }}>
                    <IconPrev size={20} />
                  </div>
                );
              })()}
              <div className="text-xs text-slate-500">Prévia da categoria</div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    aria-label={`Cor ${cor}`}
                    onClick={() => setForm((f) => ({ ...f, cor }))}
                    className={`w-7 h-7 rounded-full transition-transform ${form.cor === cor ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Ícone</label>
              <div role="radiogroup" aria-label="Ícone da categoria" className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {CATEGORIA_ICONS.map(({ nome, Icon }) => (
                  <button
                    key={nome}
                    type="button"
                    aria-label={nome}
                    aria-pressed={form.icone === nome}
                    onClick={() => setForm((f) => ({ ...f, icone: nome }))}
                    className={`h-10 rounded-lg border flex items-center justify-center transition-colors ${form.icone === nome ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null); }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !form.nome.trim()}>
                {loading ? "Salvando..." : editingId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (token && deleteId) remove({ sessionToken: token, id: deleteId }); }}
        title="Excluir categoria"
        description="Despesas e receitas vinculadas a esta categoria não serão afetadas, mas ficarão sem categoria."
      />
    </div>
  );
}
