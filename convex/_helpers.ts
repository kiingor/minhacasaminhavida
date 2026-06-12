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

// Resolve contexto de familia para queries de dashboard.
// Variante de getUserOrConsultor com familyIdAlvo OPCIONAL:
// - Se familyIdAlvo nao informado: usa user.familyId (uso normal pelo dono da familia)
// - Se familyIdAlvo informado: valida acesso (proprio dono ou consultor com acesso)
//
// Usar em queries READONLY que precisam servir tanto a propria familia quanto
// o painel do consultor.
export async function resolveFamilyContext(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
  familyIdAlvo?: string
): Promise<{
  user: Doc<"users">;
  familyId: string;
  accessType: "owner" | "consultor";
}> {
  const user = await getCurrentUser(ctx, sessionToken);

  // Caso 1: alvo nao especificado -> usa user.familyId
  if (!familyIdAlvo) {
    return { user, familyId: user.familyId, accessType: "owner" };
  }

  // Caso 2: alvo especificado -> valida acesso
  if (user.role === "consultor") {
    const acesso = await getConsultorAccess(ctx, user._id, familyIdAlvo);
    if (!acesso) throw new Error("Sem acesso a esta familia");
    return { user, familyId: familyIdAlvo, accessType: "consultor" };
  }
  if (user.familyId !== familyIdAlvo) {
    throw new Error("Permissão negada");
  }
  return { user, familyId: familyIdAlvo, accessType: "owner" };
}

// ============ AUDIT LOG DE EXCLUSÕES ============
// Grava snapshot do doc ANTES do delete pra permitir investigação/restore.
// Use sempre que for chamar ctx.db.delete() numa entidade financeira.
export type AuditEntityType =
  | "despesa"
  | "receita"
  | "transferencia"
  | "conta"
  | "draft"
  | "conversa"
  | "pagamento"
  | "recebimento"
  | "override_excluida"
  | "user";

export async function logExclusao(
  ctx: MutationCtx,
  opts: {
    entityType: AuditEntityType;
    entityId: string;
    entityData: unknown; // o doc inteiro antes do delete (ou snapshot do override)
    mutationCalled: string; // ex: "receitas.remove", "lancamentos.bulkRemover"
    contexto?: string; // opcional, ex: "mes=2026-05"
    familyId: string;
    userId: Id<"users">;
  }
): Promise<void> {
  try {
    await ctx.db.insert("auditLogExclusoes", {
      entityType: opts.entityType,
      entityId: opts.entityId,
      entityData: JSON.stringify(opts.entityData),
      mutationCalled: opts.mutationCalled,
      contexto: opts.contexto,
      familyId: opts.familyId,
      userId: opts.userId,
      criadoEm: new Date().toISOString(),
    });
  } catch (err) {
    // Audit log nunca deve quebrar a mutation principal — só loga em console.
    console.error("[audit] falha ao registrar exclusão:", err);
  }
}

// ============ REMOÇÃO DE CONTA DE LOGIN ============
// Núcleo destrutivo compartilhado pelas mutations de remoção de conta
// (família via pessoas.removerConta e consultor via consultor.removerContaUsuario).
// Aplica a trava de "último admin", grava auditoria, desativa a pessoa vinculada,
// invalida sessões e por fim deleta o login. As validações de PERMISSÃO
// (quem pode remover quem) ficam a cargo de cada mutation chamadora.
export async function executarRemocaoConta(
  ctx: MutationCtx,
  opts: {
    alvo: Doc<"users">;
    executorId: Id<"users">;
    mutationCalled: string; // ex: "pessoas.removerConta"
  }
): Promise<void> {
  const { alvo, executorId, mutationCalled } = opts;

  // Trava: nunca remover o último admin da família (evita lockout).
  if (alvo.role === "admin") {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_family", (q) => q.eq("familyId", alvo.familyId))
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();
    if (admins.length <= 1) {
      throw new Error("Não é possível remover o último admin da família");
    }
  }

  // Snapshot completo do login ANTES de qualquer delete (permite investigar/restaurar).
  await logExclusao(ctx, {
    entityType: "user",
    entityId: alvo._id,
    entityData: alvo,
    mutationCalled,
    familyId: alvo.familyId,
    userId: executorId,
  });

  // Desativa a pessoa vinculada (mantém histórico; só some das listas/ranking).
  if (alvo.pessoaId) {
    const pessoa = await ctx.db.get(alvo.pessoaId);
    if (pessoa && pessoa.familyId === alvo.familyId) {
      await ctx.db.patch(alvo.pessoaId, { ativo: false });
    }
  }

  // Revoga acesso imediatamente: apaga todas as sessões do usuário.
  const sessoes = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", alvo._id))
    .collect();
  for (const s of sessoes) {
    await ctx.db.delete(s._id);
  }

  // Remove o login.
  await ctx.db.delete(alvo._id);
}
