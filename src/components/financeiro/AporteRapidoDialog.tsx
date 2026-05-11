"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Info } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL, parseBRL, todayISO } from "@/lib/formatters";

interface Props {
  metaId: Id<"metas">;
  metaTitulo: string;
  cor: string;
  aporteSugerido: number; // centavos
  onClose: () => void;
}

function centavosParaInput(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

export function AporteRapidoDialog({
  metaId,
  metaTitulo,
  cor,
  aporteSugerido,
  onClose,
}: Props) {
  const token = useSessionToken();
  const addAporte = useMutation(api.financeiro.metas.addAporte);

  const [valorStr, setValorStr] = useState(
    aporteSugerido > 0 ? centavosParaInput(aporteSugerido) : ""
  );
  const [observacao, setObservacao] = useState("");
  const [data, setData] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sugestoes: { label: string; valor: number }[] = aporteSugerido > 0
    ? [
        { label: "Metade", valor: Math.ceil(aporteSugerido / 2) },
        { label: "Sugerido", valor: aporteSugerido },
        { label: "Dobro", valor: aporteSugerido * 2 },
      ]
    : [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Não autenticado.");
      return;
    }
    const valor = parseBRL(valorStr);
    if (valor <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await addAporte({
        sessionToken: token,
        metaId,
        valor,
        observacao: observacao.trim() || undefined,
        data,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao registrar aporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Aportar em: ${metaTitulo}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div
          className="rounded-lg p-2.5 flex gap-2 items-start text-xs"
          style={{ background: `${cor}10`, border: `1px solid ${cor}30`, color: cor }}
          role="note"
        >
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            Este aporte sera registrado como despesa paga em{" "}
            <strong>Metas / Poupanca</strong> na data informada.
          </span>
        </div>

        <Input
          label="Valor (R$)"
          inputMode="decimal"
          value={valorStr}
          onChange={(e) => setValorStr(e.target.value)}
          placeholder="0,00"
          autoFocus
          required
        />

        {sugestoes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Sugestoes</span>
            <div className="grid grid-cols-3 gap-2">
              {sugestoes.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setValorStr(centavosParaInput(s.valor))}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-700 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    {s.label}
                  </div>
                  <div className="font-mono">{formatBRL(s.valor)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />

        <Input
          label="Observacao (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Aportando..." : "Aportar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
