import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-2xl border border-cream-200 bg-white px-4 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-300",
            "focus:border-coral-400 focus:ring-4 focus:ring-coral-100",
            error && "border-ink-800 focus:border-ink-800 focus:ring-ink-100",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-ink-800 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
