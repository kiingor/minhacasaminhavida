import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

/** Lista as tarefas recorrentes de uma pessoa */
export const listByPessoa = query({
  args: { sessionToken: v.string(), pessoaId: v.id("pessoas") },
  handler: async (ctx, { sessionToken, pessoaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) return [];
    return await ctx.db
      .query("tarefasRecorrentes")
      .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", pessoaId).eq("ativo", true))
      .collect();
  },
});

/** Ativa ou desativa recorrência de uma tarefa para uma pessoa */
export const setRecorrente = mutation({
  args: {
    sessionToken: v.string(),
    pessoaId: v.id("pessoas"),
    tarefaCatalogoId: v.id("tarefasCatalogo"),
    ativo: v.boolean(),
    diasSemana: v.optional(v.array(v.number())),
  },
  handler: async (ctx, { sessionToken, pessoaId, tarefaCatalogoId, ativo, diasSemana }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");

    // Verifica se já existe
    const existing = await ctx.db
      .query("tarefasRecorrentes")
      .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", pessoaId).eq("ativo", true))
      .filter((q) => q.eq(q.field("tarefaCatalogoId"), tarefaCatalogoId))
      .first();

    // Também busca inativo
    const existingInativo = !existing
      ? await ctx.db
          .query("tarefasRecorrentes")
          .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", pessoaId).eq("ativo", false))
          .filter((q) => q.eq(q.field("tarefaCatalogoId"), tarefaCatalogoId))
          .first()
      : null;

    const record = existing ?? existingInativo;

    if (record) {
      await ctx.db.patch(record._id, { ativo, diasSemana });
    } else if (ativo) {
      await ctx.db.insert("tarefasRecorrentes", {
        pessoaId,
        tarefaCatalogoId,
        diasSemana,
        familyId: user.familyId,
        ativo: true,
      });
    }
  },
});

/**
 * Gera lançamentos para uma data a partir das recorrências configuradas.
 * Chamado automaticamente pelo PersonColumn ao montar/trocar data.
 * Só cria lançamentos que ainda não existem.
 */
export const gerarParaData = mutation({
  args: {
    sessionToken: v.string(),
    pessoaId: v.id("pessoas"),
    data: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, { sessionToken, pessoaId, data }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) return;

    // Dia da semana da data alvo (0=Dom ... 6=Sáb)
    const [ano, mes, dia] = data.split("-").map(Number);
    const diaSemana = new Date(ano, mes - 1, dia).getDay();

    // Recorrências ativas da pessoa
    const recorrentes = await ctx.db
      .query("tarefasRecorrentes")
      .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", pessoaId).eq("ativo", true))
      .collect();

    for (const rec of recorrentes) {
      // Checar se o dia da semana está incluso (undefined = todos os dias)
      if (rec.diasSemana && !rec.diasSemana.includes(diaSemana)) continue;

      // Verificar se já existe lançamento para essa tarefa nessa data
      const jaExiste = await ctx.db
        .query("tarefasLancamentos")
        .withIndex("by_pessoa_data", (q) => q.eq("pessoaId", pessoaId).eq("data", data))
        .filter((q) => q.eq(q.field("tarefaCatalogoId"), rec.tarefaCatalogoId))
        .first();

      if (jaExiste) continue;

      // Buscar dados atuais da tarefa do catálogo
      const tarefa = await ctx.db.get(rec.tarefaCatalogoId);
      if (!tarefa || !tarefa.ativa || tarefa.familyId !== user.familyId) continue;

      await ctx.db.insert("tarefasLancamentos", {
        tarefaCatalogoId: rec.tarefaCatalogoId,
        pessoaId,
        data,
        completada: false,
        xpGanho: tarefa.xpBase,
        nomeSnapshot: tarefa.nome,
        iconeSnapshot: tarefa.icone,
        corSnapshot: tarefa.cor,
        tempoExecucaoSnapshot: tarefa.tempoExecucaoMinutos,
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
  },
});
