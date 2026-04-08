# SKILL: API (Convex mutations/queries/actions)

## Estrutura
- `query`: read-only, reativa. Use para listas, dashboards.
- `mutation`: escrita transacional. Use para CRUD.
- `action`: non-transactional, para side-effects externos (envio de email, APIs externas, geração de seeds pesadas).

## Padrão de arquivo
```ts
// convex/financeiro/despesas.ts
import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser, requireAdmin } from "../_helpers";

export const list = query({
  args: { mes: v.string() },
  handler: async (ctx, { mes }) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.query("despesas")
      .withIndex("by_family_mes", q => q.eq("familyId", user.familyId))
      .collect();
  }
});

export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("despesas", { ...args, familyId: user.familyId, criadoPor: user._id, criadoEm: new Date().toISOString() });
  }
});
```

## Helpers (`convex/_helpers.ts`)
- `getCurrentUser(ctx)` — retorna user ou throw.
- `requireAdmin(ctx)` — throw se não for admin.
- `assertSameFamily(ctx, doc)` — verifica que doc pertence à família do user.

## Convenções
- Nome dos arquivos: minúsculo plural em português (`despesas.ts`, `pessoas.ts`).
- Funções exportadas em inglês: `list`, `get`, `create`, `update`, `remove`, `byId`, `stats`.
- Sempre validar com `v.*`. Nunca aceitar `v.any()`.
- Mutations sempre retornam o `_id` ou documento criado.
