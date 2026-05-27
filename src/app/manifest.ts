import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Casa Minha Vida",
    short_name: "MCMV",
    description: "Gestão familiar gamificada — finanças e tarefas",
    start_url: "/",
    display: "standalone",
    // Cores do design system (cream + ink)
    background_color: "#F5F1EC",
    theme_color: "#0F0F0F",
    icons: [
      // Ícones gerados dinamicamente por src/app/icon.tsx (512x512) e
      // src/app/apple-icon.tsx (180x180). Next.js registra esses paths
      // automaticamente sem precisar de arquivo estático em /public.
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
