"use client";
import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md";
  containerClassName?: string;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, containerClassName, size = "md", ...props }, ref) => {
    const sizeClass = size === "sm" ? "h-10 pl-10 pr-4 text-sm" : "h-12 pl-12 pr-5 text-sm";
    const iconPos = size === "sm" ? "left-3" : "left-4";
    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Search
          size={size === "sm" ? 16 : 18}
          className={cn("absolute top-1/2 -translate-y-1/2 text-ink-400", iconPos)}
        />
        <input
          ref={ref}
          type="search"
          className={cn(
            "w-full rounded-full bg-white border border-cream-200 text-ink-900 outline-none transition-all placeholder:text-ink-300",
            "focus:border-coral-400 focus:ring-4 focus:ring-coral-100",
            sizeClass,
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
SearchBar.displayName = "SearchBar";
