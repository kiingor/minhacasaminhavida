# Minha Casa Minha Vida - Sistema de Gestao Familiar Gamificado

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript strict, Tailwind CSS
- **Backend:** Convex (real-time BaaS) - mutations, queries, schema em `convex/`
- **UI:** shadcn/ui (`src/components/ui/`), Framer Motion, Lucide Icons, Recharts
- **Sessao:** `useSessionToken()` de `@/contexts/SessionContext`

## Comandos

- Build: `npm run build`
- Dev: `npm run dev`
- Type check: `npx tsc --noEmit`
- Convex dev: `npx convex dev`

## Convencoes de Codigo

- Valores monetarios em **centavos** (number inteiro), formate com `formatBRL()` de `@/lib/formatters`
- Datas como strings `YYYY-MM-DD`
- Todas as mutations devem validar `sessionToken` via `getCurrentUser()` de `convex/_helpers`
- Todas as mutations devem verificar `familyId` para seguranca multi-tenant
- Componentes React funcionais com hooks, sem class components
- Imports: `@/` para `src/`, caminhos relativos para `convex/`
- Mobile-first: app usado primariamente no celular

## Estrutura Principal

- `src/app/` - Paginas (App Router)
- `src/components/` - Componentes React
- `src/components/ui/` - Componentes base (Button, Input, Dialog, Skeleton, etc)
- `src/lib/` - Utilitarios (formatters, monthUtils)
- `src/contexts/` - Context providers (SessionContext)
- `convex/` - Backend Convex (schema, mutations, queries)
- `convex/schema.ts` - Schema do banco de dados

## Fluxo de Trabalho com Agentes

Este projeto usa um fluxo de agentes para garantir qualidade. Use os slash commands:

- `/feature [descricao]` - Fluxo completo: PO -> UX -> DEV -> QA -> Tech Lead
- `/bugfix [descricao]` - Correcao de bug: PO -> DEV -> QA -> Tech Lead
- `/refactor [descricao]` - Refatoracao: DEV -> QA -> Tech Lead

### Papeis dos Agentes

| Papel | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| **PO** | `.claude/agents/po.md` | Define requisitos e criterios de aceitacao |
| **UX** | `.claude/agents/ux.md` | Define interface, acessibilidade e UX |
| **DEV** | `.claude/agents/dev.md` | Implementa o codigo |
| **QA** | `.claude/agents/qa.md` | Valida a implementacao, busca bugs |
| **Tech Lead** | `.claude/agents/techlead.md` | Revisao final, aprova ou reprova |
