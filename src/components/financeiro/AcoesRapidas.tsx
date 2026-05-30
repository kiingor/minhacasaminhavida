"use client";
import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
} from "lucide-react";
import { DespesaForm } from "./DespesaForm";
import { ReceitaForm } from "./ReceitaForm";
import { TransferenciaForm } from "./TransferenciaForm";

type FormAberto = "despesa" | "receita" | "transferencia" | null;

export function AcoesRapidas() {
  const [aberto, setAberto] = useState<FormAberto>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <BotaoAcao label="Nova despesa" Icon={ArrowDownCircle} onClick={() => setAberto("despesa")} />
        <BotaoAcao label="Nova receita" Icon={ArrowUpCircle} onClick={() => setAberto("receita")} />
        <BotaoAcao
          label="Transferência"
          Icon={ArrowLeftRight}
          onClick={() => setAberto("transferencia")}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {aberto === "despesa" && <DespesaForm onClose={() => setAberto(null)} />}
      {aberto === "receita" && <ReceitaForm onClose={() => setAberto(null)} />}
      {aberto === "transferencia" && <TransferenciaForm onClose={() => setAberto(null)} />}
    </>
  );
}

function BotaoAcao({
  label, Icon, onClick, className,
}: {
  label: string;
  Icon: typeof ArrowDownCircle;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border border-cream-200 bg-white text-sm font-medium text-ink-700 hover:bg-cream-50 hover:border-coral-300 transition-colors ${className ?? ""}`}
    >
      <Icon size={16} className="text-ink-700 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
