"use client";
import { ConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { SessionProvider } from "@/contexts/SessionContext";

// Fallback placeholder pra permitir build/prerender estático quando
// NEXT_PUBLIC_CONVEX_URL não está disponível em build time (ex: Vercel sem env configurada).
// Em runtime real, a env var precisa estar configurada — caso contrário o app
// não consegue se conectar ao Convex e nenhuma query funciona.
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

export function Providers({ children }: { children: ReactNode }) {
  // useMemo evita recriar o client a cada render (e mantém o singleton lógico).
  const convex = useMemo(() => new ConvexReactClient(CONVEX_URL), []);
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>{children}</SessionProvider>
    </ConvexProvider>
  );
}
