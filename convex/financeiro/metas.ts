import { v } from "convex/values";
import { query, mutation, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Doc, Id } from "../_generated/dataModel";

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
  },
});

export const aportes = query({
  args: { sessionToken: v.string(), metaId: v.id("metas") },
  handler: async (ctx, { sessionToken, metaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(metaId);
    if (!meta || meta.familyId !== user.familyId) throw new Error("Meta não encontrada");
    return await ctx.db
      .query("aportesMeta")
      .withIndex("by_meta", (q) => q.eq("metaId", metaId))
      .order("desc")
      .collect();
  },
});

// Diferenca em meses entre hoje e prazo (YYYY-MM-DD). Sempre >= 1.
function mesesAteData(prazo: string): number {
  const [py, pm, pd] = prazo.split("-").map(Number);
  if (!py || !pm || !pd) return 1;
  const hoje = new Date();
  const hy = hoje.getFullYear();
  const hm = hoje.getMonth() + 1; // 1..12
  const hd = hoje.getDate();
  let meses = (py - hy) * 12 + (pm - hm);
  // ajusta se o dia do mes ja passou no mes corrente
  if (pd < hd) meses -= 1;
  return Math.max(1, meses);
}

export interface MetaComAporte extends Doc<"metas"> {
  aporteSugeridoMensal: number;
  percentual: number;
  mesesRestantes: number;
  semPrazo: boolean;
  prazoVencido: boolean;
  concluida: boolean;
}

function calcularMetaComAporte(meta: Doc<"metas">, hoje: string): MetaComAporte {
  const restante = Math.max(0, meta.valorAlvo - meta.valorAtual);
  const concluida = meta.valorAtual >= meta.valorAlvo;
  const percentual = meta.valorAlvo > 0
    ? Math.min(100, (meta.valorAtual / meta.valorAlvo) * 100)
    : 0;

  const semPrazo = !meta.prazo;
  const prazoVencido = !!meta.prazo && meta.prazo < hoje;
  const meses = meta.prazo ? mesesAteData(meta.prazo) : 1;

  let aporteSugeridoMensal = 0;
  if (!concluida) {
    if (semPrazo || prazoVencido) {
      // Sem prazo ou vencido: sugere quitar o restante
      aporteSugeridoMensal = restante;
    } else {
      aporteSugeridoMensal = Math.ceil(restante / meses);
    }
  }

  return {
    ...meta,
    aporteSugeridoMensal,
    percentual,
    mesesRestantes: semPrazo ? 0 : meses,
    semPrazo,
    prazoVencido,
    concluida,
  };
}

export const comAporteSugerido = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }): Promise<{
    reserva: MetaComAporte | null;
    outras: MetaComAporte[];
  }> => {
    const user = await getCurrentUser(ctx, sessionToken);
    const metas = await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();

    const ativas = metas.filter((m) => m.ativa);
    const hoje = new Date().toISOString().slice(0, 10);

    let reserva: MetaComAporte | null = null;
    const outras: MetaComAporte[] = [];

    for (const meta of ativas) {
      const enriched = calcularMetaComAporte(meta, hoje);
      if (meta.tipoEspecial === "reserva_emergencia") {
        // Apenas uma reserva ativa por familia (mantemos a primeira encontrada).
        if (!reserva) reserva = enriched;
        else outras.push(enriched); // fallback: se houver mais de uma, a 2a vai pra lista
      } else {
        outras.push(enriched);
      }
    }

    return { reserva, outras };
  },
});

// ============================================================================
// MARCO 2.B - Reserva de Emergencia
// ============================================================================

// Helpers replicados de dashboardFinanceiro para nao criar acoplamento.
function shiftMonthMetas(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isDespesaInMesMetas(d: Doc<"despesas">, mes: string): boolean {
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
    const [fy, fm] = origMes.split("-").map(Number);
    const [ty, tm] = mes.split("-").map(Number);
    const offset = (ty - fy) * 12 + (tm - fm);
    const parcelaInicial = d.parcelaAtual ?? 1;
    return offset >= 0 && parcelaInicial + offset <= (d.totalParcelas ?? 1);
  }
  return false;
}

function valorDespesaNoMesMetas(d: Doc<"despesas">, mes: string): number {
  const ov = (d.overrides ?? []).find((o) => o.mes === mes);
  if (ov && typeof ov.valor === "number") return ov.valor;
  return d.valor;
}

// Total de despesas (projetadas) num determinado mes para a familia.
async function totalDespesasNoMes(
  ctx: QueryCtx,
  familyId: string,
  mes: string
): Promise<number> {
  const despesas = await ctx.db
    .query("despesas")
    .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
    .collect();
  return despesas
    .filter((d) => isDespesaInMesMetas(d, mes))
    .reduce((s, d) => s + valorDespesaNoMesMetas(d, mes), 0);
}

