import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../_helpers";

export const migrarBaixasParaNovaTabela = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireAdmin(ctx, sessionToken);

    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    let pagamentosCriados = 0;
    let recebimentosCriados = 0;

    for (const d of despesas) {
      if (!d.pago) continue;
      const mes = (d.dataPagamento ?? d.dataVencimento).slice(0, 7);
      const existente = await ctx.db
        .query("pagamentosDespesas")
        .withIndex("by_despesa_mes", (q) => q.eq("despesaId", d._id).eq("mes", mes))
        .unique();
      if (existente) continue;
      await ctx.db.insert("pagamentosDespesas", {
        despesaId: d._id,
        mes,
        dataPagamento: d.dataPagamento ?? d.dataVencimento,
        familyId: user.familyId,
        criadoPor: d.criadoPor,
        criadoEm: d.criadoEm,
      });
      pagamentosCriados++;
    }

    for (const r of receitas) {
      if (!r.recebido) continue;
      const mes = (r.dataRecebimento ?? r.dataPrevisao).slice(0, 7);
      const existente = await ctx.db
        .query("recebimentosReceitas")
        .withIndex("by_receita_mes", (q) => q.eq("receitaId", r._id).eq("mes", mes))
        .unique();
      if (existente) continue;
      await ctx.db.insert("recebimentosReceitas", {
        receitaId: r._id,
        mes,
        dataRecebimento: r.dataRecebimento ?? r.dataPrevisao,
        familyId: user.familyId,
        criadoPor: r.criadoPor,
        criadoEm: r.criadoEm,
      });
      recebimentosCriados++;
    }

    return { pagamentosCriados, recebimentosCriados };
  },
});
