"use client";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
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
  categoriaPaiId: Id<"categorias"> | "";
}

const DEFAULT: FormState = { nome: "", tipo: "despesa", icone: "Package", cor: "#6366F1", categoriaPaiId: "" };

interface CategoriaItem {
  _id: Id<"categorias">;
  nome: string;
  tipo: "despesa" | "receita";
  icone: string;
  cor: string;
  categoriaPaiId?: Id<"categorias">;
}

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
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"despesa" | "receita">("despesa");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedDefaults({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedDefaults]);

  const filtradas: CategoriaItem[] = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === tab),
    [categorias, tab]
  );

  const maes = useMemo(
    () => filtradas
      .filter((c) => !c.categoriaPaiId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [filtradas]
  );

  const filhasPorPai = useMemo(() => {
    const m = new Map<string, CategoriaItem[]>();
    for (const c of filtradas) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(c);
      }
    }
    for (const arr of m.values()) arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return m;
  }, [filtradas]);

  // Filhas órfãs: pai removido ou de outro tipo. Aparecem ao final como mães.
  const orfas = useMemo(
    () => filtradas.filter(
      (c) => c.categoriaPaiId && !maes.find((m) => m._id === c.categoriaPaiId)
    ),
    [filtradas, maes]
  );

  function openEdit(cat: CategoriaItem) {
    setEditingId(cat._id);
    setForm({
      nome: cat.nome,
      tipo: cat.tipo,
      icone: cat.icone,
      cor: cat.cor,
      categoriaPaiId: cat.categoriaPaiId ?? "",
    });
    setError("");
    setShowForm(true);
  }

  function openNew(paiId?: Id<"categorias">) {
    setEditingId(null);
    setForm({ ...DEFAULT, tipo: tab, categoriaPaiId: paiId ?? "" });
    setError("");
    setShowForm(true);
  }

  function toggleExpandido(id: Id<"categorias">) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      const k = id as string;
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form.nome.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (editingId) {
        // Para atualizar pai: passa null se "" para tornar mãe; passa id se selecionado
        const cat = categorias?.find((c) => c._id === editingId);
        const paiAtual = cat?.categoriaPaiId ?? "";
        const paiMudou = paiAtual !== (form.categoriaPaiId || "");
        await updateCat({
          sessionToken: token,
          id: editingId,
          nome: form.nome.trim(),
          icone: form.icone,
          cor: form.cor,
          ...(paiMudou
            ? { categoriaPaiId: form.categoriaPaiId === "" ? null : (form.categoriaPaiId as Id<"categorias">) }
            : {}),
        });
      } else {
        await create({
          sessionToken: token,
          nome: form.nome.trim(),
          tipo: form.tipo,
          icone: form.icone,
          cor: form.cor,
          categoriaPaiId: form.categoriaPaiId
            ? (form.categoriaPaiId as Id<"categorias">)
            : undefined,
        });
      }
      // Expande o pai para mostrar a nova subcategoria criada
      if (form.categoriaPaiId) {
        setExpandidos((prev) => new Set(prev).add(form.categoriaPaiId as string));
      }
      setShowForm(false);
      setForm(DEFAULT);
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  // Mães disponíveis para escolher como pai no form (do mesmo tipo, exceto a própria categoria sendo editada)
  const maesDisponiveis = useMemo(
    () =>
      (categorias ?? [])
        .filter(
          (c) =>
            c.tipo === form.tipo &&
            !c.categoriaPaiId &&
            c._id !== editingId
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [categorias, form.tipo, editingId]
  );

  // Bloqueia mover pra filha se a própria categoria editada é mãe (tem filhas)
  const editingHasChildren = useMemo(() => {
    if (!editingId) return false;
    return (categorias ?? []).some(
      (c) => c.categoriaPaiId === editingId
    );
  }, [categorias, editingId]);

  function renderCategoria(cat: CategoriaItem, idx: number, asOrfa = false) {
    const filhas = filhasPorPai.get(cat._id as string) ?? [];
    const expanded = expandidos.has(cat._id as string);
    const IconCat = iconeDaCategoria(cat.icone);
    return (
      <li key={cat._id} className="space-y-2">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-xl bg-white border p-4 flex items-center gap-3"
        >
          {filhas.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleExpandido(cat._id)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 shrink-0"
              aria-label={expanded ? "Recolher subcategorias" : "Expandir subcategorias"}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6 shrink-0" aria-hidden />
          )}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${cat.cor}20`, color: cat.cor }}
          >
            <IconCat size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{cat.nome}</div>
            {filhas.length > 0 && (
              <div className="text-xs text-slate-400">
                {filhas.length} {filhas.length === 1 ? "subcategoria" : "subcategorias"}
              </div>
            )}
            {asOrfa && (
              <div className="text-xs text-amber-600">Categoria pai removida</div>
            )}
          </div>
          <button
            onClick={() => openNew(cat._id)}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
            aria-label={`Adicionar subcategoria em ${cat.nome}`}
          >
            <Plus size={12} /> Sub
          </button>
          <button
            onClick={() => openEdit(cat)}
            className="p-1.5 rounded text-slate-300 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label={`Editar categoria ${cat.nome}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(cat._id)}
            className="p-1.5 rounded text-slate-300 hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label={`Remover categoria ${cat.nome}`}
          >
            <Trash2 size={14} />
          </button>
        </motion.div>

        <AnimatePresence initial={false}>
          {expanded && filhas.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-6 sm:pl-10 space-y-2 overflow-hidden"
            >
              {filhas.map((f, fIdx) => {
                const IconF = iconeDaCategoria(f.icone);
                return (
                  <motion.li
                    key={f._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: fIdx * 0.02 }}
                    className="rounded-xl bg-slate-50/60 border border-slate-200 p-3 flex items-center gap-2"
                  >
                    <CornerDownRight size={14} className="text-slate-300 shrink-0" />
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${f.cor}20`, color: f.cor }}
                    >
                      <IconF size={14} />
                    </div>
                    <div className="flex-1 font-medium text-sm truncate">{f.nome}</div>
                    <button
                      onClick={() => openEdit(f)}
                      className="p-1.5 rounded text-slate-300 hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label={`Editar subcategoria ${f.nome}`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setDeleteId(f._id)}
                      className="p-1.5 rounded text-slate-300 hover:text-danger hover:bg-danger/10 transition-colors"
                      aria-label={`Remover subcategoria ${f.nome}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Categorias</h1>
          <p className="text-slate-500">Organize suas finanças com subcategorias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => token && seedDefaults({ sessionToken: token })}>
            Restaurar padrões
          </Button>
          <Button onClick={() => openNew()}>
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

      {/* Lista hierárquica */}
      {categorias === undefined ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          {tab === "despesa" ? <ArrowDownCircle size={40} className="mx-auto mb-3 text-slate-300" /> : <ArrowUpCircle size={40} className="mx-auto mb-3 text-slate-300" />}
          <p className="font-medium text-slate-500">Nenhuma categoria de {tab === "despesa" ? "despesa" : "receita"}</p>
          <p className="text-sm text-slate-400 mb-4">Crie uma categoria ou restaure os padrões</p>
          <Button onClick={() => openNew()}><Plus size={16} /> Nova Categoria</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {maes.map((m, idx) => renderCategoria(m, idx))}
          {orfas.map((o, idx) => renderCategoria(o, maes.length + idx, true))}
        </ul>
      )}

      {/* Form */}
      {showForm && (
        <Dialog open onClose={() => { setShowForm(false); setEditingId(null); setError(""); }} title={editingId ? "Editar Categoria" : (form.categoriaPaiId ? "Nova Subcategoria" : "Nova Categoria")}>
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
                      onClick={() => setForm((f) => ({ ...f, tipo: t, categoriaPaiId: "" }))}
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

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Categoria pai (opcional)</label>
              <select
                value={form.categoriaPaiId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoriaPaiId: e.target.value as Id<"categorias"> | "" }))
                }
                disabled={editingHasChildren}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Sem pai (categoria principal)</option>
                {maesDisponiveis.map((m) => (
                  <option key={m._id} value={m._id}>{m.nome}</option>
                ))}
              </select>
              {editingHasChildren && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Esta categoria tem subcategorias e não pode virar filha de outra.
                </p>
              )}
              {!editingHasChildren && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Subcategorias herdam o tipo da categoria pai. Máximo 2 níveis.
                </p>
              )}
            </div>

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

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null); setError(""); }}>
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
        onConfirm={async () => {
          if (token && deleteId) {
            try {
              await remove({ sessionToken: token, id: deleteId });
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : "Erro ao excluir");
            }
          }
        }}
        title="Excluir categoria"
        description="Despesas e receitas vinculadas a esta categoria não serão afetadas, mas ficarão sem categoria. Categorias com subcategorias não podem ser removidas."
      />
    </div>
  );
}
