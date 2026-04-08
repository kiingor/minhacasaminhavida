import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#6366F1", light: "#818CF8", dark: "#4F46E5" },
        success: "#10B981",
        danger: "#F43F5E",
        warning: "#F59E0B",
        info: "#06B6D4",
        xp: { gold: "#FBBF24", dark: "#F59E0B", glow: "#FFD700" },
        task: {
          limpeza: "#06B6D4",
          cozinha: "#F97316",
          roupas: "#8B5CF6",
          pets: "#EC4899",
          jardim: "#10B981",
          compras: "#3B82F6",
        },
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        gamer: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
