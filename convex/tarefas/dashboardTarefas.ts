import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// XP ganho por pessoa nos últimos 7 dias
export const xpUltimos7Dias = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = new Date().toISOString().slice(0, 10);
    const dias: string[] = [];
    for (let i = 6; i >= 0; i--) dias.push(shiftDate(hoje, -i));

    const pessoas = await ctx.db
      .query("pessoas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();

    const result: Record<string, Record<string, number>> = {};
    for (const p of pessoas.filter((p) => p.ativo)) {
      result[p._id] = {};
      for (const dia of dias) result[p._id][dia] = 0;
    }

    // Busca todos os lançamentos dos últimos 7 dias
    for (const dia of dias) {
      const lancs = await ctx.db
        .query("tarefasLancamentos")
        .withIndex("by_family_data", (q) => q.eq("familyId", user.familyId).eq("data", dia))
        .collect();
      for (const l of lancs) {
        if (l.completada && result[l.pessoaId]) {
          result[l.pessoaId][dia] = (result[l.pessoaId][dia] ?? 0) + l.xpGanho;
        }
      }
    }

    return {
      dias,
      pessoasXp: pessoas.filter((p) => p.ativo).map((p) => ({
        id: p._id,
        nome: p.apelido ?? p.nome.split(" ")[0],
        cor: p.corTema,
        xpPorDia: dias.map((dia) => ({ dia, xp: result[p._id]?.[dia] ?? 0 })),
      })),
    };
  },
});

// Tarefas completadas por pessoa (todos os tempos)
export const tarefasPorPessoa = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const pessoas = await ctx.db
      .query("pessoas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    return pessoas
      .filter((p) => p.ativo)
      .sort((a, b) => b.tarefasCompletadasTotal - a.tarefasCompletadasTotal)
      .map((p) => ({
        nome: p.apelido ?? p.nome.split(" ")[0],
        valor: p.tarefasCompletadasTotal,
        cor: p.corTema,
      }));
  },
});

// Tarefas por categoria (últimos 30 dias)
export const tarefasPorCategoria = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = shiftDate(hoje, -30);

    const [lancs, catalogo] = await Promise.all([
      ctx.db.query("tarefasLancamentos")
        .withIndex("by_family_data", (q) => q.eq("familyId", user.familyId))
        .collect(),
      ctx.db.query("tarefasCatalogo")
        .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
        .collect(),
    ]);

    const COR_CAT: Record<string, string> = {
      Limpeza: "#06B6D4", Cozinha: "#F97316", Roupas: "#8B5CF6",
      Pets: "#EC4899", Jardim: "#10B981", Compras: "#3B82F6", Outros: "#64748B",
    };

    const map = new Map<string, number>();
    for (const l of lancs) {
      if (!l.completada || l.data < inicio) continue;
      const cat = catalogo.find((c) => c._id === l.tarefaCatalogoId);
      const categoria = cat?.categoria ?? "Outros";
      map.set(categoria, (map.get(categoria) ?? 0) + 1);
    }

    return Array.from(map.entries()).map(([label, valor]) => ({
      label,
      valor,
      cor: COR_CAT[label] ?? "#64748B",
    }));
  },
});

// Taxa de conclusão hoje / semana / mês
export const taxaConclusao = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = new Date().toISOString().slice(0, 10);

    const calc = async (inicio: string, fim: string) => {
      const dias: string[] = [];
      let d = inicio;
      while (d <= fim) { dias.push(d); d = shiftDate(d, 1); }
      let total = 0, feitas = 0;
      for (const dia of dias) {
        const lancs = await ctx.db
          .query("tarefasLancamentos")
          .withIndex("by_family_data", (q) => q.eq("familyId", user.familyId).eq("data", dia))
          .collect();
        total += lancs.length;
        feitas += lancs.filter((l) => l.completada).length;
      }
      return total > 0 ? Math.round((feitas / total) * 100) : null;
    };

    const inicioSemana = shiftDate(hoje, -6);
    const inicioMes = hoje.slice(0, 7) + "-01";

    const [taxaHoje, taxaSemana, taxaMes] = await Promise.all([
      calc(hoje, hoje),
      calc(inicioSemana, hoje),
      calc(inicioMes, hoje),
    ]);

    return { taxaHoje, taxaSemana, taxaMes };
  },
});

// Conquistas recentes (últimas 10)
export const conquistasRecentes = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conquistas = await ctx.db
      .query("conquistas")
      .filter((q) => q.eq(q.field("familyId"), user.familyId))
      .order("desc")
      .take(10);

    const pessoas = await ctx.db
      .query("pessoas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();

    return conquistas.map((c) => ({
      ...c,
      pessoaNome: pessoas.find((p) => p._id === c.pessoaId)?.nome ?? "?",
    }));
  },
});
