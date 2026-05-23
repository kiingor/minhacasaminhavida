"use client";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL, parseBRL, todayISO } from "@/lib/formatters";

interface Props {
  dividaId: Id<"dividas">;
  dividaNome: string;
  saldoDevedor: number;
  valorParcela: number;
  cor: string;
  onClose: () => void;
}

export function RegistrarPagamentoDividaDialog({
  dividaId,
  dividaNome,
  saldoDevedor,
  valorParcela,
  cor,
  onClose,
}: Props) {
  const token = useSessionToken();
  const registrar = useMutation(api.financeiro.dividas.registrarPagamento);

  const [valorStr, setValorStr] = useState(
    valorParcela > 0 ? (valorParcela / 100).toFixed(2).replace(".", ",") : ""
  );
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const valorPagoCent = useMemo(() => parseBRL(valorStr), [valorStr]);
  const saldoApos = useMemo(
    () => Math.max(0, saldoDevedor - valorPagoCent),
    [saldoDevedor, valorPagoCent]
  );
  const vaiQuitar = saldoApos <= 0 && valorPagoCent > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (valorPagoCent <= 0) errs.valor = "Informe um valor maior que zero";
    if (!dataPagamento || !/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento))
      errs.data = "Data invalida";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    if (!token) {
      setError("Nao autenticado");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registrar({
        sessionToken: token,
        dividaId,
        valorPago: valorPagoCent,
        dataPagamento,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Registrar pagamento">
      <form onSubmit={onSubmit} className="space-y-4">
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: `${cor}15`, border: `1px solid ${cor}30` }}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" style={{ color: cor }}>
              {dividaNome}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Saldo atual: <span className="font-mono font-semibold">{formatBRL(saldoDevedor)}</span>
            </div>
          </div>
        </div>

        <div>
          <Input
            label="Valor pago (R$)"
            inputMode="decimal"
            value={valorStr}
            onChange={(e) => {
              setValorStr(e.target.value);
              setFieldErrors((f) => ({ ...f, valor: "" }));
            }}
            placeholder="0,00"
            autoFocus
          />
          {fieldErrors.valor && (
            <p className="text-xs text-danger mt-1">{fieldErrors.valor}</p>
          )}
          {valorParcela > 0 && parseBRL(valorStr) !== valorParcela && (
            <button
              type="button"
              onClick={() =>
                setValorStr((valorParcela / 100).toFixed(2).replace(".", ","))
              }
              className="mt-1 text-xs text-primary hover:underline"
            >
              Usar valor da parcela: {formatBRL(valorParcela)}
            </button>
          )}
        </div>

        <div>
          <Input
            label="Data do pagamento"
            type="date"
            value={dataPagamento}
            max={todayISO()}
            onChange={(e) => {
              setDataPagamento(e.target.value);
              setFieldErrors((f) => ({ ...f, data: "" }));
            }}
          />
          {fieldErrors.data && (
            <p className="text-xs text-danger mt-1">{fieldErrors.data}</p>
          )}
        </div>

        {valorPagoCent > 0 && (
          <div
            className={`rounded-lg p-3 text-sm border ${
              vaiQuitar
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            {vaiQuitar ? (
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Esta divida sera quitada com este pagamento!
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Saldo apos pagamento</span>
                  <span className="font-mono font-semibold">{formatBRL(saldoApos)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Reduz {formatBRL(valorPagoCent)} do saldo devedor
                </div>
              </>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Registrando..." : "Confirmar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
