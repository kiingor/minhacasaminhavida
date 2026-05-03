import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

// ===== Tipos do payload =====
// despesa:
//   { descricao, valor, tipo, categoriaId, dataVencimento, pessoaId?, totalParcelas?, parcelaAtual?, cartao?, observacao? }
// receita:
//   { descricao, valor, tipo, categoriaId, pessoaId, dataPrevisao, pagadorId?, pagadorNome?, totalParcelas?, parcelaAtual?, observacao? }
// marcar_paga:
//   { despesaId, mes }
// marcar_recebida:
//   { receitaId, mes }

export const listByConversa = query({
  args: { sessionToken: v.string(), conversaId: v.id("conversasIA") },
  handler: async (ctx, { sessionToken, conversaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const conversa = await ctx.db.get(conversaId);
    if (!conversa || conversa.familyId !== user.familyId) return [];
    const drafts = await ctx.db
      .query("draftsLancamento")
      .withIndex("by_conversa", (q) => q.eq("conversaId", conversaId))
      .collect();
    return drafts.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  },
});

export const cancelar = mutation({
  args: { sessionToken: v.string(), id: v.id("draftsLancamento") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    if (d.status !== "pendente") return;
    await ctx.db.patch(id, { status: "cancelado", resolvidoEm: new Date().toISOString() });
  },
});

export const confirmar = mutation({
  args: { sessionToken: v.string(), id: v.id("draftsLancamento") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    if (d.status !== "pendente") {
      throw new Error("Este lançamento já foi resolvido");
    }

    let payload: any;
    try {
      payload = JSON.parse(d.payload);
    } catch {
      await ctx.db.patch(id, {
        status: "cancelado",
        erro: "payload inválido",
        resolvidoEm: new Date().toISOString(),
      });
      throw new Error("Payload do draft inválido");
    }

    try {
      if (d.tipo === "despesa") {
        const despesaId = await ctx.db.insert("despesas", {
          descricao: String(payload.descricao),
          valor: Math.abs(Math.round(Number(payload.valor) || 0)),
          tipo: payload.tipo,
          categoriaId: payload.categoriaId,
          pessoaId: payload.pessoaId,
          dataVencimento: payload.dataVencimento,
          pago: false,
          totalParcelas: payload.totalParcelas,
          parcelaAtual: payload.parcelaAtual,
          cartao: payload.cartao,
          observacao: payload.observacao,
          criadoPor: user._id,
          familyId: user.familyId,
          criadoEm: new Date().toISOString(),
        });
        await ctx.db.patch(id, {
          status: "confirmado",
          despesaIdCriada: despesaId,
          resolvidoEm: new Date().toISOString(),
        });
        return { despesaId };
      }

      if (d.tipo === "receita") {
        const receitaId = await ctx.db.insert("receitas", {
          descricao: String(payload.descricao),
          valor: Math.abs(Math.round(Number(payload.valor) || 0)),
          tipo: payload.tipo,
          categoriaId: payload.categoriaId,
          pessoaId: payload.pessoaId,
          pagadorId: payload.pagadorId,
          pagadorNome: payload.pagadorNome,
          dataPrevisao: payload.dataPrevisao,
          recebido: false,
          totalParcelas: payload.totalParcelas,
          parcelaAtual: payload.parcelaAtual,
          observacao: payload.observacao,
          criadoPor: user._id,
          familyId: user.familyId,
          criadoEm: new Date().toISOString(),
        });
        await ctx.db.patch(id, {
          status: "confirmado",
          receitaIdCriada: receitaId,
          resolvidoEm: new Date().toISOString(),
        });
        return { receitaId };
      }

      if (d.tipo === "marcar_paga") {
        const despesa = await ctx.db.get(payload.despesaId);
        if (!despesa || despesa.familyId !== user.familyId) {
          throw new Error("Despesa não encontrada");
        }
        const existente = await ctx.db
          .query("pagamentosDespesas")
          .withIndex("by_despesa_mes", (q) =>
            q.eq("despesaId", payload.despesaId).eq("mes", payload.mes)
          )
          .unique();
        if (!existente) {
          await ctx.db.insert("pagamentosDespesas", {
            despesaId: payload.despesaId,
            mes: payload.mes,
            dataPagamento: new Date().toISOString().slice(0, 10),
            familyId: user.familyId,
            criadoPor: user._id,
            criadoEm: new Date().toISOString(),
          });
        }
        await ctx.db.patch(id, {
          status: "confirmado",
          resolvidoEm: new Date().toISOString(),
        });
        return { ok: true };
      }

      if (d.tipo === "marcar_recebida") {
        const receita = await ctx.db.get(payload.receitaId);
        if (!receita || receita.familyId !== user.familyId) {
          throw new Error("Receita não encontrada");
        }
        const existente = await ctx.db
          .query("recebimentosReceitas")
          .withIndex("by_receita_mes", (q) =>
            q.eq("receitaId", payload.receitaId).eq("mes", payload.mes)
          )
          .unique();
        if (!existente) {
          await ctx.db.insert("recebimentosReceitas", {
            receitaId: payload.receitaId,
            mes: payload.mes,
            dataRecebimento: new Date().toISOString().slice(0, 10),
            familyId: user.familyId,
            criadoPor: user._id,
            criadoEm: new Date().toISOString(),
          });
        }
        await ctx.db.patch(id, {
          status: "confirmado",
          resolvidoEm: new Date().toISOString(),
        });
        return { ok: true };
      }

      throw new Error("Tipo de draft desconhecido");
    } catch (err: any) {
      await ctx.db.patch(id, {
        status: "cancelado",
        erro: err?.message ?? "Erro ao confirmar",
        resolvidoEm: new Date().toISOString(),
      });
      throw err;
    }
  },
});

// ====== Internas (chamadas pelas tools no core do agente) ======

export const _criarDraftInternal = internalMutation({
  args: {
    conversaId: v.id("conversasIA"),
    mensagemId: v.optional(v.id("mensagensIA")),
    tipo: v.union(
      v.literal("despesa"),
      v.literal("receita"),
      v.literal("marcar_paga"),
      v.literal("marcar_recebida")
    ),
    payload: v.string(),
    resumo: v.string(),
    familyId: v.string(),
    criadoPor: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("draftsLancamento", {
      ...args,
      status: "pendente",
      criadoEm: new Date().toISOString(),
    });
  },
});
