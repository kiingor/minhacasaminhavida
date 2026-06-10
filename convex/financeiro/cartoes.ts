import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUser } from "../_helpers";
import { normalizarNomeCartao } from "./cartaoCiclo";

// ===== Ponto único de escrita do vínculo despesa<->cartão =====
// Resolve o par (cartao string, cartaoId) de forma consistente a partir de
// QUALQUER entrada, garantindo que toda gravação de despesa-cartão tenha ambos
// alinhados (o nome canônico do cartão + a FK). Usado por despesas.create/update
// e pelos inserts diretos do agente (drafts.ts), que antes só gravavam a string.
export async function resolverCartaoEscrita(
  ctx: QueryCtx | MutationCtx,
  familyId: string,
  input: { cartao?: string; cartaoId?: Id<"cartoes"> }
): Promise<{ cartao?: string; cartaoId?: Id<"cartoes"> }> {
  // 1. cartaoId é a fonte de verdade: valida família e usa o nome canônico.
  if (input.cartaoId) {
    const c = await ctx.db.get(input.cartaoId);
    if (!c || c.familyId !== familyId) throw new Error("Cartão inválido");
    return { cartaoId: input.cartaoId, cartao: c.nome };
  }
  // 2. Só veio o nome (string): tenta casar com um cartão cadastrado (normalizado).
  const nome = input.cartao?.trim();
  if (!nome) return { cartao: undefined, cartaoId: undefined };
  const cartoes = await ctx.db
    .query("cartoes")
    .withIndex("by_family", (q) => q.eq("familyId", familyId))
    .collect();
  const alvo = normalizarNomeCartao(nome);
  const match = cartoes.find((c) => normalizarNomeCartao(c.nome) === alvo);
  // Mantém a string original como rótulo (compat) e liga a FK se casou.
  return { cartao: match ? match.nome : nome, cartaoId: match?._id };
}

// Valida os campos de ciclo (todos opcionais). Lança em valores inconsistentes.
function validarCicloCartao(args: {
  limiteTotal?: number;
  diaFechamento?: number;
  diaVencimento?: number;
}) {
  if (args.limiteTotal !== undefined && (args.limiteTotal < 0 || !Number.isFinite(args.limiteTotal))) {
    throw new Error("Limite inválido");
  }
  for (const [campo, val] of [
    ["diaFechamento", args.diaFechamento],
    ["diaVencimento", args.diaVencimento],
  ] as const) {
    if (val !== undefined && (!Number.isInteger(val) || val < 1 || val > 31)) {
      throw new Error(`${campo} deve ser um dia entre 1 e 31`);
    }
  }
  if (
    args.diaFechamento !== undefined &&
    args.diaVencimento !== undefined &&
    args.diaFechamento === args.diaVencimento
  ) {
    throw new Error("Dia de fechamento e vencimento não podem ser iguais");
  }
}

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    return await ctx.db
      .query("cartoes")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    bandeira: v.optional(v.string()),
    cor: v.string(),
    limiteTotal: v.optional(v.number()),
    diaFechamento: v.optional(v.number()),
    diaVencimento: v.optional(v.number()),
    ativo: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    validarCicloCartao(args);
    return await ctx.db.insert("cartoes", { ...args, familyId: user.familyId });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("cartoes"),
    nome: v.optional(v.string()),
    bandeira: v.optional(v.string()),
    cor: v.optional(v.string()),
    limiteTotal: v.optional(v.number()),
    diaFechamento: v.optional(v.number()),
    diaVencimento: v.optional(v.number()),
    ativo: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");
    validarCicloCartao(rest);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("cartoes") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c || c.familyId !== user.familyId) throw new Error("Não encontrado");
    await ctx.db.delete(id);
  },
});

// Backfill idempotente: liga despesas antigas (com `cartao` string mas sem
// cartaoId) ao cartão cadastrado, casando por nome normalizado. Reaproveitável
// p/ o índice by_family_cartao (Fase 3) e robustez a renomeações. Retorna
// relatório com órfãs (nomes que não casaram com nenhum cartão cadastrado).
export const migrarCartaoIds = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, cartoes] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("cartoes").withIndex("by_family", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const porNome = new Map(cartoes.map((c) => [normalizarNomeCartao(c.nome), c]));
    let ligadas = 0;
    let totalComCartao = 0;
    const orfasSet = new Set<string>();
    const orfas: string[] = [];
    for (const d of despesas) {
      if (!d.cartao) continue;
      totalComCartao++;
      if (d.cartaoId) continue;
      const match = porNome.get(normalizarNomeCartao(d.cartao));
      if (match) {
        await ctx.db.patch(d._id, { cartao: match.nome, cartaoId: match._id });
        ligadas++;
      } else if (!orfasSet.has(d.cartao)) {
        orfasSet.add(d.cartao);
        orfas.push(d.cartao);
      }
    }
    return { ligadas, orfas, totalComCartao };
  },
});
