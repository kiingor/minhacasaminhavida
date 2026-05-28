"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption<V extends string = string> {
  value: V;
  label: string;
  /** Texto secundário (subtítulo) opcional — ex: nome do banco */
  hint?: string;
  /** Cor opcional pra mostrar um chip colorido à esquerda (ex: categoria) */
  cor?: string;
  /** Ícone React opcional (renderizado à esquerda do label) */
  icon?: React.ReactNode;
}

interface Props<V extends string = string> {
  options: SearchableSelectOption<V>[];
  value: V | "";
  onChange: (v: V | "") => void;
  placeholder?: string;
  /** Mostrar opção "Nenhum" no topo (value = "") */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Altura da caixa principal */
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Mensagem quando lista vazia */
  emptyResult?: string;
}

/**
 * Combobox com busca. Substitui <select> nativo quando a lista é longa.
 * - Type-ahead filtra por label e hint
 * - Esc/click fora fecha
 * - Setas + Enter pra navegação por teclado
 */
export function SearchableSelect<V extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  allowEmpty = false,
  emptyLabel = "Nenhum",
  size = "md",
  disabled = false,
  className,
  ariaLabel,
  emptyResult = "Nenhum resultado",
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [destaqueIdx, setDestaqueIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.hint ?? "").toLowerCase().includes(term)
    );
  }, [options, busca]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Foca input quando abre
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setDestaqueIdx(0);
    }
  }, [open]);

  function selecionar(v: V | "") {
    onChange(v);
    setOpen(false);
    setBusca("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaqueIdx((i) => Math.min(i + 1, filtradas.length - 1 + (allowEmpty ? 1 : 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaqueIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const offset = allowEmpty ? 1 : 0;
      if (allowEmpty && destaqueIdx === 0) {
        selecionar("");
      } else {
        const opt = filtradas[destaqueIdx - offset];
        if (opt) selecionar(opt.value);
      }
    }
  }

  const heightClass = size === "sm" ? "h-9 text-xs" : "h-10 text-sm";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full inline-flex items-center justify-between gap-2 px-3 rounded-lg border border-cream-300 bg-white text-left transition-colors",
          "hover:border-cream-400 focus:outline-none focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          heightClass
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selected ? (
            <>
              {selected.cor && (
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: selected.cor }}
                  aria-hidden
                />
              )}
              {selected.icon}
              <span className="truncate text-ink-900">{selected.label}</span>
              {selected.hint && (
                <span className="text-ink-400 text-[11px] truncate">· {selected.hint}</span>
              )}
            </>
          ) : (
            <span className="text-ink-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={cn("text-ink-400 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-white border border-cream-300 shadow-card overflow-hidden">
          {/* Search */}
          <div className="relative border-b border-cream-200">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setDestaqueIdx(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar..."
              className="w-full h-9 pl-8 pr-8 text-sm bg-transparent focus:outline-none"
              aria-label="Buscar opção"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-cream-100"
                aria-label="Limpar busca"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Lista */}
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {allowEmpty && (
              <Item
                ativo={value === ""}
                destacado={destaqueIdx === 0}
                onClick={() => selecionar("")}
                label={emptyLabel}
                tom="muted"
              />
            )}
            {filtradas.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-ink-400">{emptyResult}</li>
            ) : (
              filtradas.map((opt, idx) => {
                const realIdx = allowEmpty ? idx + 1 : idx;
                return (
                  <Item
                    key={opt.value}
                    ativo={opt.value === value}
                    destacado={destaqueIdx === realIdx}
                    onClick={() => selecionar(opt.value)}
                    label={opt.label}
                    hint={opt.hint}
                    cor={opt.cor}
                    icon={opt.icon}
                  />
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Item({
  ativo,
  destacado,
  onClick,
  label,
  hint,
  cor,
  icon,
  tom,
}: {
  ativo: boolean;
  destacado: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  cor?: string;
  icon?: React.ReactNode;
  tom?: "muted";
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left px-3 py-2 inline-flex items-center gap-2 text-sm transition-colors",
          destacado ? "bg-cream-100" : "hover:bg-cream-50",
          tom === "muted" && "text-ink-500"
        )}
        role="option"
        aria-selected={ativo}
      >
        {cor && (
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: cor }}
            aria-hidden
          />
        )}
        {icon}
        <span className="flex-1 truncate text-ink-900">{label}</span>
        {hint && <span className="text-[11px] text-ink-400 truncate">{hint}</span>}
        {ativo && <Check size={14} className="text-coral-500 shrink-0" />}
      </button>
    </li>
  );
}
