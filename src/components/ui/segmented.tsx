"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: Option<T>[];
  className?: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({
  value, onChange, options, className, size = "md",
}: SegmentedProps<T>) {
  const sizeClass = size === "sm" ? "h-9 text-xs" : "h-11 text-sm";
  return (
    <div className={cn(
      "relative inline-flex items-center bg-cream-100 p-1 rounded-full",
      sizeClass,
      className
    )}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 px-4 h-full rounded-full font-medium transition-colors",
              active ? "text-white" : "text-ink-500 hover:text-ink-800"
            )}
          >
            {active && (
              <motion.div
                layoutId="segmented-active"
                className="absolute inset-0 bg-ink-900 rounded-full shadow-soft -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
