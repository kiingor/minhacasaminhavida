import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id, Doc } from "../_generated/dataModel";

// ==================== Helpers de calculo (espelham dashboardFinanceiro) ====================

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function isDespesaInMes(d: Doc<"despesas">, mes: string): boolean {
  const origMes = d.dataVencimento.slice(0, 7);
  if (d.tipo === "avulsa") return origMes === mes;
  if (d.tipo === "fixa") {
    if (mes < origMes) return false;
    const periodicidade = d.periodicidade ?? "mensal";
    if (periodicidade === "mensal") return true;
    const mesAlvoNum = Number(mes.slice(5, 7));
    if (periodicidade === "anual") {
      return Number(origMes.slice(5, 7)) === mesAlvoNum;
    }
    const meses: number[] = d.mesesSazonais ?? [];
    return meses.includes(mesAlvoNum);
  }
  if (d.tipo === "parcelada") {
    const parcelaInicial = d.parcelaAtual ?? 1;
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && parcelaInicial + offset <= (d.totalParcelas ?? 1);
  }
  return false;
}

function valorDespesaNoMes(d: Doc<"despesas">, mes: string): number {
  const ov = (d.overrides ?? []).find((o) => o.mes === mes);
  if (ov && typeof ov.valor === "number") return ov.valor;
  return d.valor;
}

function statusDoPercentual(percentual: number): "ok" | "atencao" | "estourada" {
  if (percentual >= 100) return "estourada";
  if (percentual >= 80) return "atencao";
  return "ok";
}

// ==================== Mutations ====================