// Mes atual no formato YYYY-MM, em fuso local.
function mesAtualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Calcula media das despesas dos ultimos N meses (por padrao 3),
// considerando os meses ANTERIORES ao atual (mes corrente em curso costuma ter
// dados parciais). Retorna em centavos.
async function calcularMediaDespesasInterno(
  ctx: QueryCtx,
  familyId: string,
  meses: number
): Promise<number> {
  const N = Math.max(1, Math.min(Math.floor(meses), 12));
  const mesAtual = mesAtualISO();
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const m = shiftMonthMetas(mesAtual, -i);
    total += await totalDespesasNoMes(ctx, familyId, m);
  }
  return Math.round(total / N);
}

export const mediaDespesasMensais = query({
  args: {
    sessionToken: v.string(),
    meses: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, meses }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const N = typeof meses === "number" && meses > 0 ? Math.floor(meses) : 3;
    const media = await calcularMediaDespesasInterno(ctx, user.familyId, N);
    return { media, mesesAnalisados: N };
  },
});

export interface ReservaEmergenciaInfo {
  meta: MetaComAporte | null;
  mediaDespesas3m: number; // centavos
  aporteSugerido: number; // centavos
  mesesRestantes: number; // 0 se nao calculavel
  valorAlvoSugerido: number; // centavos (se nao houver meta ainda)
  mesesCoberturaSugerido: number; // 6 default
}

export const getReservaEmergencia = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }): Promise<ReservaEmergenciaInfo> => {
    const user = await getCurrentUser(ctx, sessionToken);
    const metas = await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const reserva = metas.find(
      (m) => m.ativa && m.tipoEspecial === "reserva_emergencia"
    );

    const mediaDespesas3m = await calcularMediaDespesasInterno(ctx, user.familyId, 3);
    const mesesCoberturaSugerido = 6;
    const valorAlvoSugerido = mediaDespesas3m * mesesCoberturaSugerido;

    if (!reserva) {
      return {
        meta: null,
        mediaDespesas3m,
        aporteSugerido: 0,
        mesesRestantes: 0,
        valorAlvoSugerido,
        mesesCoberturaSugerido,
      };
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const enriched = calcularMetaComAporte(reserva, hoje);
    return {
      meta: enriched,
      mediaDespesas3m,
      aporteSugerido: enriched.aporteSugeridoMensal,
      mesesRestantes: enriched.mesesRestantes,
      valorAlvoSugerido,
      mesesCoberturaSugerido,
    };
  },
});

export const criarReservaEmergencia = mutation({
  args: {
    sessionToken: v.string(),
    mesesCobertura: v.number(),
    valorAlvoManual: v.optional(v.number()), // override quando nao ha historico
  },
  handler: async (ctx, { sessionToken, mesesCobertura, valorAlvoManual }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    if (!Number.isInteger(mesesCobertura) || mesesCobertura < 3 || mesesCobertura > 12) {
      throw new Error("Meses de cobertura deve ser inteiro entre 3 e 12.");
    }

    // Garante que so existe uma reserva ativa.
    const metas = await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
    const existente = metas.find(
      (m) => m.ativa && m.tipoEspecial === "reserva_emergencia"
    );
    if (existente) {
      throw new Error("Ja existe uma reserva de emergencia ativa.");
    }

    const media = await calcularMediaDespesasInterno(ctx, user.familyId, 3);
    const calculado = media * mesesCobertura;
    let valorAlvo = calculado;
    if (calculado <= 0) {
      // Sem historico: exige valorAlvoManual.
      if (!valorAlvoManual || valorAlvoManual <= 0) {
        throw new Error(
          "Sem historico de despesas suficiente. Informe um valor alvo manualmente."
        );
      }
      valorAlvo = valorAlvoManual;
    }

    return await ctx.db.insert("metas", {
      titulo: "Reserva de Emergencia",
      descricao: `${mesesCobertura} meses de despesas cobertas`,
      valorAlvo,
      valorAtual: 0,
      icone: "Shield",
      cor: "#10B981",
      ativa: true,
      tipoEspecial: "reserva_emergencia",
      mesesCobertura,
      familyId: user.familyId,
      criadoPor: user._id,
    });
  },
});

