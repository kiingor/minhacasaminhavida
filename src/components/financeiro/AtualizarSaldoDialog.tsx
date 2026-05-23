"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { TrendingUp } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL, parseBRL, todayISO } from "@/lib/formatters";

interface Props {
  contaId: Id<"contas">;
  contaNome: string;
  saldoAtual?: number; // centavos (saldo manual vigente)
  cor: string;
  onClose: () => void;
}

export function AtualizarSaldoDialog({ contaId, contaNome, saldoAtual, cor, onClose }: Props) {
  const token = useSessionToken();
  const atualizar = useMutation(api.financeiro.contas.atualizarSaldoManual);

  const [novoSaldoStr, setNovoSaldoStr] = useState(
    saldoAtual !== undefined ? (saldoAtual / 100).toFixed(2).replace(".", ",") : ""
  );
  const [data, setData] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const valor = parseBRL(novoSaldoStr);
    if (!novoSaldoStr.trim()) errs.novoSaldo = "Informe o saldo atualizado";
    else if (valor < 0) errs.novoSaldo = "Saldo deve ser positivo";
    if (!data) errs.data = "Informe a data";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
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
      await atualizar({ sessionToken: token, contaId, novoSaldo: valor, data });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  }

  const variacao =
    saldoAtual !== undefined && novoSaldoStr.trim()
      ? parseBRL(novoSaldoStr) - saldoAtual
      : 0;
  const tipoVariacao = variacao > 0 ? "ganho" : variacao < 0 ? "perda" : "estavel";

  return (
    <Dialog open onClose={onClose} title="Atualizar saldo">
      <form onSubmit={onSubmit} className="space-y-4">
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: `${cor}15`, border: `1px solid ${cor}30` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${cor}25`, color: cor }}
          >
            <TrendingUp size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" style={{ color: cor }}>
              {contaNome}
            </div>
            {saldoAtual !== undefined && (
              <div className="text-xs text-slate-600">
                Saldo atual: <span className="font-mono font-semibold">{formatBRL(saldoAtual)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <Input
            label="Novo saldo (R$)"
            inputMode="decimal"
            value={novoSaldoStr}
            onChange={(e) => {
              setNovoSaldoStr(e.target.value);
              setFieldErrors((f) => ({ ...f, novoSaldo: "" }));
            }}
            placeholder="0,00"
            autoFocus
          />
          {fieldErrors.novoSaldo && (
            <p className="text-xs text-danger mt-1">{fieldErrors.novoSaldo}</p>
          )}
        </div>

        <div>
          <Input
            label="Data da atualização"
            type="date"
            value={data}
            max={todayISO()}
            onChange={(e) => {
              setData(e.target.value);
              setFieldErrors((f) => ({ ...f, data: "" }));
            }}
          />
          {fieldErrors.data && (
            <p className="text-xs text-danger mt-1">{fieldErrors.data}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Pode ser passada — vai pro histórico mesmo assim.
          </p>
        </div>

        {variacao !== 0 && saldoAtual !== undefined && novoSaldoStr.trim() && (
          <div
            className={`rounded-lg p-3 text-sm ${
              tipoVariacao === "ganho"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="font-medium">
              {tipoVariacao === "ganho" ? "Ganho de" : "Variação de"}{" "}
              <span className="font-mono">{formatBRL(Math.abs(variacao))}</span>
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {saldoAtual > 0
                ? `${tipoVariacao === "ganho" ? "+" : "-"}${Math.abs(
                    Math.round((variacao / saldoAtual) * 100)
                  )}% em relação ao saldo anterior`
                : "Primeira movimentação registrada"}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Salvando..." : "Atualizar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
