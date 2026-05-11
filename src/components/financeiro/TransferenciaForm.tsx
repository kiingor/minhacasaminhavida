"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseBRL, todayISO } from "@/lib/formatters";
import { getIconeConta } from "./ContaForm";

interface Props {
  onClose: () => void;
  defaultContaOrigemId?: Id<"contas">;
}

export function TransferenciaForm({ onClose, defaultContaOrigemId }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.transferencias.create);
  const contas = useQuery(api.financeiro.contas.list, token ? { sessionToken: token } : "skip");

  const ativas = contas?.filter((c) => c.ativa) ?? [];

  const [contaOrigemId, setContaOrigemId] = useState<Id<"contas"> | "">(
    defaultContaOrigemId ?? ""
  );
  const [contaDestinoId, setContaDestinoId] = useState<Id<"contas"> | "">("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const origem = ativas.find((c) => c._id === contaOrigemId);
  const destino = ativas.find((c) => c._id === contaDestinoId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!contaOrigemId) errors.origem = "Selecione a conta de origem";
    if (!contaDestinoId) errors.destino = "Selecione a conta de destino";
    if (contaOrigemId && contaOrigemId === contaDestinoId)
      errors.destino = "Origem e destino devem ser diferentes";
    const valorCent = parseBRL(valor);
    if (valorCent <= 0) errors.valor = "Informe um valor maior que zero";
    if (!data) errors.data = "Informe a data";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!token) {
      setError("Não autenticado");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await create({
        sessionToken: token,
        contaOrigemId: contaOrigemId as Id<"contas">,
        contaDestinoId: contaDestinoId as Id<"contas">,
        valor: valorCent,
        data,
        descricao: descricao.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Nova Transferência"
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {ativas.length < 2 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Você precisa de pelo menos duas contas ativas para transferir.
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">De (origem)</label>
          <select
            value={contaOrigemId}
            onChange={(e) => {
              setContaOrigemId(e.target.value as Id<"contas">);
              setFieldErrors((f) => ({ ...f, origem: "" }));
            }}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
            required
          >
            <option value="">Selecione...</option>
            {ativas.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nome}
                {c.banco ? ` · ${c.banco}` : ""}
              </option>
            ))}
          </select>
          {fieldErrors.origem && <p className="text-xs text-danger">{fieldErrors.origem}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Para (destino)</label>
          <select
            value={contaDestinoId}
            onChange={(e) => {
              setContaDestinoId(e.target.value as Id<"contas">);
              setFieldErrors((f) => ({ ...f, destino: "" }));
            }}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
            required
          >
            <option value="">Selecione...</option>
            {ativas
              .filter((c) => c._id !== contaOrigemId)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nome}
                  {c.banco ? ` · ${c.banco}` : ""}
                </option>
              ))}
          </select>
          {fieldErrors.destino && <p className="text-xs text-danger">{fieldErrors.destino}</p>}
        </div>

        {origem && destino && (
          <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${origem.cor}25`, color: origem.cor }}
              >
                {(() => {
                  const I = getIconeConta(origem.icone);
                  return <I size={16} />;
                })()}
              </div>
              <span className="text-xs font-medium">{origem.nome}</span>
            </div>
            <ArrowRight size={16} className="text-slate-400" />
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${destino.cor}25`, color: destino.cor }}
              >
                {(() => {
                  const I = getIconeConta(destino.icone);
                  return <I size={16} />;
                })()}
              </div>
              <span className="text-xs font-medium">{destino.nome}</span>
            </div>
          </div>
        )}

        <div>
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setFieldErrors((f) => ({ ...f, valor: "" }));
            }}
            placeholder="0,00"
            required
          />
          {fieldErrors.valor && <p className="text-xs text-danger mt-1">{fieldErrors.valor}</p>}
        </div>

        <div>
          <Input
            label="Data"
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setFieldErrors((f) => ({ ...f, data: "" }));
            }}
            required
          />
          {fieldErrors.data && <p className="text-xs text-danger mt-1">{fieldErrors.data}</p>}
        </div>

        <Input
          label="Descrição (opcional)"
          placeholder="Ex: Transferência para reserva"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading || ativas.length < 2}>
            {loading ? "Salvando..." : "Transferir"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
