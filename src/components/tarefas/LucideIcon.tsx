"use client";
import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

interface Props extends LucideProps {
  name: string;
}

// Renderiza um ícone Lucide pelo nome (string). Fallback: CheckSquare.
export function LucideIcon({ name, ...props }: Props) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name]
    ?? Icons.CheckSquare;
  return <Icon {...props} />;
}
