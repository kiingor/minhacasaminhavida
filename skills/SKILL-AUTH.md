# SKILL: Auth (Convex Auth)

## Fluxo
1. **Registro**: email + senha → cria `users` + gera `familyId` único (uuid). `role: "admin"`.
2. **Login**: Convex Auth padrão (email/password provider).
3. **Convite**: admin gera código (`familyId` + token) → novo usuário usa código no registro → entra com mesmo `familyId`, `role: "member"`.
4. **Vincular pessoa**: após registro, usuário escolhe qual `pessoa` da família representa (`users.pessoaId`).

## Permissões
- **admin**: tudo (CRUD pessoas, categorias, catálogo, configurações).
- **member**: pode lançar/marcar tarefas, adicionar despesas/receitas próprias, mas não pode excluir nem configurar.
- Verificar `role` em **toda** mutation sensível.

## Multi-tenant
- TODA query e mutation lê `ctx.auth` → busca user → usa `user.familyId` no filtro.
- Helper: `async function getCurrentUser(ctx)` → throw se não autenticado.

## Sessão
- Token via Convex Auth. Frontend usa `<Authenticated>` / `<Unauthenticated>` wrappers.
