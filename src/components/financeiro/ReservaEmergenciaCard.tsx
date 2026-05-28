"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { Shield, Plus, Pencil, Sparkles, Check, Info, Trash2, Loader2, AlertTriangle } from "lucide-react";
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
  const token = useSessionToken();
  const removerMeta = useMutation(api.financeiro.metas.remove);
  const [showCriar, setShowCriar] = useState(false);
  const [showAporte, setShowAporte] = useState(false);
  const [showEditMeses, setShowEditMeses] = useState(false);
  const [showConfirmExcluir, setShowConfirmExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");

  async function confirmarExclusao() {
    if (!info.meta || !token) return;
    setExcluindo(true);
    setErroExcluir("");
    try {
      await removerMeta({ sessionToken: token, id: info.meta._id });
      setShowConfirmExcluir(false);
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : "Erro ao excluir reserva");
    } finally {
      setExcluindo(false);
    }
  }

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

          <div className="shrink-0 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowEditMeses(true)}
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center text-slate-700 transition-colors"
              aria-label="Editar meses de cobertura"
              title="Editar meses de cobertura"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => { setErroExcluir(""); setShowConfirmExcluir(true); }}
              disabled={excluindo}
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-rose-50 hover:text-rose-600 shadow-sm flex items-center justify-center text-slate-500 transition-colors disabled:opacity-50"
              aria-label="Excluir reserva"
              title="Excluir reserva"
            >
              {excluindo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
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

      <ConfirmarExclusaoReservaDialog
        open={showConfirmExcluir}
        onClose={() => !excluindo && setShowConfirmExcluir(false)}
        onConfirm={confirmarExclusao}
        valorAtual={meta.valorAtual}
        valorAlvo={meta.valorAlvo}
        excluindo={excluindo}
        erro={erroExcluir}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Confirmação de exclusão — modal customizado (substitui window.confirm)
// --------------------------------------------------------------------------
interface ConfirmarExclusaoProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  valorAtual: number;
  valorAlvo: number;
  excluindo: boolean;
  erro: string;
}

function ConfirmarExclusaoReservaDialog({
  open,
  onClose,
  onConfirm,
  valorAtual,
  valorAlvo,
  excluindo,
  erro,
}: ConfirmarExclusaoProps) {
  const temAportes = valorAtual > 0;
  return (
    <Dialog open={open} onClose={onClose} title="Excluir Reserva de Emergência?">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-coral-200 bg-coral-50/60 p-4">
          <div className="w-10 h-10 rounded-full bg-coral-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900">
              Essa ação remove a meta de reserva do dashboard.
            </p>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              O valor alvo deixa de ser exibido. Aportes já registrados são
              <strong> preservados no histórico</strong> (a meta fica desativada,
              não apagada do banco — dá pra restaurar por suporte se precisar).
            </p>
          </div>
        </div>

        {temAportes && (
          <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-xs text-ink-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Aportes acumulados</span>
              <span className="font-mono font-bold text-ink-900">
                {formatBRL(valorAtual)} <span className="text-ink-400 font-normal">/ {formatBRL(valorAlvo)}</span>
              </span>
            </div>
            <p className="text-[11px] text-ink-500 mt-1.5">
              Esses aportes continuam no histórico mesmo após a exclusão.
            </p>
          </div>
        )}

        {erro && (
          <div className="rounded-lg bg-coral-100 border border-coral-300 p-3 text-sm text-coral-700">
            {erro}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={excluindo}
            className="flex-1 h-11 rounded-full border border-cream-200 text-sm font-semibold text-ink-700 hover:bg-cream-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={excluindo}
            className="flex-1 h-11 rounded-full bg-coral-500 hover:bg-coral-600 text-white text-sm font-semibold shadow-pop disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors"
          >
            {excluindo ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={14} /> Excluir reserva
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
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
