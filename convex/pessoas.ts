import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, requireAdmin } from "./_helpers";

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("pessoas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
  },
});

export const byId = query({
  args: { id: v.id("pessoas"), sessionToken: v.string() },
  handler: async (ctx, { id, sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(id);
    if (!pessoa || pessoa.familyId !== user.familyId) return null;
    return pessoa;
  },
});

export const ranking = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoas = await ctx.db
      .query("pessoas")
      .withIndex("by_family_xp", (q) => q.eq("familyId", user.familyId))
      .order("desc")
      .collect();
    return pessoas.filter((p) => p.ativo);
  },
});

const horarioTrabalhoValidator = v.optional(
  v.object({
    diasSemana: v.array(v.number()),
    horaInicio: v.string(),
    horaFim: v.string(),
    cargaHorariaDiaria: v.number(),
    intervalos: v.optional(
      v.array(
        v.object({ inicio: v.string(), fim: v.string(), descricao: v.string() })
      )
    ),
  })
);

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    apelido: v.optional(v.string()),
    tipo: v.union(v.literal("titular"), v.literal("dependente")),
    corTema: v.string(),
    fotoStorageId: v.optional(v.id("_storage")),
    horarioTrabalho: horarioTrabalhoValidator,
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    let fotoUrl: string | undefined;
    if (args.fotoStorageId) {
      fotoUrl = (await ctx.storage.getUrl(args.fotoStorageId)) ?? undefined;
    }
    return await ctx.db.insert("pessoas", {
      ...args,
      fotoUrl,
      xpTotal: 0,
      nivelAtual: 1,
      tarefasCompletadasTotal: 0,
      streakDias: 0,
      familyId: user.familyId,
      ativo: true,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("pessoas"),
    nome: v.optional(v.string()),
    apelido: v.optional(v.string()),
    tipo: v.optional(v.union(v.literal("titular"), v.literal("dependente"))),
    corTema: v.optional(v.string()),
    fotoStorageId: v.optional(v.id("_storage")),
    horarioTrabalho: horarioTrabalhoValidator,
  },
  handler: async (ctx, { sessionToken, id, fotoStorageId, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(id);
    if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Não encontrado");
    const updates: Record<string, unknown> = { ...rest };
    if (fotoStorageId) {
      updates.fotoStorageId = fotoStorageId;
      updates.fotoUrl = (await ctx.storage.getUrl(fotoStorageId)) ?? undefined;
    }
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("pessoas") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(id);
    if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { ativo: false });
  },
});

export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await getCurrentUser(ctx, sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

// Marco 3.A — Lista perfis de login da familia (para tela "Modo Casal").
// Retorna users com info de pessoa vinculada e role.
export const perfilCasal = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const users = await ctx.db
      .query("users")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();

    const pessoaIds = users
      .map((u) => u.pessoaId)
      .filter((id): id is NonNullable<typeof id> => !!id);
    const pessoasArr = await Promise.all(pessoaIds.map((id) => ctx.db.get(id)));
    const pessoaMap = new Map(
      pessoasArr.filter((p): p is NonNullable<typeof p> => !!p).map((p) => [p._id as string, p])
    );

    return users.map((u) => {
      const pessoa = u.pessoaId ? pessoaMap.get(u.pessoaId as string) : undefined;
      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        pessoaId: u.pessoaId ?? null,
        pessoaNome: pessoa ? (pessoa.apelido ?? pessoa.nome) : null,
        pessoaFotoUrl: pessoa?.fotoUrl ?? null,
        pessoaCorTema: pessoa?.corTema ?? null,
        pessoaTipo: pessoa?.tipo ?? null,
        ehAtual: u._id === user._id,
      };
    });
  },
});
