import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

// ===== Helpers de recorrencia =====

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

// Aplica overrides (se houver) sobre os campos do registro para um mes alvo.
// Retorna o item original (sem mutar) com possiveis substituicoes em valor/descricao/dataVencimento.
function aplicarOverrideDespesa<
  T extends {
    valor: number;
    descricao: string;
    dataVencimento: string;
    overrides?: Array<{
      mes: string;
      valor?: number;
      descricao?: string;
      dataVencimento?: string;
    }>;
  }
>(d: T, mes: string): T {
  const ov = (d.overrides ?? []).find((o) => o.mes === mes);
  if (!ov) return d;
  return {
    ...d,
    valor: ov.valor ?? d.valor,
    descricao: ov.descricao ?? d.descricao,
    dataVencimento: ov.dataVencimento ?? d.dataVencimento,
  };
}

// Determina se uma despesa do tipo `fixa` deve aparecer no mes alvo,
// considerando periodicidade (mensal | anual | sazonal). Default: mensal.
function fixaInMes(
  d: { dataVencimento: string; periodicidade?: "mensal" | "anual" | "sazonal"; mesesSazonais?: number[] },
  mes: string
): boolean {
  const origMes = d.dataVencimento.slice(0, 7);
  if (mes < origMes) return false;
  const periodicidade = d.periodicidade ?? "mensal";
  if (periodicidade === "mensal") return true;
  const mesAlvoNum = Number(mes.slice(5, 7));
  if (periodicidade === "anual") {
    const mesOrigemNum = Number(origMes.slice(5, 7));
    return mesOrigemNum === mesAlvoNum;
  }
  // sazonal
  const meses = d.mesesSazonais ?? [];
  return meses.includes(mesAlvoNum);
}

// Lista despesas do mês (YYYY-MM), incluindo projeção virtual de fixas/parceladas
export const listByMonth = query({
  args: { sessionToken: v.string(), mes: v.string() }, // "YYYY-MM"
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [all, pagamentos] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("pagamentosDespesas").withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes)).collect(),
    ]);
    const pagoMap = new Map(pagamentos.map((p) => [p.despesaId as string, p]));

    const result: Array<Omit<typeof all[number], "pago" | "dataPagamento"> & { _projectedMes: string; _parcela?: number; pago: boolean; dataPagamento?: string }> = [];
    for (const d of all) {
      const origMes = d.dataVencimento.slice(0, 7);
      const pagamento = pagoMap.get(d._id as string);
      const baseOverride = { pago: !!pagamento, dataPagamento: pagamento?.dataPagamento };
      if (d.tipo === "avulsa") {
        if (origMes === mes) {
          const dProj = aplicarOverrideDespesa(d, mes);
          result.push({ ...dProj, ...baseOverride, _projectedMes: mes });
        }
      } else if (d.tipo === "fixa") {
        if (fixaInMes(d, mes)) {
          const dProj = aplicarOverrideDespesa(d, mes);
          const dia = dProj.dataVencimento.slice(8, 10);
          result.push({ ...dProj, ...baseOverride, _projectedMes: mes, dataVencimento: `${mes}-${dia}` });
        }
      } else if (d.tipo === "parcelada") {
        const totalParcelas = d.totalParcelas ?? 1;
        const parcelaInicial = d.parcelaAtual ?? 1;
        const offset = monthDiff(origMes, mes);
        const parcelaNoMes = parcelaInicial + offset;
        if (offset >= 0 && parcelaNoMes <= totalParcelas) {
          const dProj = aplicarOverrideDespesa(d, mes);
          const dia = dProj.dataVencimento.slice(8, 10);
          result.push({
            ...dProj,
            ...baseOverride,
            _projectedMes: mes,
            _parcela: parcelaNoMes,
            dataVencimento: `${mes}-${dia}`,
          });
        }
      }
    }
    return result.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  },
});

// Validacao compartilhada para args de recorrencia.
function validarRecorrenciaDespesa(args: {
  tipo: "fixa" | "parcelada" | "avulsa";
  periodicidade?: "mensal" | "anual" | "sazonal";
  mesesSazonais?: number[];
}) {
  if (args.periodicidade && args.tipo !== "fixa") {
    throw new Error("Periodicidade só se aplica a despesas fixas (recorrentes).");
  }
  if (args.periodicidade === "sazonal") {
    const meses = args.mesesSazonais ?? [];
    if (meses.length === 0) {
      throw new Error("Selecione ao menos um mês para a recorrência sazonal.");
    }
    for (const m of meses) {
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new Error("Meses sazonais devem ser inteiros entre 1 e 12.");
      }
    }
  }
}

export const create = mutation({
  args: {
    sessionToken: v.string(),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.optional(v.id("pessoas")),
    contaId: v.optional(v.id("contas")),
    dataVencimento: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cat = await ctx.db.get(args.categoriaId);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Categoria inválida");
    if (args.contaId) {
      const conta = await ctx.db.get(args.contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }
    if (args.pessoaId) {
      const pessoa = await ctx.db.get(args.pessoaId);
      if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");
    }
    validarRecorrenciaDespesa(args);
    return await ctx.db.insert("despesas", {
      ...args,
      pago: false,
      criadoPor: user._id,
      familyId: user.familyId,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const togglePago = mutation({
  args: { sessionToken: v.string(), id: v.id("despesas"), mes: v.string() },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");

    const existente = await ctx.db
      .query("pagamentosDespesas")
      .withIndex("by_despesa_mes", (q) => q.eq("despesaId", id).eq("mes", mes))
      .unique();

    if (existente) {
      await ctx.db.delete(existente._id);
    } else {
      await ctx.db.insert("pagamentosDespesas", {
        despesaId: id,
        mes,
        dataPagamento: new Date().toISOString().slice(0, 10),
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
  },
});

export const getById = query({
  args: { sessionToken: v.string(), id: v.id("despesas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    return d;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.optional(v.id("pessoas")),
    contaId: v.optional(v.id("contas")),
    dataVencimento: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    const cat = await ctx.db.get(args.categoriaId);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Categoria inválida");
    if (args.contaId) {
      const conta = await ctx.db.get(args.contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }
    if (args.pessoaId) {
      const pessoa = await ctx.db.get(args.pessoaId);
      if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");
    }
    validarRecorrenciaDespesa(args);
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("despesas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});

// ===== Overrides por mes =====

export const setOverride = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    mes: v.string(), // YYYY-MM
    valor: v.optional(v.number()),
    descricao: v.optional(v.string()),
    dataVencimento: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, mes, valor, descricao, dataVencimento }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido (YYYY-MM)");

    const atuais = d.overrides ?? [];
    const semEsteMes = atuais.filter((o) => o.mes !== mes);
    // Se nada foi informado além do mês, remove o override existente.
    if (valor === undefined && descricao === undefined && dataVencimento === undefined) {
      await ctx.db.patch(id, { overrides: semEsteMes });
      return;
    }
    const novo: { mes: string; valor?: number; descricao?: string; dataVencimento?: string } = { mes };
    if (valor !== undefined) novo.valor = valor;
    if (descricao !== undefined) novo.descricao = descricao;
    if (dataVencimento !== undefined) novo.dataVencimento = dataVencimento;
    await ctx.db.patch(id, { overrides: [...semEsteMes, novo] });
  },
});

export const removerOverride = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("despesas"),
    mes: v.string(),
  },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const d = await ctx.db.get(id);
    if (!d || d.familyId !== user.familyId) throw new Error("Não encontrado");
    const atuais = d.overrides ?? [];
    await ctx.db.patch(id, { overrides: atuais.filter((o) => o.mes !== mes) });
  },
});
