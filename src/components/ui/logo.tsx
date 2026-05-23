import { cn } from "@/lib/utils";

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Ícone customizado de casa, sólido, com porta arqueada integrada.
 * Usa currentColor — herda cor do parent.
 */
export function HomeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M12.7 2.3a1 1 0 0 0-1.4 0L1.6 12a1 1 0 0 0 1.4 1.4l.5-.5v7.6a1.5 1.5 0 0 0 1.5 1.5h4.5v-7a2.5 2.5 0 0 1 5 0v7H19a1.5 1.5 0 0 0 1.5-1.5v-7.6l.5.5A1 1 0 0 0 22.4 12L12.7 2.3Z"
      />
    </svg>
  );
}

interface LogoProps extends IconProps {
  /** Tamanho do círculo externo (default 40). O ícone dentro escala ~55%. */
  size?: number;
  /** Tom: dark = círculo preto + ícone coral (default). coral = inverso. */
  tone?: "dark" | "coral" | "ghost";
}

/**
 * Logo completo: círculo preto com ícone de casa coral dentro.
 * Substitui o antigo monograma "N°".
 */
export function Logo({ size = 40, tone = "dark", className }: LogoProps) {
  const iconSize = Math.round(size * 0.55);
  const toneClass =
    tone === "coral" ? "bg-coral-500 text-white"
    : tone === "ghost" ? "bg-transparent text-ink-900"
    : "bg-ink-900 text-coral-500";

  return (
    <div
      className={cn("rounded-full flex items-center justify-center shrink-0", toneClass, className)}
      style={{ width: size, height: size }}
    >
      <HomeIcon size={iconSize} />
    </div>
  );
}
