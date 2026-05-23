import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "dark";
  size?: "sm" | "md" | "lg";
}

const variantClasses = {
  default:     "bg-coral-500 text-white hover:bg-coral-600 shadow-pop hover:shadow-[0_6px_18px_rgba(255,107,71,0.28)]",
  dark:        "bg-ink-900 text-white hover:bg-ink-800",
  outline:     "border border-cream-300 bg-white text-ink-800 hover:bg-cream-50",
  ghost:       "text-ink-700 hover:bg-cream-100",
  destructive: "bg-ink-900 text-white hover:bg-ink-800",
};

const sizeClasses = {
  sm: "h-9  px-4 text-sm rounded-full",
  md: "h-11 px-5 text-sm rounded-full",
  lg: "h-12 px-6 text-base rounded-full",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
