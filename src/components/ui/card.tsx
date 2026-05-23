import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "white" | "cream" | "dark" | "coral";
type Padding = "none" | "sm" | "md" | "lg";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padding?: Padding;
  interactive?: boolean;
  as?: React.ElementType;
}

const toneClasses: Record<Tone, string> = {
  white: "bg-white text-ink-900",
  cream: "bg-cream-50 text-ink-900",
  dark:  "bg-ink-900 text-white",
  coral: "bg-coral-500 text-white",
};

const padClasses: Record<Padding, string> = {
  none: "p-0",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-8",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone = "white", padding = "md", interactive = false, as, ...props }, ref) => {
    const Comp = as ?? "div";
    return (
      <Comp
        ref={ref}
        className={cn(
          "rounded-3xl shadow-soft transition-all",
          toneClasses[tone],
          padClasses[padding],
          interactive && "hover:shadow-card hover:-translate-y-0.5 cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
