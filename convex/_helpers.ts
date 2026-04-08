import { QueryCtx, MutationCtx } from "./_generated/server";

// Token passado pelo cliente via arg "sessionToken"
export async function getCurrentUser(ctx: QueryCtx | MutationCtx, sessionToken: string) {
  if (!sessionToken) throw new Error("Não autenticado");

  const now = new Date().toISOString();
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .unique();

  if (!session || session.expiresAt < now) throw new Error("Sessão expirada");

  const user = await ctx.db.get(session.userId);
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx, sessionToken: string) {
  const user = await getCurrentUser(ctx, sessionToken);
  if (user.role !== "admin") throw new Error("Permissão negada");
  return user;
}
