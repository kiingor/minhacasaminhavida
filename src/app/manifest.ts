import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Casa Minha Vida",
    short_name: "MCMV",
    description: "Gestão familiar gamificada — finanças e tarefas",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#6366F1",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
