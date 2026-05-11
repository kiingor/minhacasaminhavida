"use client";
import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { Shield, Info, AlertTriangle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, parseBRL } from "@/lib/formatters";

interface Props {
  mediaDespesas3m: number; // centavos
  mesesCoberturaSugerido: number; // 6 default
  onClose: () => void;
}

const RESERVA_COR = "#10B981";

export function CriarReservaDialog({
  mediaDespesas3m,
  mesesCoberturaSugerido,
  onClose,
}: Props) {
  const token = useSessionToken();
  const criar = useMutation(api.financeiro.metas.criarReservaEmergencia);

  const [meses, setMeses] = useState<number>(mesesCoberturaSugerido);
  const [valorManualStr, setValorManualStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const semHistorico = mediaDespesas3m <= 0;

  const valorAlvoCalculado = useMemo(
    () => mediaDespesas3m * meses,
    [mediaDespesas3m, meses]
  );

  const valorAlvoExibido = useMemo(() => {
    if (semHistorico) return parseBRL(valorManualStr);
    return valorAlvoCalculado;
  }, [semHistorico, valorAlvoCalculado, valorManualStr]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Nao autenticado.");
      return;
    }
    if (semHistorico) {
      const v = parseBRL(valorManualStr);
      if (v <= 0) {
        setError("Informe um valor alvo manual.");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      await criar({
        sessionToken: token,
        mesesCobertura: meses,
        valorAlvoManual: semHistorico ? parseBRL(valorManualStr) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar reserva.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Criar Reserva de Emergencia">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Hero explicativo */}
        <div
          className="rounded-xl p-4 flex gap-3 items-start"
          style={{
            background: `${RESERVA_COR}10`,
            border: `1px solid ${RESERVA_COR}30`,
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${RESERVA_COR}20`, color: RESERVA_COR }}
          >
            <Shield size={20} />
          </div>
          <div className="flex-1 text-sm text-slate-700">
            <div className="font-semibold mb-1" style={{ color: RESERVA_COR }}>
              Sua rede de seguranca financeira
            </div>
            <p className="text-xs leading-relaxed">
              A reserva e um valor guardado para cobrir suas despesas em caso de
              imprevistos. Recomendamos entre <strong>6 e 12 meses</strong> de
              despesas cobertas.
            </p>
          </div>
        </div>

        {/* Slider de meses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="meses-cobertura"
              className="text-sm font-medium text-slate-700"
            >
              Meses de cobertura
            </label>
            <span
              className="font-mono font-bold text-lg"
              style={{ color: RESERVA_COR }}
            >
              {meses} {meses === 1 ? "mes" : "meses"}
            </span>
          </div>
          <input
            id="meses-cobertura"
            type="range"
            min={3}
            max={12}
            step={1}
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
            className="w-full accent-emerald-500"
            aria-label="Meses de cobertura"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>3</span>
            <span>6 (recomendado)</span>
            <span>12</span>
          </div>
        </div>

        {/* Sem historico */}
        {semHistorico ? (
          <div className="space-y-3">
            <div
              className="rounded-lg p-3 flex gap-2 items-start text-xs text-amber-700"
              style={{
                background: "#FEF3C710",
                border: "1px solid #FDE68A",
              }}
              role="note"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Sem dados suficientes — registre algumas despesas primeiro ou
                informe um valor alvo manualmente abaixo.
              </span>
            </div>
            <Input
              label="Valor alvo manual (R$)"
              inputMode="decimal"
              value={valorManualStr}
              onChange={(e) => setValorManualStr(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
        ) : (
          <div
            className="rounded-lg p-3 flex gap-2 items-start text-xs text-slate-700"
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
            }}
          >
            <Info size={14} className="shrink-0 mt-0.5 text-slate-500" />
            <div className="flex-1">
              <div>
                Media das despesas dos ultimos 3 meses:{" "}
                <strong className="font-mono">
                  {formatBRL(mediaDespesas3m)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Preview do valor alvo */}
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: `${RESERVA_COR}10`,
            border: `1px solid ${RESERVA_COR}30`,
          }}
        >
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
            Valor alvo da reserva
          </div>
          <div
            className="font-mono font-extrabold text-3xl mt-1"
            style={{ color: RESERVA_COR }}
          >
            {formatBRL(valorAlvoExibido)}
          </div>
          {!semHistorico && (
            <div className="text-xs text-slate-500 mt-1">
              {formatBRL(mediaDespesas3m)} x {meses}{" "}
              {meses === 1 ? "mes" : "meses"}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Criando..." : "Criar Reserva"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
