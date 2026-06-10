"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, CreditCard } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { periodoGracaDias } from "../../../../convex/financeiro/cartaoCiclo";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { parseBRL, formatBRL } from "@/lib/formatters";
import { currentMonth } from "@/lib/monthUtils";

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outro"];
const CORES = ["#6366F1","#EF4444","#F97316","#10B981","#06B6D4","#8B5CF6","#EC4899","#F59E0B","#64748B","#1E1B4B"];

interface FormState {
  nome: string;
  bandeira: string;
  cor: string;
  limite: string; // texto "1.000,00"
  diaFechamento: string; // "" | "1".."31"
  diaVencimento: string;
  ativo: boolean;
}
const DEFAULT: FormState = { nome: "", bandeira: "Visa", cor: "#6366F1", limite: "", diaFechamento: "", diaVencimento: "", ativo: true };

interface CartaoDoc {
  _id: Id<"cartoes">;
  nome: string;
  bandeira?: string;
  cor: string;
  limiteTotal?: number;
  diaFechamento?: number;
  diaVencimento?: number;
  ativo?: boolean;
}

export default function CartoesPage() {
  const token = useSessionToken();
  const cartoes = useQuery(api.financeiro.cartoes.list, token ? { sessionToken: token } : "skip");
  const create = useMutation(api.financeiro.cartoes.create);
  const update = useMutation(api.financeiro.cartoes.update);
  const remove = useMutation(api.financeiro.cartoes.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"cartoes"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"cartoes"> | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openEdit(c: CartaoDoc) {
    setEditingId(c._id);
    setForm({
      nome: c.nome,
      bandeira: c.bandeira ?? "Visa",
      cor: c.cor,
      limite: c.limiteTotal != null ? (c.limiteTotal / 100).toFixed(2).replace(".", ",") : "",
      diaFechamento: c.diaFechamento != null ? String(c.diaFechamento) : "",
      diaVencimento: c.diaVencimento != null ? String(c.diaVencimento) : "",
      ativo: c.ativo !== false,
    });
    setError("");
    setShowForm(true);
  }

  function openNew() {
    setEditingId(null);
    setForm(DEFAULT);
    setError("");
    setShowForm(true);
  }

  // Preview do ciclo enquanto edita.
  const fechNum = form.diaFechamento ? Number(form.diaFechamento) : undefined;
  const vencNum = form.diaVencimento ? Number(form.diaVencimento) : undefined;
  const diasInvalidos =
    (fechNum !== undefined && (fechNum < 1 || fechNum > 31)) ||
    (vencNum !== undefined && (vencNum < 1 || vencNum > 31));
  const fechVencIguais = fechNum !== undefined && vencNum !== undefined && fechNum === vencNum;
  const graca =
    fechNum !== undefined && vencNum !== undefined && !fechVencIguais && !diasInvalidos
      ? periodoGracaDias(fechNum, vencNum, currentMonth())
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form.nome.trim()) return;
    if (diasInvalidos) { setError("Dias devem estar entre 1 e 31."); return; }
    if (fechVencIguais) { setError("Fechamento e vencimento não podem ser no mesmo dia."); return; }
    setLoading(true);
    setError("");
    const payload = {
      nome: form.nome.trim(),
      bandeira: form.bandeira || undefined,
      cor: form.cor,
      limiteTotal: form.limite.trim() ? parseBRL(form.limite) : undefined,
      diaFechamento: fechNum,
      diaVencimento: vencNum,
      ativo: form.ativo,
    };
    try {
      if (editingId) {
        await update({ sessionToken: token, id: editingId, ...payload });
      } else {
        await create({ sessionToken: token, ...payload });
      }
      setShowForm(false);
      setForm(DEFAULT);
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        backHref="/financeiro"
        backLabel="Voltar para Finanças"
        title="Cartões"
        subtitle="Gerencie seus cartões de crédito"
        actions={
          <Button onClick={openNew}>
            <Plus size={16} /> Novo Cartão
          </Button>
        }
      />

      {cartoes === undefined ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : cartoes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <CreditCard size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhum cartão cadastrado</p>
          <p className="text-sm text-slate-400 mb-4">Adicione seu primeiro cartão de crédito</p>
          <Button onClick={openNew}><Plus size={16} /> Novo Cartão</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {cartoes.map((c, i) => {
            const inativo = c.ativo === false;
            const temCiclo = c.diaFechamento != null && c.diaVencimento != null;
            return (
              <motion.li
                key={c._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl bg-white border p-4 flex items-center gap-3 ${inativo ? "opacity-60" : ""}`}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.cor}20`, color: c.cor }}>
                  <CreditCard size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.nome}
                    {inativo && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">inativo</span>}
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5">
                    {c.bandeira && <span>{c.bandeira}</span>}
                    {c.limiteTotal != null && <span>· limite {formatBRL(c.limiteTotal)}</span>}
                    {temCiclo && <span>· fecha dia {c.diaFechamento} · vence dia {c.diaVencimento}</span>}
                  </div>
                </div>
                <button onClick={() => openEdit(c)} className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-slate-300 hover:text-danger hover:bg-danger/10 rounded transition-colors">
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      <Dialog open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? "Editar Cartão" : "Novo Cartão"} className="max-h-[90vh] overflow-y-auto">
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

          {/* Ciclo de fatura */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Ciclo da fatura</span>
              <span className="text-xs text-slate-400">opcional</span>
            </div>
            <Input
              label="Limite total (R$)"
              value={form.limite}
              onChange={(e) => setForm((f) => ({ ...f, limite: e.target.value }))}
              placeholder="0,00"
              inputMode="decimal"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dia de fechamento"
                type="number"
                min={1}
                max={31}
                value={form.diaFechamento}
                onChange={(e) => setForm((f) => ({ ...f, diaFechamento: e.target.value }))}
                placeholder="ex: 25"
              />
              <Input
                label="Dia de vencimento"
                type="number"
                min={1}
                max={31}
                value={form.diaVencimento}
                onChange={(e) => setForm((f) => ({ ...f, diaVencimento: e.target.value }))}
                placeholder="ex: 5"
              />
            </div>
            {fechVencIguais && (
              <p className="text-xs text-danger">Fechamento e vencimento não podem ser no mesmo dia.</p>
            )}
            {graca != null && (
              <p className="text-xs text-slate-500">
                {vencNum! <= fechNum!
                  ? `Vence no mês seguinte ao fechamento — ${graca} dias de prazo (período de graça).`
                  : `${graca} dias de prazo entre fechamento e vencimento (período de graça).`}
              </p>
            )}
            <p className="text-xs text-slate-400">
              Sem o ciclo configurado, as compras continuam agrupadas pelo mês de vencimento.
            </p>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 accent-primary shrink-0" />
            <div>
              <div className="text-sm font-medium text-slate-700">Cartão ativo</div>
              <div className="text-xs text-slate-500">Desmarque para arquivar sem perder o histórico.</div>
            </div>
          </label>

          {/* Preview */}
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: `${form.cor}15`, border: `1px solid ${form.cor}30` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${form.cor}25`, color: form.cor }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div className="font-medium" style={{ color: form.cor }}>{form.nome || "Nome do cartão"}</div>
              <div className="text-xs text-slate-400">
                {form.bandeira}
                {form.limite.trim() ? ` · limite ${formatBRL(parseBRL(form.limite))}` : ""}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading || !form.nome.trim()}>{loading ? "Salvando..." : editingId ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (token && deleteId) remove({ sessionToken: token, id: deleteId }); }}
        title="Excluir cartão"
        description="Tem certeza que deseja excluir este cartão?"
      />
    </div>
  );
}
