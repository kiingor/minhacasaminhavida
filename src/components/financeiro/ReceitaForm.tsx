"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseBRL } from "@/lib/formatters";
import { Plus, X } from "lucide-react";

interface EditData {
  _id: Id<"receitas">;
  descricao: string;
  valor: number;
  tipo: "fixa" | "parcelada" | "avulsa";
  categoriaId: Id<"categorias">;
  pessoaId: Id<"pessoas">;
  pagadorId?: Id<"pagadores">;
  pagadorNome?: string;
  dataPrevisao: string;
  totalParcelas?: number;
  parcelaAtual?: number;
  recorrente?: boolean;
  observacao?: string;
}

interface Props { onClose: () => void; editData?: EditData; }

export function ReceitaForm({ onClose, editData }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.receitas.create);
  const update = useMutation(api.financeiro.receitas.update);
  const criarCategoria = useMutation(api.financeiro.categorias.create);
  const criarPagador = useMutation(api.financeiro.pagadores.create);
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "receita" } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const pagadores = useQuery(api.financeiro.pagadores.list, token ? { sessionToken: token } : "skip");

  const isEditing = !!editData;

  const [descricao, setDescricao] = useState(editData?.descricao ?? "");
  const [valor, setValor] = useState(editData ? (editData.valor / 100).toFixed(2).replace(".", ",") : "");
  const [tipo, setTipo] = useState<"fixa" | "parcelada" | "avulsa">(editData?.tipo ?? "fixa");
  const [categoriaId, setCategoriaId] = useState<Id<"categorias"> | "">(editData?.categoriaId ?? "");
  const [pessoaId, setPessoaId] = useState<Id<"pessoas"> | "">(editData?.pessoaId ?? "");
  const [pagadorId, setPagadorId] = useState<Id<"pagadores"> | "">(editData?.pagadorId ?? "");
  const [dataPrevisao, setDataPrevisao] = useState(editData?.dataPrevisao ?? new Date().toISOString().slice(0, 10));
  const [totalParcelas, setTotalParcelas] = useState(editData?.totalParcelas?.toString() ?? "2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Nova categoria inline
  const [showNovaCategoria, setShowNovaCategoria] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");
  const [novaCatCor, setNovaCatCor] = useState("#10B981");
  const [savingCat, setSavingCat] = useState(false);

  // Novo pagador inline
  const [showNovoPagador, setShowNovoPagador] = useState(false);
  const [novoPagNome, setNovoPagNome] = useState("");
  const [novoPagCor, setNovoPagCor] = useState("#6366F1");
  const [savingPag, setSavingPag] = useState(false);

  async function handleCriarCategoria() {
    if (!token || !novaCatNome.trim()) return;
    setSavingCat(true);
    try {
      const id = await criarCategoria({ sessionToken: token, nome: novaCatNome.trim(), tipo: "receita", icone: "Package", cor: novaCatCor });
      setCategoriaId(id);
      setNovaCatNome("");
      setShowNovaCategoria(false);
    } finally {
      setSavingCat(false);
    }
  }

  async function handleCriarPagador() {
    if (!token || !novoPagNome.trim()) return;
    setSavingPag(true);
    try {
      const id = await criarPagador({ sessionToken: token, nome: novoPagNome.trim(), tipo: "outro", cor: novoPagCor });
      setPagadorId(id);
      setNovoPagNome("");
      setShowNovoPagador(false);
    } finally {
      setSavingPag(false);
    }
  }

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCent = parseBRL(valor);
    const errors: Record<string, string> = {};
    if (!descricao.trim()) errors.descricao = "Informe a descrição";
    if (valorCent <= 0) errors.valor = "Informe um valor maior que zero";
    if (!categoriaId) errors.categoria = "Selecione uma categoria";
    if (!pessoaId) errors.pessoa = "Selecione quem recebe";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("");
      return;
    }
    setFieldErrors({});
    if (!token) { setError("Não autenticado."); return; }
    setLoading(true);
    setError("");
    try {
      if (isEditing) {
        await update({
          sessionToken: token,
          id: editData._id,
          descricao,
          valor: valorCent,
          tipo,
          categoriaId: categoriaId as Id<"categorias">,
          pessoaId: pessoaId as Id<"pessoas">,
          pagadorId: pagadorId || undefined,
          pagadorNome: undefined,
          dataPrevisao,
          totalParcelas: tipo === "parcelada" ? parseInt(totalParcelas) || 2 : undefined,
          parcelaAtual: tipo === "parcelada" ? (editData.parcelaAtual ?? 1) : undefined,
          recorrente: tipo === "fixa",
        });
      } else {
        await create({
          sessionToken: token,
          descricao,
          valor: valorCent,
          tipo,
          categoriaId: categoriaId as Id<"categorias">,
          pessoaId: pessoaId as Id<"pessoas">,
          pagadorId: pagadorId || undefined,
          dataPrevisao,
          totalParcelas: tipo === "parcelada" ? parseInt(totalParcelas) || 2 : undefined,
          parcelaAtual: tipo === "parcelada" ? 1 : undefined,
          recorrente: tipo === "fixa",
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={isEditing ? "Editar Receita" : "Nova Receita"} className="max-h-[90vh] overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Input label="Descrição" value={descricao} onChange={(e) => { setDescricao(e.target.value); setFieldErrors((f) => ({ ...f, descricao: "" })); }} required />
          {fieldErrors.descricao && <p className="text-xs text-danger mt-1">{fieldErrors.descricao}</p>}
        </div>
        <div>
          <Input label="Valor (R$)" value={valor} onChange={(e) => { setValor(e.target.value); setFieldErrors((f) => ({ ...f, valor: "" })); }} placeholder="0,00" required />
          {fieldErrors.valor && <p className="text-xs text-danger mt-1">{fieldErrors.valor}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="flex gap-2">
            {(["avulsa", "fixa", "parcelada"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize ${tipo === t ? "border-success bg-success/5 text-success" : "border-slate-200 text-slate-600"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tipo === "parcelada" && (
          <Input label="Total de parcelas" type="number" min={2} value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} />
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Categoria</label>
            <button type="button" onClick={() => setShowNovaCategoria((v) => !v)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus size={11} /> Nova categoria
            </button>
          </div>
          <select value={categoriaId} onChange={(e) => { setCategoriaId(e.target.value as Id<"categorias">); setFieldErrors((f) => ({ ...f, categoria: "" })); }} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" required>
            <option value="">Selecione...</option>
            {categorias?.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
          </select>
          {fieldErrors.categoria && <p className="text-xs text-danger mt-1">{fieldErrors.categoria}</p>}
          {showNovaCategoria && (
            <div className="flex gap-2 items-center p-2.5 rounded-lg bg-slate-50 border">
              <input type="color" value={novaCatCor} onChange={(e) => setNovaCatCor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" />
              <input
                type="text"
                placeholder="Nome da categoria"
                value={novaCatNome}
                onChange={(e) => setNovaCatNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCriarCategoria())}
                className="flex-1 px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button type="button" onClick={handleCriarCategoria} disabled={!novaCatNome.trim() || savingCat} className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50">
                {savingCat ? "..." : "Criar"}
              </button>
              <button type="button" onClick={() => setShowNovaCategoria(false)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Quem recebe</label>
          <select value={pessoaId} onChange={(e) => { setPessoaId(e.target.value as Id<"pessoas">); setFieldErrors((f) => ({ ...f, pessoa: "" })); }} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" required>
            <option value="">Selecione...</option>
            {pessoas?.map((p) => <option key={p._id} value={p._id}>{p.apelido ?? p.nome}</option>)}
          </select>
          {fieldErrors.pessoa && <p className="text-xs text-danger mt-1">{fieldErrors.pessoa}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">De quem (pagador)</label>
            <button type="button" onClick={() => setShowNovoPagador((v) => !v)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus size={11} /> Novo pagador
            </button>
          </div>
          <select
            value={pagadorId}
            onChange={(e) => setPagadorId(e.target.value as Id<"pagadores"> | "")}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">Sem pagador</option>
            {pagadores?.filter((p) => p.ativo || p._id === pagadorId).map((p) => (
              <option key={p._id} value={p._id}>{p.apelido ?? p.nome}</option>
            ))}
          </select>
          {editData?.pagadorNome && !pagadorId && (
            <p className="text-xs text-slate-400 mt-1">Legado: {editData.pagadorNome}</p>
          )}
          {showNovoPagador && (
            <div className="flex gap-2 items-center p-2.5 rounded-lg bg-slate-50 border">
              <input type="color" value={novoPagCor} onChange={(e) => setNovoPagCor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" aria-label="Cor do pagador" />
              <input
                type="text"
                placeholder="Nome do pagador"
                value={novoPagNome}
                onChange={(e) => setNovoPagNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCriarPagador())}
                className="flex-1 px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button type="button" onClick={handleCriarPagador} disabled={!novoPagNome.trim() || savingPag} className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50">
                {savingPag ? "..." : "Criar"}
              </button>
              <button type="button" onClick={() => setShowNovoPagador(false)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
            </div>
          )}
        </div>
        <Input label="Previsão" type="date" value={dataPrevisao} onChange={(e) => setDataPrevisao(e.target.value)} required />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
