"use client";
import { useState, useRef, useEffect } from "react";
import { Pencil, Loader2, Trash2 } from "lucide-react";
import { formatBRL, parseBRL } from "@/lib/formatters";

interface Props {
  valorLimite: number; // centavos
  onSave: (novoValor: number) => Promise<void> | void;
  /** Callback de remoção (salva valor=0 que deleta no backend). Opcional. */
  onRemove?: () => Promise<void> | void;
  /** Quando true, mostra "Definir limite" no lugar do valor zero. */
  semLimite?: boolean;
  /** Tamanho do texto. */
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function OrcamentoLimiteEditor({
  valorLimite,
  onSave,
  onRemove,
  semLimite,
  size = "md",
  ariaLabel,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  function abrir() {
    setTexto(valorLimite > 0 ? (valorLimite / 100).toFixed(2).replace(".", ",") : "");
    setEditando(true);
  }

  async function salvar() {
    const novoValor = parseBRL(texto);
    if (novoValor === valorLimite) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    try {
      await onSave(novoValor);
    } finally {
      setSalvando(false);
      setEditando(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      salvar();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditando(false);
    }
  }

  async function remover() {
    if (!onRemove) return;
    if (!window.confirm("Remover este limite?")) return;
    setRemovendo(true);
    try {
      await onRemove();
    } finally {
      setRemovendo(false);
    }
  }

  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (editando) {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-xs text-slate-400">R$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvar}
          onKeyDown={onKeyDown}
          disabled={salvando}
          aria-label={ariaLabel ?? "Valor do limite"}
          className={`${textSize} font-mono w-24 border-b border-primary bg-transparent outline-none focus:border-primary text-right`}
        />
        {salvando && <Loader2 size={12} className="animate-spin text-primary" />}
      </div>
    );
  }

  if (semLimite) {
    return (
      <button
        type="button"
        onClick={abrir}
        className={`${textSize} text-primary hover:underline inline-flex items-center gap-1`}
        aria-label={ariaLabel ?? "Definir limite"}
      >
        <Pencil size={12} /> Definir limite
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={abrir}
        className={`${textSize} font-mono font-semibold text-slate-800 hover:text-primary inline-flex items-center gap-1`}
        aria-label={ariaLabel ?? `Editar limite ${formatBRL(valorLimite)}`}
      >
        {formatBRL(valorLimite)}
        <Pencil size={11} className="text-slate-400" />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={remover}
          disabled={removendo}
          className="text-slate-400 hover:text-danger hover:bg-danger/10 rounded p-0.5 transition-colors disabled:opacity-50"
          aria-label="Remover limite"
          title="Remover limite"
        >
          {removendo ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      )}
    </span>
  );
}
