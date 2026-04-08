"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Target } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBRL, parseBRL, formatDate } from "@/lib/formatters";

interface Props { meta: Doc<"metas">; }

export function MetaCard({ meta }: Props) {
  const token = useSessionToken();
  const [showAporte, setShowAporte] = useState(false);
  const [aporteValor, setAporteValor] = useState("");
  const [obs, setObs] = useState("");
  const addAporte = useMutation(api.financeiro.metas.addAporte);
  const remove = useMutation(api.financeiro.metas.remove);

  const pct = Math.min((meta.valorAtual / meta.valorAlvo) * 100, 100);
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  async function onAporte(e: React.FormEvent) {
    e.preventDefault();
    const v = parseBRL(aporteValor);
    if (v <= 0 || !token) return;
    await addAporte({ sessionToken: token, metaId: meta._id, valor: v, observacao: obs || undefined });
    setAporteValor("");
    setObs("");
    setShowAporte(false);
  }

  return (
    <>
      <motion.div
        className="rounded-2xl bg-white border p-5 shadow-sm flex gap-5 items-center"
        whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      >
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={meta.cor}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Target size={20} style={{ color: meta.cor }} />
            <span className="font-gamer font-bold text-lg mt-1">{Math.round(pct)}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg truncate">{meta.titulo}</h3>
          {meta.descricao && <p className="text-xs text-slate-500 truncate">{meta.descricao}</p>}
          <div className="mt-2 space-y-0.5 text-sm">
            <div className="font-mono text-slate-800">
              <span className="font-semibold" style={{ color: meta.cor }}>{formatBRL(meta.valorAtual)}</span>
              <span className="text-slate-400"> / {formatBRL(meta.valorAlvo)}</span>
            </div>
            <div className="text-xs text-slate-500">Até {formatDate(meta.prazo)}</div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => setShowAporte(true)}><Plus size={14} /> Aportar</Button>
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => token && remove({ sessionToken: token, id: meta._id })}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </motion.div>

      {showAporte && (
        <Dialog open onClose={() => setShowAporte(false)} title={`Aportar em: ${meta.titulo}`}>
          <form onSubmit={onAporte} className="space-y-3">
            <Input label="Valor (R$)" value={aporteValor} onChange={(e) => setAporteValor(e.target.value)} autoFocus required />
            <Input label="Observação (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAporte(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1">Aportar</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