export const setLimite = mutation({
  args: {
    sessionToken: v.string(),
    categoriaId: v.id("categorias"),
    mes: v.string(),
    valorLimite: v.number(),
  },
  handler: async (ctx, { sessionToken, categoriaId, mes, valorLimite }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    if (!/^\d{4}-\d{2}$/.test(mes)) {
      throw new Error("Mês inválido. Use formato YYYY-MM.");
    }
    if (!Number.isFinite(valorLimite) || valorLimite < 0) {
      throw new Error("Valor do limite deve ser >= 0.");
    }

    const categoria = await ctx.db.get(categoriaId);
    if (!categoria || categoria.familyId !== user.familyId) {
      throw new Error("Categoria inválida.");
    }
    if (categoria.tipo !== "despesa") {
      throw new Error("Limites só podem ser definidos em categorias de despesa.");
    }

    const existente = await ctx.db
      .query("limitesOrcamento")
      .withIndex("by_categoria_mes", (q) => q.eq("categoriaId", categoriaId).eq("mes", mes))
      .first();

    // valorLimite=0 -> deletar
    if (valorLimite === 0) {
      if (existente && existente.familyId === user.familyId) {
        await ctx.db.delete(existente._id);
      }
      return null;
    }

    if (existente) {
      if (existente.familyId !== user.familyId) {
        throw new Error("Limite inválido.");
      }
      await ctx.db.patch(existente._id, { valorLimite });
      return existente._id;
    }

    return await ctx.db.insert("limitesOrcamento", {
      categoriaId,
      mes,
      valorLimite,
      familyId: user.familyId,
      criadoPor: user._id,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const removerLimite = mutation({
  args: {
    sessionToken: v.string(),
    categoriaId: v.id("categorias"),
    mes: v.string(),
  },
  handler: async (ctx, { sessionToken, categoriaId, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const existente = await ctx.db
      .query("limitesOrcamento")
      .withIndex("by_categoria_mes", (q) => q.eq("categoriaId", categoriaId).eq("mes", mes))
      .first();
    if (existente && existente.familyId === user.familyId) {
      await ctx.db.delete(existente._id);
    }
  },
});

export const copiarMesAnterior = mutation({
  args: {
    sessionToken: v.string(),
    mesOrigem: v.string(),
    mesDestino: v.string(),
    sobrescrever: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, mesOrigem, mesDestino, sobrescrever }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (!/^\d{4}-\d{2}$/.test(mesOrigem) || !/^\d{4}-\d{2}$/.test(mesDestino)) {
      throw new Error("Mês inválido. Use formato YYYY-MM.");
    }
    if (mesOrigem === mesDestino) {
      throw new Error("Mês origem e destino são iguais.");
    }

    const limitesOrigem = await ctx.db
      .query("limitesOrcamento")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mesOrigem))
      .collect();

    if (limitesOrigem.length === 0) {
      return { copiados: 0, ignorados: 0 };
    }

    const limitesDestino = await ctx.db
      .query("limitesOrcamento")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mesDestino))
      .collect();
    const destinoMap = new Map(limitesDestino.map((l) => [l.categoriaId as string, l]));

    let copiados = 0;
    let ignorados = 0;
    const agora = new Date().toISOString();

    for (const l of limitesOrigem) {
      // Verifica se categoria ainda existe e e da familia
      const cat = await ctx.db.get(l.categoriaId);
      if (!cat || cat.familyId !== user.familyId || cat.tipo !== "despesa") {
        ignorados++;
        continue;
      }

      const jaExiste = destinoMap.get(l.categoriaId as string);
      if (jaExiste) {
        if (sobrescrever) {
          await ctx.db.patch(jaExiste._id, { valorLimite: l.valorLimite });
          copiados++;
        } else {
          ignorados++;
        }
        continue;
      }

      await ctx.db.insert("limitesOrcamento", {
        categoriaId: l.categoriaId,
        mes: mesDestino,
        valorLimite: l.valorLimite,
        familyId: user.familyId,
        criadoPor: user._id,
        criadoEm: agora,
      });
      copiados++;
    }

    return { copiados, ignorados };
  },
});

// ==================== Queries ====================

type SubItem = {
  categoriaId: Id<"categorias">;
  nome: string;
  cor: string;
  icone: string;
  limite: number;
  realizado: number;
  percentual: number;
  status: "ok" | "atencao" | "estourada" | "sem_limite";
};

type Item = SubItem & {
  subcategorias: SubItem[];
};

export const listMes = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    const [despesas, categorias, limites] = await Promise.all([
      ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
        .collect(),
      ctx.db
        .query("categorias")
        .withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId).eq("tipo", "despesa"))
        .collect(),
      ctx.db
        .query("limitesOrcamento")
        .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId).eq("mes", mes))
        .collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));

    // Realizado por categoria (sem consolidar — cada folha tem o seu)
    const realizadoPorCat = new Map<string, number>();
    for (const d of dMes) {
      const v = valorDespesaNoMes(d, mes);
      const k = d.categoriaId as string;
      realizadoPorCat.set(k, (realizadoPorCat.get(k) ?? 0) + v);
    }

    // Limite por categoria (filhas = override; mae = soma quando nao tem limite proprio)
    const limitePorCat = new Map<string, number>();
    for (const l of limites) {
      // ignora limite orfao (categoria nao existe / outro tipo)
      const cat = categorias.find((c) => c._id === l.categoriaId);
      if (!cat) continue;
      limitePorCat.set(l.categoriaId as string, l.valorLimite);
    }

    const maes = categorias
      .filter((c) => !c.categoriaPaiId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const filhasPorPai = new Map<string, Doc<"categorias">[]>();
    for (const c of categorias) {
      if (c.categoriaPaiId) {
        const k = c.categoriaPaiId as string;
        if (!filhasPorPai.has(k)) filhasPorPai.set(k, []);
        filhasPorPai.get(k)!.push(c);
      }
    }
    for (const arr of filhasPorPai.values()) {
      arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }

    function buildItem(cat: Doc<"categorias">, realizado: number, limite: number): SubItem {
      const percentual = limite > 0 ? (realizado / limite) * 100 : 0;
      const status: SubItem["status"] =
        limite === 0 ? "sem_limite" : statusDoPercentual(percentual);
      return {
        categoriaId: cat._id,
        nome: cat.nome,
        cor: cat.cor,
        icone: cat.icone,
        limite,
        realizado,
        percentual: Math.round(percentual),
        status,
      };
    }

    const itens: Item[] = [];

    for (const mae of maes) {
      const filhas = filhasPorPai.get(mae._id as string) ?? [];

      // Realizado da mae = realizado proprio + soma das filhas
      const realizadoMae = realizadoPorCat.get(mae._id as string) ?? 0;
      const realizadoFilhas = filhas.reduce(
        (s, f) => s + (realizadoPorCat.get(f._id as string) ?? 0),
        0
      );
      const realizadoTotal = realizadoMae + realizadoFilhas;

      // Limite da mae: prioridade ao limite explicito da mae;
      // se nao tem, soma os limites das filhas
      const limiteMaeExplicito = limitePorCat.get(mae._id as string);
      const limiteFilhasSoma = filhas.reduce(
        (s, f) => s + (limitePorCat.get(f._id as string) ?? 0),
        0
      );
      const limiteTotal = limiteMaeExplicito ?? limiteFilhasSoma;

      const subItens: SubItem[] = filhas
        .map((f) => {
          const realizadoF = realizadoPorCat.get(f._id as string) ?? 0;
          const limiteF = limitePorCat.get(f._id as string) ?? 0;
          return buildItem(f, realizadoF, limiteF);
        })
        // Se nao tem limite e realizado=0, oculta da subcategoria
        .filter((s) => s.limite > 0 || s.realizado > 0);

      // Item mae: so aparece se ela ou alguma filha tem limite OU realizado > 0
      const algumLimite = limiteTotal > 0;
      const algumRealizado = realizadoTotal > 0;
      if (!algumLimite && !algumRealizado) continue;

      itens.push({
        ...buildItem(mae, realizadoTotal, limiteTotal),
        subcategorias: subItens,
      });
    }

    // Categorias filhas orfas (pai removido ou outro tipo) — tratamos como mae sem filhas
    const orfas = categorias.filter(
      (c) => c.categoriaPaiId && !maes.find((m) => m._id === c.categoriaPaiId)
    );
    for (const o of orfas) {
      const realizado = realizadoPorCat.get(o._id as string) ?? 0;
      const limite = limitePorCat.get(o._id as string) ?? 0;
      if (limite === 0 && realizado === 0) continue;
      itens.push({
        ...buildItem(o, realizado, limite),
        subcategorias: [],
      });
    }

    // Ordenacao: estouradas > atencao > ok > sem_limite; dentro do grupo por percentual desc
    const ordemStatus: Record<SubItem["status"], number> = {
      estourada: 0,
      atencao: 1,
      ok: 2,
      sem_limite: 3,
    };
    itens.sort((a, b) => {
      const ds = ordemStatus[a.status] - ordemStatus[b.status];
      if (ds !== 0) return ds;
      // Mesmo status: maior percentual no topo (sem_limite -> maior realizado)
      if (a.status === "sem_limite") return b.realizado - a.realizado;
      return b.percentual - a.percentual;
    });

    return itens;
  },
});
