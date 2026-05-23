import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta primária — coral / warm
        coral: {
          50:  "#FFF4F0",
          100: "#FFE5DB",
          200: "#FFCBB7",
          300: "#FFA88B",
          400: "#FF8965",
          500: "#FF6B47", // primary
          600: "#F0512C",
          700: "#C73E1F",
          800: "#9B3119",
          900: "#6E2212",
        },
        // Background e neutros quentes (cream)
        cream: {
          50:  "#FBF8F4",
          100: "#F5F1EC", // bg principal
          200: "#EDE7DE",
          300: "#DDD3C5",
          400: "#B8AC99",
          500: "#8A7E6B",
        },
        // Cinzas frios pra texto e bordas
        ink: {
          50:  "#F7F7F7",
          100: "#EEEEEE",
          200: "#D9D9D9",
          300: "#B8B8B8",
          400: "#8A8A8A",
          500: "#5C5C5C",
          600: "#3D3D3D",
          700: "#262626",
          800: "#1A1A1A",
          900: "#0F0F0F", // text-primary
        },
        // Alias pra compatibilidade com código antigo
        primary: { DEFAULT: "#FF6B47", light: "#FF8965", dark: "#F0512C" },
        // Mantidos só pra evitar quebras de import — usados como "sinal" semântico monocromático
        success: "#0F0F0F",
        danger:  "#0F0F0F",
        warning: "#0F0F0F",
        info:    "#0F0F0F",
        // Gamificação — XP/streak usam coral em vez de gold/orange
        xp: { gold: "#FF6B47", dark: "#F0512C", glow: "#FF8965" },
        // Cores de tarefa — monocromáticas / coral tonal (sem cores semânticas)
        task: {
          limpeza: "#FF6B47",
          cozinha: "#F0512C",
          roupas:  "#5C5C5C",
          pets:    "#FF8965",
          jardim:  "#3D3D3D",
          compras: "#8A8A8A",
        },
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
        gamer:   ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft:  "0 1px 2px rgba(15, 15, 15, 0.04), 0 2px 8px rgba(15, 15, 15, 0.04)",
        card:  "0 2px 6px rgba(15, 15, 15, 0.04), 0 8px 24px rgba(15, 15, 15, 0.05)",
        pop:   "0 4px 12px rgba(255, 107, 71, 0.18), 0 12px 32px rgba(255, 107, 71, 0.12)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
