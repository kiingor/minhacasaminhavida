import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

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

// Marco 3.E - Painel do Consultor.
// Verifica se um consultor tem acesso ATIVO a uma familia.
// Retorna o acesso ou null. Nao lanca erro - chamadores decidem.
export async function getConsultorAccess(
  ctx: QueryCtx | MutationCtx,
  consultorId: Id<"users">,
  familyId: string
) {
  const acesso = await ctx.db
    .query("acessosConsultor")
    .withIndex("by_consultor_familia", (q) =>
      q.eq("consultorId", consultorId).eq("familyId", familyId)
    )
    .filter((q) => q.eq(q.field("status"), "ativo"))
    .unique();
  return acesso;
}

// Resolve sessao + familia: aceita tanto dono da familia quanto consultor com acesso ativo.
// Usar em queries READONLY que precisam ser acessadas pelo painel do consultor.
// Para mutations financeiras, NAO usar este helper - manter getCurrentUser estrito.
export async function getUserOrConsultor(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
  familyId: string
): Promise<{
  user: Doc<"users">;
  accessType: "owner" | "consultor";
  effectiveFamilyId: string;
}> {
  const user = await getCurrentUser(ctx, sessionToken);
  if (user.role === "consultor") {
    const acesso = await getConsultorAccess(ctx, user._id, familyId);
    if (!acesso) throw new Error("Sem acesso a esta familia");
    return { user, accessType: "consultor", effectiveFamilyId: familyId };
  }
  // Owner / member da familia
  if (user.familyId !== familyId) throw new Error("Permissão negada");
  return { user, accessType: "owner", effectiveFamilyId: familyId };
}
