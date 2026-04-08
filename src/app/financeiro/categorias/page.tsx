"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const CORES = ["#6366F1","#F97316","#06B6D4","#EF4444","#EC4899","#8B5CF6","#10B981","#F59E0B","#64748B","#14B8A6","#84CC16","#3B82F6"];
const ICONES = ["Home","UtensilsCrossed","Car","HeartPulse","Gamepad2","GraduationCap","ShoppingCart","Package","Briefcase","Laptop","TrendingUp","Plus","Zap","Star","Gift","Coffee","Music","Plane","Shirt","Dog"];

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
  const remove = useMutation(api.financeiro.categorias.remove);
  const seedDefaults = useMutation(api.financeiro.categorias.seedDefaults);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"despesa" | "receita">("despesa");

  // Auto-seed se não houver nenhuma
  useEffect(() => {
    if (token && categorias && categorias.length === 0) {
      seedDefaults({ sessionToken: token }).catch(() => {});
    }
  }, [token, categorias, seedDefaults]);

  const filtradas = categorias?.filter((c) => c.tipo === tab) ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form.nome.trim()) return;
    setLoading(true);
    try {
      await create({ sessionToken: token, nome: form.nome.trim(), tipo: form.tipo, icone: form.icone, cor: form.cor });
      setShowForm(false);
      setForm(DEFAULT);
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
          <Button
            variant="outline"
            onClick={() => token && seedDefaults({ sessionToken: token })}
          >
            Restaurar padrões
          </Button>
          <Button onClick={() => { setForm(DEFAULT); setShowForm(true); }}>
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
        <div className="text-center py-16 text-slate-400 text-sm border-2 border-dashed rounded-2xl">
          Nenhuma categoria de {tab === "despesa" ? "despesa" : "receita"}.
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
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: `${cat.cor}20`, color: cat.cor }}
              >
                {cat.nome.charAt(0)}
              </div>
              <div className="flex-1 font-medium">{cat.nome}</div>
              <button
                onClick={() => token && remove({ sessionToken: token, id: cat._id })}
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
        <Dialog open onClose={() => setShowForm(false)} title="Nova Categoria">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
              autoFocus
            />

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

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, cor }))}
                    className={`w-7 h-7 rounded-full transition-transform ${form.cor === cor ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !form.nome.trim()}>
                {loading ? "Salvando..." : "Criar"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
