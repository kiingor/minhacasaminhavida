"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { Shield, Plus, Pencil, Sparkles, Check, Info } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/formatters";
import { AporteRapidoDialog } from "./AporteRapidoDialog";
import { CriarReservaDialog } from "./CriarReservaDialog";
import type { ReservaEmergenciaInfo } from "../../../convex/financeiro/metas";

const RESERVA_COR = "#10B981";
const RESERVA_COR_DARK = "#047857";

interface Props {
  info: ReservaEmergenciaInfo;
}

export function ReservaEmergenciaCard({ info }: Props) {
  const [showCriar, setShowCriar] = useState(false);
  const [showAporte, setShowAporte] = useState(false);
  const [showEditMeses, setShowEditMeses] = useState(false);

  if (!info.meta) {
    return (
      <>
        <ReservaEmptyState
          mediaDespesas3m={info.mediaDespesas3m}
          mesesCoberturaSugerido={info.mesesCoberturaSugerido}
          valorAlvoSugerido={info.valorAlvoSugerido}
          onCriar={() => setShowCriar(true)}
        />
        {showCriar && (
          <CriarReservaDialog
            mediaDespesas3m={info.mediaDespesas3m}
            mesesCoberturaSugerido={info.mesesCoberturaSugerido}
            onClose={() => setShowCriar(false)}
          />
        )}
      </>
    );
  }

  const meta = info.meta;
  const pct = Math.round(meta.percentual);
  const atingida = meta.valorAtual >= meta.valorAlvo;

  return (
    <>
      <motion.section
        className="relative rounded-2xl overflow-hidden shadow-md border"
        style={{
          background: `linear-gradient(135deg, ${RESERVA_COR}18 0%, ${RESERVA_COR}05 60%, #ffffff 100%)`,
          borderColor: `${RESERVA_COR}40`,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        aria-label="Reserva de Emergencia"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${RESERVA_COR} 0%, ${RESERVA_COR_DARK} 100%)`,
              }}
            >
              <Shield size={24} className="text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-extrabold text-xl text-slate-900 leading-tight">
                  Reserva de Emergencia
                </h2>
                <span
                  className="inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2 py-0.5 shadow-sm"
                  style={{
                    background: `${RESERVA_COR}20`,
                    color: RESERVA_COR_DARK,
                    border: `1px solid ${RESERVA_COR}40`,
                  }}
                >
                  <Sparkles size={10} /> Especial
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {meta.mesesCobertura ?? info.mesesCoberturaSugerido}{" "}
                {(meta.mesesCobertura ?? info.mesesCoberturaSugerido) === 1
                  ? "mes"
                  : "meses"}{" "}
                de despesas cobertas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEditMeses(true)}
            className="shrink-0 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Editar meses de cobertura"
          >
            <Pencil size={14} />
          </button>
        </div>

        {/* Hero / Valores */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-baseline gap-2 flex-wrap font-mono">
            <span
              className="text-3xl sm:text-4xl font-extrabold"
              style={{ color: RESERVA_COR_DARK }}
            >
              {formatBRL(meta.valorAtual)}
            </span>
            <span className="text-base text-slate-500">
              / {formatBRL(meta.valorAlvo)}
            </span>
          </div>

          {/* Barra progresso */}
          <div className="mt-3 h-3 rounded-full bg-white/70 overflow-hidden border border-emerald-100">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${RESERVA_COR} 0%, ${RESERVA_COR_DARK} 100%)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${meta.percentual}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-between text-xs mt-1.5">
            <span className="text-slate-500">{pct}% concluido</span>
            {atingida ? (
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: RESERVA_COR_DARK }}
              >
                <Check size={12} /> Meta atingida!
              </span>
            ) : (
              <span className="text-slate-500">
                Faltam{" "}
                <strong className="font-mono text-slate-700">
                  {formatBRL(Math.max(0, meta.valorAlvo - meta.valorAtual))}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Metricas */}
        <div className="grid grid-cols-2 gap-2 px-5 pb-4">
          <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
              Aporte sugerido
            </div>
            <div
              className="font-mono font-bold text-base mt-0.5"
              style={{ color: RESERVA_COR_DARK }}
            >
              {atingida ? "—" : formatBRL(info.aporteSugerido)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {atingida
                ? "Reserva concluida"
                : info.mesesRestantes > 0
                ? `em ${info.mesesRestantes} ${
                    info.mesesRestantes === 1 ? "mes" : "meses"
                  }`
                : "para concluir"}
            </div>
          </div>
          <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
              Media de despesas
            </div>
            <div className="font-mono font-bold text-base text-slate-800 mt-0.5">
              {info.mediaDespesas3m > 0
                ? formatBRL(info.mediaDespesas3m)
                : "—"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ultimos 3 meses
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          <Button
            onClick={() => setShowAporte(true)}
            disabled={atingida}
            className="w-full"
            style={
              atingida
                ? undefined
                : {
                    background: `linear-gradient(135deg, ${RESERVA_COR} 0%, ${RESERVA_COR_DARK} 100%)`,
                  }
            }
          >
            <Plus size={16} /> Adicionar aporte
          </Button>
        </div>
      </motion.section>

      {showAporte && (
        <AporteRapidoDialog
          metaId={meta._id}
          metaTitulo={meta.titulo}
          cor={RESERVA_COR}
          aporteSugerido={info.aporteSugerido}
          onClose={() => setShowAporte(false)}
        />
      )}

      {showEditMeses && (
        <EditarMesesDialog
          metaId={meta._id}
          mesesAtual={meta.mesesCobertura ?? info.mesesCoberturaSugerido}
          mediaDespesas3m={info.mediaDespesas3m}
          onClose={() => setShowEditMeses(false)}
        />
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Empty state — sem reserva criada ainda
// --------------------------------------------------------------------------
interface EmptyProps {
  mediaDespesas3m: number;
  mesesCoberturaSugerido: number;
  valorAlvoSugerido: number;
  onCriar: () => void;
}

function ReservaEmptyState({
  mediaDespesas3m,
  mesesCoberturaSugerido,
  valorAlvoSugerido,
  onCriar,
}: EmptyProps) {
  const semHistorico = mediaDespesas3m <= 0;
  return (
    <motion.section
      className="relative rounded-2xl overflow-hidden shadow-md border-2 border-dashed p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${RESERVA_COR}10 0%, ${RESERVA_COR}03 100%)`,
        borderColor: `${RESERVA_COR}50`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="Criar reserva de emergencia"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${RESERVA_COR} 0%, ${RESERVA_COR_DARK} 100%)`,
          }}
        >
          <Shield size={28} className="text-white" strokeWidth={2.2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="font-display font-extrabold text-xl text-slate-900 leading-tight">
              Reserva de Emergencia
            </h2>
            <span
              className="inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2 py-0.5"
              style={{
                background: `${RESERVA_COR}20`,
                color: RESERVA_COR_DARK,
              }}
            >
              <Sparkles size={10} /> Especial
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Sua rede de seguranca para imprevistos.
          </p>

          <div className="mt-3 flex items-start gap-2 text-xs text-slate-700">
            <Info size={13} className="shrink-0 mt-0.5 text-slate-500" />
            {semHistorico ? (
              <span>
                Sem dados de despesas suficiente. Voce pode criar a reserva
                informando um valor alvo manual.
              </span>
            ) : (
              <span>
                Recomendado: <strong>{mesesCoberturaSugerido} meses</strong> de
                despesas (atual:{" "}
                <strong className="font-mono">
                  {formatBRL(mediaDespesas3m)}
                </strong>
                /mes).{" "}
                {valorAlvoSugerido > 0 && (
                  <>
                    Sugestao:{" "}
                    <strong className="font-mono" style={{ color: RESERVA_COR_DARK }}>
                      {formatBRL(valorAlvoSugerido)}
                    </strong>
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={onCriar}
          className="w-full sm:w-auto shrink-0"
          style={{
            background: `linear-gradient(135deg, ${RESERVA_COR} 0%, ${RESERVA_COR_DARK} 100%)`,
          }}
        >
          <Plus size={16} /> Criar reserva
        </Button>
      </div>
    </motion.section>
  );
}

// --------------------------------------------------------------------------
// Editar meses de cobertura (recalcula valor alvo)
// --------------------------------------------------------------------------
interface EditarMesesProps {
  metaId: import("../../../convex/_generated/dataModel").Id<"metas">;
  mesesAtual: number;
  mediaDespesas3m: number;
  onClose: () => void;
}

function EditarMesesDialog({
  metaId,
  mesesAtual,
  mediaDespesas3m,
  onClose,
}: EditarMesesProps) {
  const token = useSessionToken();
  const atualizar = useMutation(api.financeiro.metas.atualizarMesesCobertura);

  const [meses, setMeses] = useState<number>(mesesAtual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMeses(mesesAtual), [mesesAtual]);

  const novoValorAlvo = mediaDespesas3m * meses;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Nao autenticado.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await atualizar({
        sessionToken: token,
        metaId,
        mesesCobertura: meses,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Ajustar cobertura da reserva">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="meses-edit"
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
            id="meses-edit"
            type="range"
            min={3}
            max={12}
            step={1}
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>3</span>
            <span>6</span>
            <span>12</span>
          </div>
        </div>

        {mediaDespesas3m > 0 ? (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: `${RESERVA_COR}10`,
              border: `1px solid ${RESERVA_COR}30`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
              Novo valor alvo
            </div>
            <div
              className="font-mono font-extrabold text-2xl mt-1"
              style={{ color: RESERVA_COR }}
            >
              {formatBRL(novoValorAlvo)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {formatBRL(mediaDespesas3m)} x {meses}{" "}
              {meses === 1 ? "mes" : "meses"}
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg p-3 flex gap-2 items-start text-xs text-amber-700 border"
            style={{
              background: "#FEF3C710",
              borderColor: "#FDE68A",
            }}
          >
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              Sem historico de despesas — apenas a quantidade de meses sera
              atualizada. O valor alvo permanece como esta.
            </span>
          </div>
        )}

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
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
