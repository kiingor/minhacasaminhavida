"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Trash2, CreditCard, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outro"];
const CORES = ["#6366F1","#EF4444","#F97316","#10B981","#06B6D4","#8B5CF6","#EC4899","#F59E0B","#64748B","#1E1B4B"];

interface FormState { nome: string; bandeira: string; cor: string; }
const DEFAULT: FormState = { nome: "", bandeira: "Visa", cor: "#6366F1" };

export default function CartoesPage() {
  const token = useSessionToken();
  const cartoes = useQuery(api.financeiro.cartoes.list, token ? { sessionToken: token } : "skip");
  const create = useMutation(api.financeiro.cartoes.create);
  const remove = useMutation(api.financeiro.cartoes.remove);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form.nome.trim()) return;
    setLoading(true);
    try {
      await create({ sessionToken: token, nome: form.nome.trim(), bandeira: form.bandeira || undefined, cor: form.cor });
      setShowForm(false);
      setForm(DEFAULT);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Cartões</h1>
          <p className="text-slate-500">Gerencie seus cartões de crédito</p>
        </div>
        <Button onClick={() => { setForm(DEFAULT); setShowForm(true); }}>
          <Plus size={16} /> Novo Cartão
        </Button>
      </div>

      {cartoes === undefined ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : cartoes.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-2xl">
          <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
          <p>Nenhum cartão cadastrado.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {cartoes.map((c, i) => (
            <motion.li
              key={c._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl bg-white border p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.cor}20`, color: c.cor }}>
                <CreditCard size={20} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{c.nome}</div>
                {c.bandeira && <div className="text-xs text-slate-400">{c.bandeira}</div>}
              </div>
              <button onClick={() => token && remove({ sessionToken: token, id: c._id })} className="p-1.5 text-slate-300 hover:text-danger rounded transition-colors">
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Novo Cartão">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Nome do cartão" placeholder="Ex: Nubank, Inter Gold..." value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required autoFocus />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Bandeira</label>
            <div className="flex gap-2 flex-wrap">
              {BANDEIRAS.map((b) => (
                <button key={b} type="button" onClick={() => setForm((f) => ({ ...f, bandeira: b }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.bandeira === b ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map((cor) => (
                <button key={cor} type="button" onClick={() => setForm((f) => ({ ...f, cor }))}
                  className={`w-7 h-7 rounded-full transition-transform ${form.cor === cor ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                  style={{ background: cor }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: `${form.cor}15`, border: `1px solid ${form.cor}30` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${form.cor}25`, color: form.cor }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div className="font-medium" style={{ color: form.cor }}>{form.nome || "Nome do cartão"}</div>
              <div className="text-xs text-slate-400">{form.bandeira}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading || !form.nome.trim()}>{loading ? "Salvando..." : "Criar"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
