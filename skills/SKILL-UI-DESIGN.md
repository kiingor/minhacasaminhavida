# SKILL: UI Design System

## Cores (CSS variables em globals.css)
```css
--primary: #6366F1;  --primary-light: #818CF8;  --primary-dark: #4F46E5;
--success: #10B981;  --danger: #F43F5E;  --warning: #F59E0B;  --info: #06B6D4;
--xp-gold: #FBBF24;  --level-up-glow: #FFD700;  --streak-fire: #FB7185;
--task-limpeza: #06B6D4;  --task-cozinha: #F97316;  --task-roupas: #8B5CF6;
--task-pets: #EC4899;  --task-jardim: #10B981;  --task-compras: #3B82F6;
--bg-main: #F8FAFC;  --bg-card: #FFFFFF;  --bg-sidebar: #1E1B4B;
--text-primary: #1E293B;  --text-secondary: #64748B;
```

## Tipografia
- Display: **Plus Jakarta Sans** 700/800 (headings, level up)
- Body: **Inter** 400/500/600
- Monetário: **JetBrains Mono** 500
- XP/Nível: **Space Grotesk** 700

## Componentes
- shadcn/ui base. Cards com sombra suave + borda sutil.
- Botões com micro-interação (Framer Motion `whileTap scale: 0.95`).
- Avatar com moldura dependente do nível (gradiente do título).
- Progress bar animada com `easeOut`.

## Layout responsivo
- **Desktop**: sidebar fixa esquerda (240px) + header + main.
- **Mobile**: bottom nav (5 itens: Home, Finanças, Tarefas, Pessoas, Menu).
- Mobile-first CSS, breakpoint principal `md:` (768px).

## Acessibilidade
- Labels em inputs, contraste AA, navegação por teclado, focus rings visíveis.
