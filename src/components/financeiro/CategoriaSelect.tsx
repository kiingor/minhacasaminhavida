"use client";
import { useMemo } from "react";
import { Id } from "../../../convex/_generated/dataModel";

interface Categoria {
  _id: Id<"categorias">;
  nome: string;
  tipo: "despesa" | "receita";
  categoriaPaiId?: Id<"categorias">;
}

interface Props {
  categorias: Categoria[] | undefined;
  value: Id<"categorias"> | "";
  onChange: (id: Id<"categorias"> | "") => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
}

/**
 * Select que renderiza categorias em arvore: maes em primeiro nivel,
 * filhas indentadas logo abaixo do pai. Filhas orfas (pai removido)
 * aparecem como categorias de primeiro nivel ao final.
 */
export function CategoriaSelect({
  categorias,
  value,
  onChange,
  required,
  disabled,
  className,
  id,
  ariaLabel,
  placeholder = "Selecione...",
}: Props) {
  const opcoes = useMemo(() => {
    if (!categorias) return [];
    const maes = categorias
      .filter((c) => !c.categoriaPaiId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const porPai = new Map<string, Categoria[]>();
    for (const c of categorias) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!porPai.has(k)) porPai.set(k, []);
        porPai.get(k)!.push(c);
      }
    }
    for (const arr of porPai.values())
      arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    type Item = { _id: Id<"categorias">; label: string; nivel: 1 | 2 };
    const out: Item[] = [];
    for (const m of maes) {
      out.push({ _id: m._id, label: m.nome, nivel: 1 });
      const filhas = porPai.get(m._id as string) ?? [];
      for (const f of filhas) {
        // U+2007 (figure space) e U+2192 (seta) para indentar de forma legível
        out.push({ _id: f._id, label: `    ↳ ${f.nome}`, nivel: 2 });
      }
    }
    // Órfãs no final
    const idsMaes = new Set(maes.map((m) => m._id as string));
    const orfas = categorias.filter(
      (c) => c.categoriaPaiId && !idsMaes.has(c.categoriaPaiId as string)
    );
    for (const o of orfas) {
      out.push({ _id: o._id, label: o.nome, nivel: 1 });
    }
    return out;
  }, [categorias]);

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as Id<"categorias"> | "")}
      required={required}
      disabled={disabled}
      className={
        className ?? "h-10 rounded-lg border border-slate-300 px-3 text-sm"
      }
    >
      <option value="">{placeholder}</option>
      {opcoes.map((o) => (
        <option key={o._id} value={o._id} style={o.nivel === 1 ? { fontWeight: 600 } : undefined}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
