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

interface Props {
  onClose: () => void;
}

export function DespesaForm({ onClose }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.despesas.create);
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "despesa" } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"fixa" | "parcelada" | "avulsa">("avulsa");
  const [categoriaId, setCategoriaId] = useState<Id<"categorias"> | "">("");
  const [pessoaId, setPessoaId] = useState<Id<"pessoas"> | "">("");
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [totalParcelas, setTotalParcelas] = useState("2");
  const [cartao, setCartao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCent = parseBRL(valor);
    if (!descricao.trim() || valorCent <= 0 || !categoriaId) {
      setError("Preencha descrição, valor e categoria.");
      return;
    }
    if (!token) { setError("Não autenticado."); return; }
    setLoading(true);
    setError("");
    try {
      await create({
        sessionToken: token,
        descricao,
        valor: valorCent,
        tipo,
        categoriaId: categoriaId as Id<"categorias">,
        pessoaId: pessoaId ? (pessoaId as Id<"pessoas">) : undefined,
        dataVencimento,
        totalParcelas: tipo === "parcelada" ? parseInt(totalParcelas) || 2 : undefined,
        parcelaAtual: tipo === "parcelada" ? 1 : undefined,
        cartao: cartao || undefined,
        recorrente: tipo === "fixa",
        observacao: observacao || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Nova Despesa" className="max-h-[90vh] overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
        <Input label="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="flex gap-2">
            {(["avulsa", "fixa", "parcelada"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${tipo === t ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"}`}
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
          <label className="text-sm font-medium text-slate-700">Categoria</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value as Id<"categorias">)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
            required
          >
            <option value="">Selecione...</option>
            {categorias?.map((c) => (
              <option key={c._id} value={c._id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Pessoa (opcional)</label>
          <select
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value as Id<"pessoas">)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">—</option>
            {pessoas?.map((p) => (
              <option key={p._id} value={p._id}>{p.apelido ?? p.nome}</option>
            ))}
          </select>
        </div>

        <Input label="Vencimento" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
        <Input label="Cartão (opcional)" value={cartao} onChange={(e) => setCartao(e.target.value)} placeholder="Ex: Nubank" />
        <Input label="Observação" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : "Criar"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
