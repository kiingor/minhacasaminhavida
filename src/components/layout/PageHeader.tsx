"use client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Href de voltar — se omitido, não renderiza o botão. */
  backHref?: string;
  /** aria-label do botão voltar. Default: "Voltar". */
  backLabel?: string;
  /** Título principal (grande). */
  title: string;
  /** Subtítulo abaixo do título. */
  subtitle?: string;
  /** Slot direito (MonthSelector, botões de ação, etc.). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header compacto pra páginas internas — ícone de voltar circular ao lado
 * do título, sem breadcrumb/eyebrow redundantes. Substitui o padrão antigo
 * "< Finanças / EXTRATO — Unificado / Lançamentos".
 */
export function PageHeader({
  backHref,
  backLabel = "Voltar",
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 md:gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-cream-200 text-ink-700 hover:bg-cream-50 hover:border-coral-300 hover:text-coral-600 transition-colors shadow-soft"
            >
              <ChevronLeft size={18} />
            </Link>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink-900 leading-tight tracking-tight truncate">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-sm text-ink-500 mt-1 md:ml-[52px]">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 items-center shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
