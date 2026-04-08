# 🏠 Minha Casa Minha Vida

Sistema de gestão familiar gamificado — finanças + tarefas com XP, níveis MMORPG e level-up com fanfarra medieval.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Convex · Framer Motion · Recharts · Howler · Lucide.

## Setup
```bash
cp .env.local.example .env.local
npm install
npx convex dev   # em um terminal
npm run dev      # em outro
```

## Estrutura
- `/skills` — módulos de conhecimento (domínio, regras, padrões).
- `/convex` — schema + queries/mutations (finanças, tarefas).
- `/src/app` — rotas Next.js.
- `/src/lib` — utilitários (XP, níveis, formatters, sons).
- `/public/sounds` — efeitos sonoros (**ver abaixo**).

## Sons necessários (baixar livres de direitos)
Colocar em `public/sounds/`:
- `level-up-medieval.mp3` — fanfarra medieval (3-5s). Buscar em [Freesound](https://freesound.org), [Zapsplat](https://zapsplat.com) ou [OpenGameArt](https://opengameart.org) por *"medieval level up fanfare"*.
- `task-check.mp3` — ding curto.
- `task-uncheck.mp3` — unclick.
- `xp-gain.mp3` — ganho sutil de XP.

## Fases de implementação
1. ✅ Skills + schema + scaffold
2. ⬜ Pessoas + dashboard
3. ⬜ Módulo Financeiro
4. ⬜ Tarefas core + gamificação
5. ⬜ Tela do dia (checks animados)
6. ⬜ Level Up experience
7. ⬜ Agenda inteligente
8. ⬜ Dashboards tarefas + polish