export const atualizarMesesCobertura = mutation({
  args: {
    sessionToken: v.string(),
    metaId: v.id("metas"),
    mesesCobertura: v.number(),
  },
  handler: async (ctx, { sessionToken, metaId, mesesCobertura }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(metaId);
    if (!meta || meta.familyId !== user.familyId) {
      throw new Error("Meta nao encontrada.");
    }
    if (meta.tipoEspecial !== "reserva_emergencia") {
      throw new Error("Operacao valida apenas para Reserva de Emergencia.");
    }
    if (!Number.isInteger(mesesCobertura) || mesesCobertura < 3 || mesesCobertura > 12) {
      throw new Error("Meses de cobertura deve ser inteiro entre 3 e 12.");
    }
    const media = await calcularMediaDespesasInterno(ctx, user.familyId, 3);
    const novoAlvo = media * mesesCobertura;
    // Se nao ha historico, mantem o valorAlvo atual; usuario pode editar manualmente
    // pelo MetaForm se quiser. Caso queira recalcular totalmente, ajusta apenas
    // mesesCobertura sem zerar.
    const patch: Record<string, unknown> = { mesesCobertura };
    if (novoAlvo > 0) patch.valorAlvo = novoAlvo;
    patch.descricao = `${mesesCobertura} meses de despesas cobertas`;
    await ctx.db.patch(metaId, patch);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    titulo: v.string(),
    descricao: v.optional(v.string()),
    valorAlvo: v.number(),
    prazo: v.optional(v.string()),
    icone: v.string(),
    cor: v.string(),
    fotoStorageId: v.optional(v.id("_storage")),
    fotoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    // Se vier fotoStorageId, materializa fotoUrl a partir do storage
    let fotoUrl = args.fotoUrl;
    if (args.fotoStorageId) {
      fotoUrl = (await ctx.storage.getUrl(args.fotoStorageId)) ?? undefined;
    }

    return await ctx.db.insert("metas", {
      ...args,
      fotoUrl,
      valorAtual: 0,
      ativa: true,
      familyId: user.familyId,
      criadoPor: user._id,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("metas"),
    titulo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    valorAlvo: v.optional(v.number()),
    prazo: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
    // Foto: passe fotoStorageId para fazer upload novo, fotoUrl para URL externa,
    // ou removerFoto: true para limpar.
    fotoStorageId: v.optional(v.id("_storage")),
    fotoUrl: v.optional(v.string()),
    removerFoto: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { sessionToken, id, fotoStorageId, fotoUrl, removerFoto, ...rest }
  ) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(id);
    if (!meta || meta.familyId !== user.familyId) {
      throw new Error("Meta não encontrada");
    }

    const updates: Record<string, unknown> = { ...rest };

    if (removerFoto) {
      updates.fotoStorageId = undefined;
      updates.fotoUrl = undefined;
    } else if (fotoStorageId) {
      updates.fotoStorageId = fotoStorageId;
      updates.fotoUrl = (await ctx.storage.getUrl(fotoStorageId)) ?? undefined;
    } else if (fotoUrl !== undefined) {
      // URL externa explicita (sem storage)
      updates.fotoStorageId = undefined;
      updates.fotoUrl = fotoUrl;
    }

    await ctx.db.patch(id, updates);
  },
});

async function obterCategoriaMetas(ctx: any, familyId: string) {
  const categorias = await ctx.db
    .query("categorias")
    .withIndex("by_family_tipo", (q: any) => q.eq("familyId", familyId).eq("tipo", "despesa"))
    .collect();
  const existente = categorias.find((c: any) => c.nome === "Metas / Poupança");
  if (existente) return existente._id;
  return await ctx.db.insert("categorias", {
    nome: "Metas / Poupança",
    tipo: "despesa",
    icone: "PiggyBank",
    cor: "#6366F1",
    familyId,
  });
}

export const addAporte = mutation({
  args: {
    sessionToken: v.string(),
    metaId: v.id("metas"),
    valor: v.number(),
    observacao: v.optional(v.string()),
    data: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, metaId, valor, observacao, data }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(metaId);
    if (!meta || meta.familyId !== user.familyId) throw new Error("Meta não encontrada");
    if (valor <= 0) throw new Error("Valor do aporte deve ser maior que zero");
    const dataAporte = data ?? new Date().toISOString().slice(0, 10);

    await ctx.db.insert("aportesMeta", {
      metaId,
      valor,
      data: dataAporte,
      observacao,
      familyId: user.familyId,
    });
    await ctx.db.patch(metaId, { valorAtual: meta.valorAtual + valor });

    const categoriaId = await obterCategoriaMetas(ctx, user.familyId);
    await ctx.db.insert("despesas", {
      descricao: `Aporte: ${meta.titulo}`,
      valor,
      tipo: "avulsa",
      categoriaId: categoriaId as Id<"categorias">,
      dataVencimento: dataAporte,
      dataPagamento: dataAporte,
      pago: true,
      observacao,
      metaIdOrigem: metaId,
      criadoPor: user._id,
      familyId: user.familyId,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("metas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const meta = await ctx.db.get(id);
    if (!meta || meta.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.patch(id, { ativa: false });
  },
});

export const gerarUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await getCurrentUser(ctx, sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFotoUrl = query({
  args: { sessionToken: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { sessionToken, storageId }) => {
    await getCurrentUser(ctx, sessionToken);
    return await ctx.storage.getUrl(storageId);
  },
});
