import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

/**
 * Diagnóstico de lançamentos: retorna TODAS as despesas e receitas no banco
 * com info de overrides (meses excluídos). Útil pra investigar quando algo
 * "desaparece" da listagem mensal — confirma se foi deletado de verdade ou
 * apenas oculto por override.
 */
export const diagnosticoLancamentos = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
      ctx.db
        .query("receitas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
    ]);

    const formatado = {
      despesas: despesas
        .map((d) => ({
          _id: d._id,
          descricao: d.descricao,
          valor: d.valor,
          tipo: d.tipo,
          dataVencimento: d.dataVencimento,
          totalParcelas: d.totalParcelas,
          parcelaAtual: d.parcelaAtual,
          cartao: d.cartao,
          recorrente: d.recorrente,
          periodicidade: d.periodicidade,
          criadoEm: d.criadoEm ?? "",
          mesesExcluidos: (d.overrides ?? [])
            .filter((o) => o.excluida)
            .map((o) => o.mes)
            .sort(),
        }))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      receitas: receitas
        .map((r) => ({
          _id: r._id,
          descricao: r.descricao,
          valor: r.valor,
          tipo: r.tipo,
          dataPrevisao: r.dataPrevisao,
          totalParcelas: r.totalParcelas,
          parcelaAtual: r.parcelaAtual,
          recorrente: r.recorrente,
          periodicidade: r.periodicidade,
          criadoEm: r.criadoEm ?? "",
          mesesExcluidos: (r.overrides ?? [])
            .filter((o) => o.excluida)
            .map((o) => o.mes)
            .sort(),
        }))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      total: {
        despesas: despesas.length,
        receitas: receitas.length,
        despesasComOverrideExcluido: despesas.filter((d) =>
          (d.overrides ?? []).some((o) => o.excluida)
        ).length,
        receitasComOverrideExcluido: receitas.filter((r) =>
          (r.overrides ?? []).some((o) => o.excluida)
        ).length,
      },
    };

    return formatado;
  },
});

/**
 * Lista as últimas N exclusões registradas no audit log.
 * Cada item permite ver o que foi apagado, quando e por qual mutation.
 */
export const listarExclusoesRecentes = query({
  args: { sessionToken: v.string(), limite: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limite }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const N = Math.min(limite ?? 50, 200);

    const logs = await ctx.db
      .query("auditLogExclusoes")
      .withIndex("by_family_criado", (q) => q.eq("familyId", user.familyId))
      .order("desc")
      .take(N);

    return logs.map((l) => ({
      _id: l._id,
      entityType: l.entityType,
      entityId: l.entityId,
      mutationCalled: l.mutationCalled,
      contexto: l.contexto,
      criadoEm: l.criadoEm,
      restauradoEm: l.restauradoEm,
      // Parse seguro do snapshot (mostra resumo)
      resumo: extrairResumo(l.entityType, l.entityData),
    }));
  },
});

function extrairResumo(entityType: string, entityDataJson: string): string {
  try {
    const data = JSON.parse(entityDataJson);
    if (entityType === "despesa" || entityType === "receita") {
      const valor = data.valor ?? 0;
      const desc = data.descricao ?? "(sem descrição)";
      return `${desc} — R$ ${(valor / 100).toFixed(2).replace(".", ",")}`;
    }
    if (entityType === "transferencia") {
      const valor = data.valor ?? 0;
      const desc = data.descricao ?? "Transferência";
      return `${desc} — R$ ${(valor / 100).toFixed(2).replace(".", ",")}`;
    }
    if (entityType === "conta") {
      return `Conta ${data.nome ?? "(sem nome)"}`;
    }
    if (entityType === "draft") {
      return `Draft ${data.tipo ?? "?"}: ${data.resumo ?? ""}`;
    }
    if (entityType === "conversa") {
      return `Conversa: ${data.titulo ?? "(sem título)"}`;
    }
    if (entityType === "override_excluida") {
      return `${data.titulo ?? "(sem nome)"} oculta em ${data.mes}`;
    }
    return JSON.stringify(data).slice(0, 80);
  } catch {
    return "(snapshot inválido)";
  }
}

/**
 * Restaura uma exclusão do tipo override_excluida (remove o flag e
 * reabilita a projeção do mês). Demais tipos exigem restore manual.
 */
export const restaurarOverrideExcluida = mutation({
  args: { sessionToken: v.string(), logId: v.id("auditLogExclusoes") },
  handler: async (ctx, { sessionToken, logId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const log = await ctx.db.get(logId);
    if (!log || log.familyId !== user.familyId) {
      throw new Error("Registro de exclusão não encontrado");
    }
    if (log.entityType !== "override_excluida") {
      throw new Error("Esta exclusão não é recuperável automaticamente");
    }
    if (log.restauradoEm) {
      throw new Error("Já foi restaurada");
    }

    const data = JSON.parse(log.entityData) as {
      receitaId?: string;
      despesaId?: string;
      mes: string;
    };
    const mes = data.mes;
    // Remove o override.excluida; se sobrar mais info no override (valor, descricao,
    // dataVencimento/Previsao), mantém. Senão, remove o override inteiro.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function limparOverride(overrides: any[]): any[] {
      return overrides
        .map((o) => (o.mes === mes ? { ...o, excluida: undefined } : o))
        .map((o) => {
          if (o.mes !== mes) return o;
          // mes que estava sendo restaurado: se não tem outros campos, sumimos com ele
          const { mes: _m, excluida: _e, ...resto } = o;
          const temOutros = Object.values(resto).some((v) => v !== undefined);
          return temOutros ? { mes: _m, ...resto } : null;
        })
        .filter((o) => o !== null);
    }

    if (data.despesaId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = await ctx.db.get(data.despesaId as never);
      if (!d || d.familyId !== user.familyId) {
        throw new Error("Despesa original não existe mais");
      }
      const overrides = limparOverride(d.overrides ?? []);
      await ctx.db.patch(data.despesaId as never, { overrides } as never);
    } else if (data.receitaId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await ctx.db.get(data.receitaId as never);
      if (!r || r.familyId !== user.familyId) {
        throw new Error("Receita original não existe mais");
      }
      const overrides = limparOverride(r.overrides ?? []);
      await ctx.db.patch(data.receitaId as never, { overrides } as never);
    } else {
      throw new Error("Snapshot sem despesaId/receitaId");
    }

    await ctx.db.patch(logId, { restauradoEm: new Date().toISOString() });
    return { ok: true };
  },
});
