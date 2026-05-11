import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id } from "../_generated/dataModel";

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function fixaInMes(
  d: { dataVencimento?: string; dataPrevisao?: string; periodicidade?: "mensal" | "anual" | "sazonal"; mesesSazonais?: number[] },
  mes: string,
  dataField: "dataVencimento" | "dataPrevisao"
): boolean {
  const dataBase = (d[dataField] ?? "");
  const origMes = dataBase.slice(0, 7);
  if (mes < origMes) return false;
  const periodicidade = d.periodicidade ?? "mensal";
  if (periodicidade === "mensal") return true;
  const mesAlvoNum = Number(mes.slice(5, 7));
  if (periodicidade === "anual") {
    return Number(origMes.slice(5, 7)) === mesAlvoNum;
  }
  const meses = d.mesesSazonais ?? [];
  return meses.includes(mesAlvoNum);
}

// Item unificado: discriminado por `tipo`
type TipoOriginal = "fixa" | "parcelada" | "avulsa";

type LancamentoDespesa = {
  tipo: "despesa";
  id: Id<"despesas">;
  descricao: string;
  valor: number;
  dataRef: string; // YYYY-MM-DD usado para ordenacao (vencimento)
  dataVencimento: string;
  dataPagamento?: string;
  pago: boolean;
  categoriaId: Id<"categorias">;
  contaId?: Id<"contas">;
  cartao?: string;
  pessoaId?: Id<"pessoas">;
  parcelaAtual?: number;
  totalParcelas?: number;
  recorrente?: boolean;
  ehFixa: boolean;
  tipoOriginal: TipoOriginal;
  _projectedMes: string;
};

type LancamentoReceita = {
  tipo: "receita";
  id: Id<"receitas">;
  descricao: string;
  valor: number;
  dataRef: string;
  dataPrevisao: string;
  dataRecebimento?: string;
  recebido: boolean;
  categoriaId: Id<"categorias">;
  contaId?: Id<"contas">;
  pessoaId: Id<"pessoas">;
  pagadorId?: Id<"pagadores">;
  pagadorNome?: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  recorrente?: boolean;
  ehFixa: boolean;
  tipoOriginal: TipoOriginal;
  _projectedMes: string;
};

type LancamentoTransferencia = {
  tipo: "transferencia";
  id: Id<"transferencias">;
  descricao: string;
  valor: number;
  dataRef: string;
  contaOrigemId: Id<"contas">;
  contaDestinoId: Id<"contas">;
  contaOrigemNome: string;
  contaDestinoNome: string;
};

export type LancamentoItem = LancamentoDespesa | LancamentoReceita | LancamentoTransferencia;

