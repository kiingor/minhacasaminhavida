import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "dark" | "coral" | "ghost";
type Size = "sm" | "md" | "lg";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  "aria-label": string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-white text-ink-700 hover:bg-cream-100 shadow-soft",
  dark:    "bg-ink-900 text-white hover:bg-ink-800 shadow-soft",
  coral:   "bg-coral-500 text-white hover:bg-coral-600 shadow-pop",
  ghost:   "bg-transparent text-ink-500 hover:bg-cream-100 hover:text-ink-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-12 h-12",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
