import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function aplicarOverrideReceita<
  T extends {
    valor: number;
    descricao: string;
    dataPrevisao: string;
    overrides?: Array<{
      mes: string;
      valor?: number;
      descricao?: string;
      dataPrevisao?: string;
    }>;
  }
>(r: T, mes: string): T {
  const ov = (r.overrides ?? []).find((o) => o.mes === mes);
  if (!ov) return r;
  return {
    ...r,
    valor: ov.valor ?? r.valor,
    descricao: ov.descricao ?? r.descricao,
    dataPrevisao: ov.dataPrevisao ?? r.dataPrevisao,
  };
}

function fixaInMesReceita(
  r: { dataPrevisao: string; periodicidade?: "mensal" | "anual" | "sazonal"; mesesSazonais?: number[] },
  mes: string
): boolean {
  const origMes = r.dataPrevisao.slice(0, 7);
  if (mes < origMes) return false;
  const periodicidade = r.periodicidade ?? "mensal";
  if (periodicidade === "mensal") return true;
  const mesAlvoNum = Number(mes.slice(5, 7));
  if (periodicidade === "anual") {
    const mesOrigemNum = Number(origMes.slice(5, 7));
    return mesOrigemNum === mesAlvoNum;
  }
  const meses = r.mesesSazonais ?? [];
  return meses.includes(mesAlvoNum);
}

export const listByMonth = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [all, recebimentos] = await Promise.all([
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("recebimentosReceitas").withIndex("by_familia_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes)).collect(),
    ]);
    const recMap = new Map(recebimentos.map((r) => [r.receitaId as string, r]));

    const result: Array<Omit<typeof all[number], "recebido" | "dataRecebimento"> & { _projectedMes: string; _parcela?: number; recebido: boolean; dataRecebimento?: string }> = [];
    for (const r of all) {
      const origMes = r.dataPrevisao.slice(0, 7);
      const rec = recMap.get(r._id as string);
      const baseOverride = { recebido: !!rec, dataRecebimento: rec?.dataRecebimento };
      if (r.tipo === "avulsa") {
        if (origMes === mes) {
          const rProj = aplicarOverrideReceita(r, mes);
          result.push({ ...rProj, ...baseOverride, _projectedMes: mes });
        }
      } else if (r.tipo === "fixa") {
        if (fixaInMesReceita(r, mes)) {
          const rProj = aplicarOverrideReceita(r, mes);
          const dia = rProj.dataPrevisao.slice(8, 10);
          result.push({ ...rProj, ...baseOverride, _projectedMes: mes, dataPrevisao: `${mes}-${dia}` });
        }
      } else if (r.tipo === "parcelada") {
        const totalParcelas = r.totalParcelas ?? 1;
        const offset = monthDiff(origMes, mes);
        if (offset >= 0 && offset < totalParcelas) {
          const rProj = aplicarOverrideReceita(r, mes);
          const dia = rProj.dataPrevisao.slice(8, 10);
          result.push({
            ...rProj,
            ...baseOverride,
            _projectedMes: mes,
            _parcela: (r.parcelaAtual ?? 1) + offset,
            dataPrevisao: `${mes}-${dia}`,
          });
        }
      }
    }
    return result.sort((a, b) => a.dataPrevisao.localeCompare(b.dataPrevisao));
  },
});

function validarRecorrenciaReceita(args: {
  tipo: "fixa" | "parcelada" | "avulsa";
  periodicidade?: "mensal" | "anual" | "sazonal";
  mesesSazonais?: number[];
}) {
  if (args.periodicidade && args.tipo !== "fixa") {
    throw new Error("Periodicidade só se aplica a receitas fixas (recorrentes).");
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
    pessoaId: v.id("pessoas"),
    pagadorId: v.optional(v.id("pagadores")),
    pagadorNome: v.optional(v.string()),
    contaId: v.optional(v.id("contas")),
    dataPrevisao: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
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
    const pessoa = await ctx.db.get(args.pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");
    if (args.pagadorId) {
      const p = await ctx.db.get(args.pagadorId);
      if (!p || p.familyId !== user.familyId) throw new Error("Pagador inválido");
    }
    if (args.contaId) {
      const conta = await ctx.db.get(args.contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }
    validarRecorrenciaReceita(args);
    return await ctx.db.insert("receitas", {
      ...args,
      recebido: false,
      criadoPor: user._id,
      familyId: user.familyId,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const getById = query({
  args: { sessionToken: v.string(), id: v.id("receitas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    return r;
  },
});

export const toggleRecebido = mutation({
  args: { sessionToken: v.string(), id: v.id("receitas"), mes: v.string() },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");

    const existente = await ctx.db
      .query("recebimentosReceitas")
      .withIndex("by_receita_mes", (q) => q.eq("receitaId", id).eq("mes", mes))
      .unique();

    if (existente) {
      await ctx.db.delete(existente._id);
    } else {
      await ctx.db.insert("recebimentosReceitas", {
        receitaId: id,
        mes,
        dataRecebimento: new Date().toISOString().slice(0, 10),
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: new Date().toISOString(),
      });
    }
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("receitas"),
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.id("pessoas"),
    pagadorId: v.optional(v.id("pagadores")),
    pagadorNome: v.optional(v.string()),
    contaId: v.optional(v.id("contas")),
    dataPrevisao: v.string(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    recorrente: v.optional(v.boolean()),
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    const cat = await ctx.db.get(args.categoriaId);
    if (!cat || cat.familyId !== user.familyId) throw new Error("Categoria inválida");
    const pessoa = await ctx.db.get(args.pessoaId);
    if (!pessoa || pessoa.familyId !== user.familyId) throw new Error("Pessoa inválida");
    if (args.pagadorId) {
      const p = await ctx.db.get(args.pagadorId);
      if (!p || p.familyId !== user.familyId) throw new Error("Pagador inválido");
    }
    if (args.contaId) {
      const conta = await ctx.db.get(args.contaId);
      if (!conta || conta.familyId !== user.familyId) throw new Error("Conta inválida");
    }
    validarRecorrenciaReceita(args);
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("receitas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});

// ===== Overrides por mes =====

export const setOverride = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("receitas"),
    mes: v.string(),
    valor: v.optional(v.number()),
    descricao: v.optional(v.string()),
    dataPrevisao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, mes, valor, descricao, dataPrevisao }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido (YYYY-MM)");

    const atuais = r.overrides ?? [];
    const semEsteMes = atuais.filter((o) => o.mes !== mes);
    if (valor === undefined && descricao === undefined && dataPrevisao === undefined) {
      await ctx.db.patch(id, { overrides: semEsteMes });
      return;
    }
    const novo: { mes: string; valor?: number; descricao?: string; dataPrevisao?: string } = { mes };
    if (valor !== undefined) novo.valor = valor;
    if (descricao !== undefined) novo.descricao = descricao;
    if (dataPrevisao !== undefined) novo.dataPrevisao = dataPrevisao;
    await ctx.db.patch(id, { overrides: [...semEsteMes, novo] });
  },
});

export const removerOverride = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("receitas"),
    mes: v.string(),
  },
  handler: async (ctx, { sessionToken, id, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
    const atuais = r.overrides ?? [];
    await ctx.db.patch(id, { overrides: atuais.filter((o) => o.mes !== mes) });
  },
});
