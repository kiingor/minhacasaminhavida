"use client";
import * as React from "react";
import Link from "next/link";
import { ExternalLink, BookOpen } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { getTermo, type TermoFinanceiro } from "@/lib/educacao/termos";
import { cn } from "@/lib/utils";

interface TermoTooltipProps {
  /** Chave do termo (ex: "pgbl", "selic") ou alias. */
  termo: string;
  /** Texto exibido — se omitido, usa o nome canonico do termo. */
  children?: React.ReactNode;
  /** Classe extra para o wrapper. */
  className?: string;
}

/**
 * Envolve um termo tecnico com tooltip educacional.
 *
 * - Desktop (hover): balao com definicao
 * - Mobile (tap): abre Dialog com definicao + link "Saiba mais"
 *
 * Se o termo nao for encontrado na biblioteca, renderiza apenas o conteudo
 * (children ou termo) sem decoracao — fail-safe.
 *
 * Exemplo:
 *   <TermoTooltip termo="pgbl">PGBL</TermoTooltip>
 *   <TermoTooltip termo="selic" />
 */
export function TermoTooltip({ termo, children, className }: TermoTooltipProps) {
  const [openDialog, setOpenDialog] = React.useState(false);
  const definicao = React.useMemo(() => getTermo(termo), [termo]);

  // Termo desconhecido — renderiza apenas o conteudo sem decoracao.
  if (!definicao) {
    return <>{children ?? termo}</>;
  }

  const label = children ?? definicao.nome;

  return (
    <>
      <span className={cn("relative inline-block group", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenDialog(true);
          }}
          className="inline cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2 hover:decoration-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:rounded transition-colors"
          aria-label={`Ver definicao de ${definicao.nome}`}
        >
          {label}
        </button>

        {/* Tooltip desktop (hover) — escondido em mobile (touch nao tem hover) */}
        <span
          role="tooltip"
          className="
            pointer-events-none invisible group-hover:visible
            absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2
            w-64 max-w-[80vw]
            rounded-lg bg-slate-900 text-white text-xs leading-relaxed
            p-3 shadow-xl
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            hidden md:block
          "
        >
          <span className="block font-semibold text-white mb-1">
            {definicao.nome}
          </span>
          <span className="block text-slate-200">{definicao.definicao}</span>
          {definicao.saibaMais && (
            <span className="block mt-1.5 text-primary font-medium">
              Toque para saber mais →
            </span>
          )}
          {/* Seta */}
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
        </span>
      </span>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title={definicao.nome}
        className="max-w-md"
      >
        <DefinicaoBody termo={definicao} onClose={() => setOpenDialog(false)} />
      </Dialog>
    </>
  );
}

function DefinicaoBody({
  termo,
  onClose,
}: {
  termo: TermoFinanceiro;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-slate-700 leading-relaxed">{termo.definicao}</p>

      {termo.saibaMais && (
        <Link
          href={termo.saibaMais}
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-2.5 text-primary font-medium transition-colors"
        >
          <BookOpen size={16} />
          <span className="flex-1">Saiba mais</span>
          <ExternalLink size={14} />
        </Link>
      )}

      <Link
        href="/aprender"
        onClick={onClose}
        className="block text-center text-xs text-slate-500 hover:text-primary hover:underline"
      >
        Ver todos os termos e artigos
      </Link>
    </div>
  );
}