export const listByMonth = query({
  args: { sessionToken: v.string(), mes: v.string() }, // YYYY-MM
  handler: async (ctx, { sessionToken, mes }): Promise<LancamentoItem[]> => {
    const user = await getCurrentUser(ctx, sessionToken);

    const [despesasAll, receitasAll, transferenciasMes, pagamentos, recebimentos] = await Promise.all([
      ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
      ctx.db
        .query("receitas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
      ctx.db
        .query("transferencias")
        .withIndex("by_family_data", (q) =>
          q.eq("familyId", user.familyId).gte("data", `${mes}-01`).lte("data", `${mes}-31`)
        )
        .collect(),
      ctx.db
        .query("pagamentosDespesas")
        .withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes))
        .collect(),
      ctx.db
        .query("recebimentosReceitas")
        .withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes))
        .collect(),
    ]);

    const pagoMap = new Map(pagamentos.map((p) => [p.despesaId as string, p]));
    const recMap = new Map(recebimentos.map((r) => [r.receitaId as string, r]));

    const result: LancamentoItem[] = [];

    // ==== DESPESAS (com projecao virtual) ====
    for (const d of despesasAll) {
      const origMes = d.dataVencimento.slice(0, 7);
      const pagamento = pagoMap.get(d._id as string);
      const pago = !!pagamento;
      const dataPagamento = pagamento?.dataPagamento;

      const ov = (d.overrides ?? []).find((o) => o.mes === mes);
      const valorEf = ov?.valor ?? d.valor;
      const descEf = ov?.descricao ?? d.descricao;
      const dataBaseEf = ov?.dataVencimento ?? d.dataVencimento;

      const buildItem = (
        dataVenc: string,
        parcelaNoMes?: number
      ): LancamentoDespesa => ({
        tipo: "despesa",
        id: d._id,
        descricao: descEf,
        valor: valorEf,
        dataRef: dataVenc,
        dataVencimento: dataVenc,
        dataPagamento,
        pago,
        categoriaId: d.categoriaId,
        contaId: d.contaId,
        cartao: d.cartao,
        pessoaId: d.pessoaId,
        parcelaAtual: parcelaNoMes,
        totalParcelas: d.totalParcelas,
        recorrente: d.recorrente,
        ehFixa: d.tipo === "fixa",
        tipoOriginal: d.tipo,
        _projectedMes: mes,
      });

      if (d.tipo === "avulsa") {
        if (origMes === mes) result.push(buildItem(dataBaseEf));
      } else if (d.tipo === "fixa") {
        if (fixaInMes(d, mes, "dataVencimento")) {
          const dia = dataBaseEf.slice(8, 10);
          result.push(buildItem(`${mes}-${dia}`));
        }
      } else if (d.tipo === "parcelada") {
        const totalParcelas = d.totalParcelas ?? 1;
        const parcelaInicial = d.parcelaAtual ?? 1;
        const offset = monthDiff(origMes, mes);
        const parcelaNoMes = parcelaInicial + offset;
        if (offset >= 0 && parcelaNoMes <= totalParcelas) {
          const dia = dataBaseEf.slice(8, 10);
          result.push(buildItem(`${mes}-${dia}`, parcelaNoMes));
        }
      }
    }

    // ==== RECEITAS (com projecao virtual) ====
    for (const r of receitasAll) {
      const origMes = r.dataPrevisao.slice(0, 7);
      const rec = recMap.get(r._id as string);
      const recebido = !!rec;
      const dataRecebimento = rec?.dataRecebimento;

      const ov = (r.overrides ?? []).find((o) => o.mes === mes);
      const valorEf = ov?.valor ?? r.valor;
      const descEf = ov?.descricao ?? r.descricao;
      const dataBaseEf = ov?.dataPrevisao ?? r.dataPrevisao;

      const buildItem = (
        dataPrev: string,
        parcelaNoMes?: number
      ): LancamentoReceita => ({
        tipo: "receita",
        id: r._id,
        descricao: descEf,
        valor: valorEf,
        dataRef: dataPrev,
        dataPrevisao: dataPrev,
        dataRecebimento,
        recebido,
        categoriaId: r.categoriaId,
        contaId: r.contaId,
        pessoaId: r.pessoaId,
        pagadorId: r.pagadorId,
        pagadorNome: r.pagadorNome,
        parcelaAtual: parcelaNoMes,
        totalParcelas: r.totalParcelas,
        recorrente: r.recorrente,
        ehFixa: r.tipo === "fixa",
        tipoOriginal: r.tipo,
        _projectedMes: mes,
      });

      if (r.tipo === "avulsa") {
        if (origMes === mes) result.push(buildItem(dataBaseEf));
      } else if (r.tipo === "fixa") {
        if (fixaInMes(r, mes, "dataPrevisao")) {
          const dia = dataBaseEf.slice(8, 10);
          result.push(buildItem(`${mes}-${dia}`));
        }
      } else if (r.tipo === "parcelada") {
        const totalParcelas = r.totalParcelas ?? 1;
        const offset = monthDiff(origMes, mes);
        if (offset >= 0 && offset < totalParcelas) {
          const dia = dataBaseEf.slice(8, 10);
          result.push(buildItem(`${mes}-${dia}`, (r.parcelaAtual ?? 1) + offset));
        }
      }
    }

    // ==== TRANSFERENCIAS ====
    if (transferenciasMes.length > 0) {
      // Carrega contas envolvidas para nomes (apenas IDs unicos)
      const contaIds = new Set<string>();
      transferenciasMes.forEach((t) => {
        contaIds.add(t.contaOrigemId as string);
        contaIds.add(t.contaDestinoId as string);
      });
      const contas = await Promise.all(
        Array.from(contaIds).map((id) => ctx.db.get(id as Id<"contas">))
      );
      const contaMap = new Map<string, string>();
      contas.forEach((c) => {
        if (c) contaMap.set(c._id as string, c.nome);
      });

      for (const t of transferenciasMes) {
        const origemNome = contaMap.get(t.contaOrigemId as string) ?? "Conta removida";
        const destinoNome = contaMap.get(t.contaDestinoId as string) ?? "Conta removida";
        result.push({
          tipo: "transferencia",
          id: t._id,
          descricao: t.descricao || `${origemNome} → ${destinoNome}`,
          valor: t.valor,
          dataRef: t.data,
          contaOrigemId: t.contaOrigemId,
          contaDestinoId: t.contaDestinoId,
          contaOrigemNome: origemNome,
          contaDestinoNome: destinoNome,
        });
      }
    }

    // Ordena por dataRef desc (mais recente primeiro), com pendentes em cima dentro do dia
    return result.sort((a, b) => {
      // ordena descendente por data
      const cmp = b.dataRef.localeCompare(a.dataRef);
      if (cmp !== 0) return cmp;
      // empate: efetivado vai depois (false antes de true)
      const aDone = a.tipo === "despesa" ? a.pago : a.tipo === "receita" ? a.recebido : true;
      const bDone = b.tipo === "despesa" ? b.pago : b.tipo === "receita" ? b.recebido : true;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return 0;
    });
  },
});

// =====================================================
// Mutations bulk
// =====================================================

const itemRef = v.union(
  v.object({ tipo: v.literal("despesa"), id: v.id("despesas") }),
  v.object({ tipo: v.literal("receita"), id: v.id("receitas") })
);

