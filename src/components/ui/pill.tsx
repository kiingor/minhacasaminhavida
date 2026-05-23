import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "coral" | "dark" | "soft";
type Size = "xs" | "sm";

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-cream-100 text-ink-700",
  coral:   "bg-coral-100 text-coral-700",
  dark:    "bg-ink-900 text-white",
  soft:    "bg-white text-ink-500 border border-cream-200",
};

const sizeClasses: Record<Size, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2.5 py-1 text-xs",
};

export function Pill({ className, tone = "neutral", size = "sm", ...props }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
