"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Target,
  History,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
  Check,
  AlertTriangle,
  type LucideIcon,
  Plane,
  Car,
  Home,
  Heart,
  Gift,
  GraduationCap,
  Laptop,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBRL, formatDate } from "@/lib/formatters";
import { AporteRapidoDialog } from "./AporteRapidoDialog";
import { MetaForm } from "./MetaForm";
import type { MetaComAporte } from "../../../convex/financeiro/metas";

const ICONE_MAP: Record<string, LucideIcon> = {
  Target,
  Plane,
  Car,
  Home,
  Heart,
  Gift,
  GraduationCap,
  Laptop,
};

function getIcone(name: string): LucideIcon {
  return ICONE_MAP[name] ?? Target;
}

function formatarMesesRestantes(meses: number): string {
  if (meses <= 0) return "Sem prazo definido";
  if (meses === 1) return "1 mes restante";
  if (meses < 12) return `${meses} meses restantes`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (resto === 0) return anos === 1 ? "1 ano restante" : `${anos} anos restantes`;
  const labelAno = anos === 1 ? "1 ano" : `${anos} anos`;
  const labelMes = resto === 1 ? "1 mes" : `${resto} meses`;
  return `${labelAno} e ${labelMes} restantes`;
}

interface Props {
  meta: MetaComAporte;
}

export function MetaCard({ meta }: Props) {
  const token = useSessionToken();
  const [showAporte, setShowAporte] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const remove = useMutation(api.financeiro.metas.remove);
  const aportes = useQuery(
    api.financeiro.metas.aportes,
    token && showHistorico ? { sessionToken: token, metaId: meta._id } : "skip"
  );

  const Icone = getIcone(meta.icone);
  const pct = Math.round(meta.percentual);

  return (
    <>
      <motion.div
        className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col"
        whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      >
        {/* Hero visual */}
        <div className="relative h-40 w-full" style={{ background: `${meta.cor}15` }}>
          {meta.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.fotoUrl}
              alt={meta.titulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${meta.cor}30 0%, ${meta.cor}10 100%)`,
              }}
            >
              <Icone size={64} style={{ color: meta.cor }} strokeWidth={1.5} />
            </div>
          )}

          {/* Badge de status */}
          {meta.concluida ? (
            <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 shadow">
              <Check size={12} /> Concluida!
            </div>
          ) : meta.prazoVencido ? (
            <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 shadow">
              <AlertTriangle size={12} /> Prazo vencido
            </div>
          ) : null}

          {/* Acoes flutuantes */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-slate-700"
              aria-label="Editar meta"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-danger"
              aria-label="Arquivar meta"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* % de progresso flutuante */}
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 shadow px-2.5 py-1 text-xs font-bold">
            <span style={{ color: meta.cor }}>{pct}%</span>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-5 flex-1 flex flex-col gap-3">
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">{meta.titulo}</h3>
            {meta.descricao && (
              <p className="text-xs text-slate-500 mt-0.5">{meta.descricao}</p>
            )}
          </div>

          {/* Valor atual / alvo */}
          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-bold" style={{ color: meta.cor }}>
                {formatBRL(meta.valorAtual)}
              </span>
              <span className="text-sm text-slate-400">/ {formatBRL(meta.valorAlvo)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: meta.cor }}
                initial={{ width: 0 }}
                animate={{ width: `${meta.percentual}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Prazo + meses restantes */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {meta.prazo ? `Até ${formatDate(meta.prazo)}` : "Sem prazo definido"}
            </span>
            {!meta.semPrazo && (
              <span
                className={`font-medium ${
                  meta.prazoVencido ? "text-amber-600" : "text-slate-600"
                }`}
              >
                {formatarMesesRestantes(meta.mesesRestantes)}
              </span>
            )}
          </div>

          {/* Aporte sugerido em destaque */}
          {!meta.concluida && meta.aporteSugeridoMensal > 0 && (
            <div
              className="rounded-xl p-3"
              style={{
                background: `${meta.cor}10`,
                border: `1px solid ${meta.cor}30`,
              }}
            >
              <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                Aporte sugerido
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-bold text-base" style={{ color: meta.cor }}>
                  {formatBRL(meta.aporteSugeridoMensal)}
                </span>
                <span className="text-xs text-slate-500">
                  /{meta.semPrazo || meta.prazoVencido ? "total" : "mes"}
                </span>
              </div>
            </div>
          )}

          {meta.concluida && (
            <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 font-medium">
                Parabens! Voce atingiu sua meta.
              </span>
            </div>
          )}

          {/* Acoes */}
          <div className="flex gap-2 mt-auto pt-1">
            <Button
              size="sm"
              onClick={() => setShowAporte(true)}
              className="flex-1"
              disabled={meta.concluida}
            >
              <Plus size={14} /> Aporte
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHistorico((v) => !v)}
              aria-label="Historico de aportes"
            >
              <History size={14} />
              {showHistorico ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>
          </div>

          {/* Historico */}
          {showHistorico && (
            <div className="pt-3 border-t">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Historico de aportes
              </h4>
              {aportes === undefined ? (
                <div className="text-xs text-slate-400">Carregando...</div>
              ) : aportes.length === 0 ? (
                <div className="text-xs text-slate-400">Nenhum aporte registrado.</div>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {aportes.map((a) => (
                    <li
                      key={a._id}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: meta.cor }}
                        />
                        <span className="text-xs text-slate-500 shrink-0">
                          {formatDate(a.data)}
                        </span>
                        {a.observacao && (
                          <span className="text-xs text-slate-400 truncate">
                            {a.observacao}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-semibold text-success shrink-0">
                        +{formatBRL(a.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Info aportes -> despesa */}
          <div
            className="rounded-lg bg-indigo-50 border border-indigo-200 p-2 flex gap-2 items-start text-[11px] text-indigo-700"
            role="note"
          >
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              Aportes contam como despesa em <strong>Metas / Poupanca</strong>.
            </span>
          </div>
        </div>
      </motion.div>

      {showAporte && (
        <AporteRapidoDialog
          metaId={meta._id}
          metaTitulo={meta.titulo}
          cor={meta.cor}
          aporteSugerido={meta.aporteSugeridoMensal}
          onClose={() => setShowAporte(false)}
        />
      )}

      {showEdit && <MetaForm meta={meta} onClose={() => setShowEdit(false)} />}

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (token) remove({ sessionToken: token, id: meta._id });
        }}
        title="Arquivar meta"
        description="A meta sera desativada. Os aportes serao mantidos."
        confirmLabel="Arquivar"
      />
    </>
  );
}