const itemRefComTransfer = v.union(
  v.object({ tipo: v.literal("despesa"), id: v.id("despesas") }),
  v.object({ tipo: v.literal("receita"), id: v.id("receitas") }),
  v.object({ tipo: v.literal("transferencia"), id: v.id("transferencias") })
);

const itemRefComMes = v.union(
  v.object({ tipo: v.literal("despesa"), id: v.id("despesas"), mes: v.string() }),
  v.object({ tipo: v.literal("receita"), id: v.id("receitas"), mes: v.string() })
);

interface BulkResult {
  sucesso: number;
  falhas: Array<{ id: string; motivo: string }>;
}

export const bulkReclassificar = mutation({
  args: {
    sessionToken: v.string(),
    items: v.array(itemRef),
    categoriaId: v.id("categorias"),
  },
  handler: async (ctx, { sessionToken, items, categoriaId }): Promise<BulkResult> => {
    const user = await getCurrentUser(ctx, sessionToken);

    const cat = await ctx.db.get(categoriaId);
    if (!cat || cat.familyId !== user.familyId) {
      throw new Error("Categoria inválida");
    }

    const result: BulkResult = { sucesso: 0, falhas: [] };

    for (const item of items) {
      try {
        const doc = await ctx.db.get(item.id);
        if (!doc || doc.familyId !== user.familyId) {
          result.falhas.push({ id: item.id, motivo: "Lançamento não encontrado" });
          continue;
        }
        if (cat.tipo !== item.tipo) {
          result.falhas.push({ id: item.id, motivo: "Tipo da categoria não compatível" });
          continue;
        }
        await ctx.db.patch(item.id, { categoriaId });
        result.sucesso++;
      } catch (err) {
        result.falhas.push({
          id: item.id,
          motivo: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }
    return result;
  },
});

export const bulkRemover = mutation({
  args: {
    sessionToken: v.string(),
    items: v.array(itemRefComTransfer),
  },
  handler: async (ctx, { sessionToken, items }): Promise<BulkResult> => {
    const user = await getCurrentUser(ctx, sessionToken);
    const result: BulkResult = { sucesso: 0, falhas: [] };

    for (const item of items) {
      try {
        const doc = await ctx.db.get(item.id);
        if (!doc || doc.familyId !== user.familyId) {
          result.falhas.push({ id: item.id, motivo: "Lançamento não encontrado" });
          continue;
        }

        if (item.tipo === "despesa") {
          // remove pagamentos vinculados
          const pagamentos = await ctx.db
            .query("pagamentosDespesas")
            .withIndex("by_despesa_mes", (q) => q.eq("despesaId", item.id))
            .collect();
          for (const p of pagamentos) {
            await ctx.db.delete(p._id);
          }
        } else if (item.tipo === "receita") {
          const recebimentos = await ctx.db
            .query("recebimentosReceitas")
            .withIndex("by_receita_mes", (q) => q.eq("receitaId", item.id))
            .collect();
          for (const r of recebimentos) {
            await ctx.db.delete(r._id);
          }
        }

        await ctx.db.delete(item.id);
        result.sucesso++;
      } catch (err) {
        result.falhas.push({
          id: item.id,
          motivo: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }
    return result;
  },
});

export const bulkMarcarEfetivado = mutation({
  args: {
    sessionToken: v.string(),
    items: v.array(itemRefComMes),
  },
  handler: async (ctx, { sessionToken, items }): Promise<BulkResult> => {
    const user = await getCurrentUser(ctx, sessionToken);
    const result: BulkResult = { sucesso: 0, falhas: [] };
    const hoje = new Date().toISOString().slice(0, 10);

    for (const item of items) {
      try {
        const doc = await ctx.db.get(item.id);
        if (!doc || doc.familyId !== user.familyId) {
          result.falhas.push({ id: item.id, motivo: "Lançamento não encontrado" });
          continue;
        }

        if (item.tipo === "despesa") {
          const existente = await ctx.db
            .query("pagamentosDespesas")
            .withIndex("by_despesa_mes", (q) => q.eq("despesaId", item.id).eq("mes", item.mes))
            .unique();
          if (!existente) {
            await ctx.db.insert("pagamentosDespesas", {
              despesaId: item.id,
              mes: item.mes,
              dataPagamento: hoje,
              familyId: user.familyId,
              criadoPor: user._id,
              criadoEm: new Date().toISOString(),
            });
          }
          // Idempotente: se ja existe, conta como sucesso
          result.sucesso++;
        } else if (item.tipo === "receita") {
          const existente = await ctx.db
            .query("recebimentosReceitas")
            .withIndex("by_receita_mes", (q) => q.eq("receitaId", item.id).eq("mes", item.mes))
            .unique();
          if (!existente) {
            await ctx.db.insert("recebimentosReceitas", {
              receitaId: item.id,
              mes: item.mes,
              dataRecebimento: hoje,
              familyId: user.familyId,
              criadoPor: user._id,
              criadoEm: new Date().toISOString(),
            });
          }
          result.sucesso++;
        }
      } catch (err) {
        result.falhas.push({
          id: item.id,
          motivo: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }
    return result;
  },
});
