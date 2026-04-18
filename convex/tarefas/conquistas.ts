import { v } from "convex/values";
import { query, MutationCtx } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id } from "../_generated/dataModel";

// ─── Definições de conquistas ─────────────────────────────────────────────────

interface AchievementDef {
  tipo: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: "tarefas" | "streak" | "nivel" | "especial";
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Tarefas
  { tipo: "primeira_tarefa", nome: "Primeira Tarefa", descricao: "Complete sua primeira tarefa", icone: "CheckCircle", categoria: "tarefas" },
  { tipo: "trabalhador", nome: "Trabalhador", descricao: "Complete 10 tarefas", icone: "Hammer", categoria: "tarefas" },
  { tipo: "produtivo", nome: "Produtivo", descricao: "Complete 50 tarefas", icone: "Zap", categoria: "tarefas" },
  { tipo: "maquina", nome: "Máquina", descricao: "Complete 100 tarefas", icone: "Cpu", categoria: "tarefas" },
  { tipo: "lendario_tarefas", nome: "Lendário", descricao: "Complete 500 tarefas", icone: "Crown", categoria: "tarefas" },
  // Streaks
  { tipo: "constante", nome: "Constante", descricao: "Mantenha um streak de 3 dias", icone: "Flame", categoria: "streak" },
  { tipo: "dedicado", nome: "Dedicado", descricao: "Mantenha um streak de 7 dias", icone: "CalendarCheck", categoria: "streak" },
  { tipo: "imparavel", nome: "Imparável", descricao: "Mantenha um streak de 14 dias", icone: "Rocket", categoria: "streak" },
  { tipo: "guerreiro", nome: "Guerreiro", descricao: "Mantenha um streak de 30 dias", icone: "Shield", categoria: "streak" },
  // Níveis
  { tipo: "nivel_5", nome: "Aprendiz", descricao: "Alcance o nível 5", icone: "Star", categoria: "nivel" },
  { tipo: "nivel_10", nome: "Iniciante", descricao: "Alcance o nível 10", icone: "Award", categoria: "nivel" },
  { tipo: "nivel_25", nome: "Veterano", descricao: "Alcance o nível 25", icone: "Medal", categoria: "nivel" },
  { tipo: "nivel_50", nome: "Mestre", descricao: "Alcance o nível 50", icone: "Trophy", categoria: "nivel" },
  // Especiais
  { tipo: "perfeicao", nome: "Dia Perfeito", descricao: "Complete 100% das tarefas (mín. 5) em um dia", icone: "Sparkles", categoria: "especial" },
  { tipo: "primeira_meta", nome: "Poupador", descricao: "Alcance sua primeira meta financeira", icone: "Target", categoria: "especial" },
  { tipo: "tres_metas", nome: "Investidor", descricao: "Alcance 3 metas financeiras", icone: "PiggyBank", categoria: "especial" },
];

// ─── Checker principal ────────────────────────────────────────────────────────

interface CheckContext {
  nivelAtual: number;
  streakDias: number;
  tarefasCompletadasTotal: number;
  tarefasHojeTotal?: number;
  tarefasHojeCompletas?: number;
}

export async function checkAndUnlockAchievements(
  ctx: MutationCtx,
  pessoaId: Id<"pessoas">,
  familyId: string,
  stats: CheckContext
): Promise<Array<{ tipo: string; nome: string; icone: string }>> {
  // Buscar conquistas já desbloqueadas
  const existing = await ctx.db
    .query("conquistas")
    .withIndex("by_pessoa", (q) => q.eq("pessoaId", pessoaId))
    .collect();
  const unlocked = new Set(existing.map((c) => c.tipo));

  const newAchievements: Array<{ tipo: string; nome: string; icone: string }> = [];
  const hoje = new Date().toISOString().slice(0, 10);

  // Verificar cada conquista
  const checks: Record<string, boolean> = {
    // Tarefas
    primeira_tarefa: stats.tarefasCompletadasTotal >= 1,
    trabalhador: stats.tarefasCompletadasTotal >= 10,
    produtivo: stats.tarefasCompletadasTotal >= 50,
    maquina: stats.tarefasCompletadasTotal >= 100,
    lendario_tarefas: stats.tarefasCompletadasTotal >= 500,
    // Streaks
    constante: stats.streakDias >= 3,
    dedicado: stats.streakDias >= 7,
    imparavel: stats.streakDias >= 14,
    guerreiro: stats.streakDias >= 30,
    // Níveis
    nivel_5: stats.nivelAtual >= 5,
    nivel_10: stats.nivelAtual >= 10,
    nivel_25: stats.nivelAtual >= 25,
    nivel_50: stats.nivelAtual >= 50,
    // Especiais
    perfeicao:
      (stats.tarefasHojeTotal ?? 0) >= 5 &&
      (stats.tarefasHojeCompletas ?? 0) === (stats.tarefasHojeTotal ?? 0) &&
      (stats.tarefasHojeTotal ?? 0) > 0,
  };

  // Verificar metas financeiras (separado pois precisa de query)
  if (!unlocked.has("primeira_meta") || !unlocked.has("tres_metas")) {
    const metas = await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .collect();
    const metasAlcancadas = metas.filter((m) => m.ativa && m.valorAtual >= m.valorAlvo).length;
    checks.primeira_meta = metasAlcancadas >= 1;
    checks.tres_metas = metasAlcancadas >= 3;
  }

  // Desbloquear novas conquistas
  for (const def of ACHIEVEMENT_DEFS) {
    if (unlocked.has(def.tipo)) continue;
    if (!checks[def.tipo]) continue;

    await ctx.db.insert("conquistas", {
      pessoaId,
      tipo: def.tipo,
      nome: def.nome,
      descricao: def.descricao,
      icone: def.icone,
      desbloqueadaEm: hoje,
      familyId,
    });
    newAchievements.push({ tipo: def.tipo, nome: def.nome, icone: def.icone });
  }

  return newAchievements;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const conquistasByPessoa = query({
  args: { sessionToken: v.string(), pessoaId: v.id("pessoas") },
  handler: async (ctx, { sessionToken, pessoaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoa = await ctx.db.get(pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) return [];
    return await ctx.db
      .query("conquistas")
      .withIndex("by_pessoa", (q) => q.eq("pessoaId", pessoaId))
      .collect();
  },
});
