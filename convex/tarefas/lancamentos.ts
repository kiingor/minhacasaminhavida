import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { calcularNivel, getTituloByNivel, novoStreak, xpComStreak } from "./gamificacao";
import { checkAndUnlockAchievements } from "./conquistas";

// Lista lançamentos de uma data (agrupáveis por pessoa no frontend)
export const listByDate = query({
  args: { sessionToken: v.string(), data: v.string() },
  handler: async (ctx, { sessionToken, data }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("tarefasLancamentos")
      .withIndex("by_family_data", (q) => q.eq("familyId", user.familyId).eq("data", data))
      .collect();
  },
});

// Lista lançamentos de uma pessoa em uma data (com categoria do catálogo)
export const listByPessoaDate = query({
  args: { sessionToken: v.string(), pessoaId: v.id("pessoas"), data: v.string() },
  handler: async (ctx, { sessionToken, pessoaId, data }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) return [];
    const lancs = await ctx.db
      .query("tarefasLancamentos")
      .withIndex("by_pessoa_data", (q) => q.eq("pessoaId", pessoaId).eq("data", data))
      .collect();

    // Enriquecer com categoria do catálogo
    const result = [];
    for (const l of lancs) {
      const cat = await ctx.db.get(l.tarefaCatalogoId);
      result.push({ ...l, categoriaSnapshot: cat?.categoria ?? "Outros" });
    }
    return result;
  },
});

// Atribui tarefas do catálogo a uma pessoa numa data (cria lançamentos + ativa recorrência)
export const atribuir = mutation({
  args: {
    sessionToken: v.string(),
    pessoaId: v.id("pessoas"),
    data: v.string(),
    tarefaIds: v.array(v.id("tarefasCatalogo")),
  },
  handler: async (ctx, { sessionToken, pessoaId, data, tarefaIds }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");

    const ids = [];
    for (const tid of tarefaIds) {
      const tarefa = await ctx.db.get(tid);
      if (!tarefa || tarefa.familyId !== user.familyId) continue;

      // Cria lançamento para a data solicitada
      const id = await ctx.db.insert("tarefasLancamentos", {
        tarefaCatalogoId: tid,
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
      ids.push(id);

      // Ativa recorrência automática (todos os dias)
      const existing = await ctx.db
        .query("tarefasRecorrentes")
        .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", pessoaId).eq("ativo", true))
        .filter((q) => q.eq(q.field("tarefaCatalogoId"), tid))
        .first();
      const existingInativo = !existing
        ? await ctx.db
            .query("tarefasRecorrentes")
            .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", pessoaId).eq("ativo", false))
            .filter((q) => q.eq(q.field("tarefaCatalogoId"), tid))
            .first()
        : null;
      const record = existing ?? existingInativo;
      if (record) {
        await ctx.db.patch(record._id, { ativo: true, diasSemana: undefined });
      } else {
        await ctx.db.insert("tarefasRecorrentes", {
          pessoaId,
          tarefaCatalogoId: tid,
          familyId: user.familyId,
          ativo: true,
        });
      }
    }
    return ids;
  },
});

// Atualiza horário agendado (usado pelo algoritmo de agenda - Fase 7)
export const setHorarioAgendado = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("tarefasLancamentos"),
    horarioAgendado: v.optional(v.object({ inicio: v.string(), fim: v.string() })),
  },
  handler: async (ctx, { sessionToken, id, horarioAgendado }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const l = await ctx.db.get(id);
    if (!l || l.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { horarioAgendado });
  },
});

// Remove um lançamento (reverte XP se completada; desativa recorrência para não repetir)
export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("tarefasLancamentos") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const l = await ctx.db.get(id);
    if (!l || l.familyId !== user.familyId) throw new Error("Não encontrado");
    if (l.completada) {
      const pessoa = await ctx.db.get(l.pessoaId);
      if (pessoa) {
        const novoXp = Math.max(0, pessoa.xpTotal - l.xpGanho);
        await ctx.db.patch(pessoa._id, {
          xpTotal: novoXp,
          nivelAtual: calcularNivel(novoXp),
          tarefasCompletadasTotal: Math.max(0, pessoa.tarefasCompletadasTotal - 1),
        });
      }
    }
    // Desativa a recorrência para que não seja gerada nos próximos dias
    const rec = await ctx.db
      .query("tarefasRecorrentes")
      .withIndex("by_pessoa_ativo", (q) => q.eq("pessoaId", l.pessoaId).eq("ativo", true))
      .filter((q) => q.eq(q.field("tarefaCatalogoId"), l.tarefaCatalogoId))
      .first();
    if (rec) await ctx.db.patch(rec._id, { ativo: false });

    await ctx.db.delete(id);
  },
});

