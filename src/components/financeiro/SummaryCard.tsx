"use client";
import { LucideIcon } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Stat } from "@/components/ui/stat";

interface Props {
  label: string;
  valor: number;
  icon: LucideIcon;
  color?: string;
  trend?: "up" | "down" | "neutral";
  tone?: "white" | "dark" | "coral";
}

const trendLabel = { up: "Subiu vs mês anterior", down: "Caiu vs mês anterior", neutral: "Estável vs mês anterior" };

export function SummaryCard({ label, valor, icon, trend, tone = "white" }: Props) {
  const sinal = valor < 0 ? "-" : "";
  return (
    <Stat
      label={label}
      icon={icon}
      tone={tone}
      trend={trend}
      hint={trend ? trendLabel[trend] : undefined}
      value={<span className="font-mono">{sinal}{formatBRL(Math.abs(valor))}</span>}
    />
  );
}
