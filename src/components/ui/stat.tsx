"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  tone?: "white" | "cream" | "dark" | "coral";
  align?: "left" | "center";
  className?: string;
  onClick?: () => void;
}

const trendIcon = { up: ArrowUpRight, down: ArrowDownRight, neutral: Minus };

const toneClasses = {
  white: "bg-white text-ink-900",
  cream: "bg-cream-50 text-ink-900",
  dark:  "bg-ink-900 text-white",
  coral: "bg-coral-500 text-white",
};

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = "white",
  align = "left",
  className,
  onClick,
}: StatProps) {
  const TrendIcon = trend ? trendIcon[trend] : null;
  const onDark = tone === "dark" || tone === "coral";
  return (
    <motion.div
      whileHover={onClick ? { y: -3 } : undefined}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className={cn(
        "rounded-3xl p-5 shadow-soft",
        toneClasses[tone],
        onClick && "cursor-pointer hover:shadow-card",
        align === "center" && "text-center",
        className
      )}
    >
      <div className={cn("flex items-center gap-2", align === "center" ? "justify-center" : "justify-between")}>
        <div className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.12em]",
          onDark ? "text-white/70" : "text-ink-400"
        )}>
          {label}
        </div>
        {Icon && (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            onDark ? "bg-white/10" : "bg-cream-100 text-ink-700"
          )}>
            <Icon size={15} />
          </div>
        )}
      </div>

      <div className={cn(
        "font-display font-bold mt-2 leading-tight",
        typeof value === "string" && value.length > 14 ? "text-2xl" : "text-3xl"
      )}>
        {value}
      </div>

      {(hint || TrendIcon) && (
        <div className={cn(
          "flex items-center gap-1.5 mt-2 text-xs",
          onDark ? "text-white/70" : "text-ink-400"
        )}>
          {TrendIcon && (
            <span className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-full",
              onDark ? "bg-white/10" : "bg-cream-100"
            )}>
              <TrendIcon size={11} />
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </motion.div>
  );
}