// ==================== MARCAR / DESMARCAR (coração da gamificação) ====================

export const marcarCompletada = mutation({
  args: { sessionToken: v.string(), id: v.id("tarefasLancamentos") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const lanc = await ctx.db.get(id);
    if (!lanc || lanc.familyId !== user.familyId) throw new Error("Não encontrado");
    if (lanc.completada) return { alreadyDone: true };

    const pessoa = await ctx.db.get(lanc.pessoaId);
    if (!pessoa) throw new Error("Pessoa não encontrada");

    // Recalcular streak antes de aplicar XP
    const hoje = new Date().toISOString().slice(0, 10);
    const streakNovo = novoStreak(pessoa.ultimaAtividade, hoje, pessoa.streakDias);

    // Aplicar bônus de streak no XP
    const xpGanho = xpComStreak(lanc.xpGanho, streakNovo);
    const novoXpTotal = pessoa.xpTotal + xpGanho;

    const nivelAntes = pessoa.nivelAtual;
    const nivelDepois = calcularNivel(novoXpTotal);

    // Atualizar lançamento
    await ctx.db.patch(id, {
      completada: true,
      completadaEm: new Date().toISOString(),
      xpGanho, // salvar o valor real ganho (com bônus)
    });

    // Atualizar pessoa
    await ctx.db.patch(pessoa._id, {
      xpTotal: novoXpTotal,
      nivelAtual: nivelDepois,
      tarefasCompletadasTotal: pessoa.tarefasCompletadasTotal + 1,
      streakDias: streakNovo,
      ultimaAtividade: hoje,
    });

    // Detectar level up(s)
    let levelUpCriado = false;
    if (nivelDepois > nivelAntes) {
      await ctx.db.insert("levelUps", {
        pessoaId: pessoa._id,
        nivelAnterior: nivelAntes,
        nivelNovo: nivelDepois,
        tituloNovo: getTituloByNivel(nivelDepois),
        data: hoje,
        visualizado: false,
        familyId: user.familyId,
      });
      levelUpCriado = true;
    }

    // Verificar conquistas
    const tarefasHoje = await ctx.db
      .query("tarefasLancamentos")
      .withIndex("by_pessoa_data", (q) => q.eq("pessoaId", lanc.pessoaId).eq("data", hoje))
      .collect();

    const newAchievements = await checkAndUnlockAchievements(
      ctx,
      lanc.pessoaId,
      user.familyId,
      {
        nivelAtual: nivelDepois,
        streakDias: streakNovo,
        tarefasCompletadasTotal: pessoa.tarefasCompletadasTotal + 1,
        tarefasHojeTotal: tarefasHoje.length,
        tarefasHojeCompletas: tarefasHoje.filter((t) => t.completada).length,
      }
    );

    return {
      xpGanho,
      nivelAntes,
      nivelDepois,
      levelUp: levelUpCriado,
      streakDias: streakNovo,
      newAchievements,
    };
  },
});

export const desmarcarCompletada = mutation({
  args: { sessionToken: v.string(), id: v.id("tarefasLancamentos") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const lanc = await ctx.db.get(id);
    if (!lanc || lanc.familyId !== user.familyId) throw new Error("Não encontrado");
    if (!lanc.completada) return { alreadyUndone: true };

    const pessoa = await ctx.db.get(lanc.pessoaId);
    if (!pessoa) throw new Error("Pessoa não encontrada");

    const novoXpTotal = Math.max(0, pessoa.xpTotal - lanc.xpGanho);
    const nivelDepois = calcularNivel(novoXpTotal);

    await ctx.db.patch(id, {
      completada: false,
      completadaEm: undefined,
    });

    await ctx.db.patch(pessoa._id, {
      xpTotal: novoXpTotal,
      nivelAtual: nivelDepois,
      tarefasCompletadasTotal: Math.max(0, pessoa.tarefasCompletadasTotal - 1),
    });

    return { xpRevertido: lanc.xpGanho, nivelDepois };
  },
});

// Level ups pendentes (não visualizados) de uma pessoa — para disparar modal
export const levelUpsPendentes = query({
  args: { sessionToken: v.string(), pessoaId: v.id("pessoas") },
  handler: async (ctx, { sessionToken, pessoaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) return [];
    return await ctx.db
      .query("levelUps")
      .withIndex("by_pessoa_visualizado", (q) => q.eq("pessoaId", pessoaId).eq("visualizado", false))
      .collect();
  },
});

export const marcarLevelUpVisualizado = mutation({
  args: { sessionToken: v.string(), id: v.id("levelUps") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const lu = await ctx.db.get(id);
    if (!lu || lu.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { visualizado: true });
  },
});
