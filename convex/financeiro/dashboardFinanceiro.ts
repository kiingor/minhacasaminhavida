import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isDespesaInMes(d: any, mes: string): boolean {
  const origMes = d.dataVencimento.slice(0, 7);
  if (d.tipo === "avulsa") return origMes === mes;
  if (d.tipo === "fixa") return mes >= origMes;
  if (d.tipo === "parcelada") {
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && offset < (d.totalParcelas ?? 1);
  }
  return false;
}

function isReceitaInMes(r: any, mes: string): boolean {
  const origMes = r.dataPrevisao.slice(0, 7);
  if (r.tipo === "avulsa") return origMes === mes;
  if (r.tipo === "fixa") return mes >= origMes;
  if (r.tipo === "parcelada") {
    const offset = monthDiff(origMes, mes);
    return offset >= 0 && offset < (r.totalParcelas ?? 1);
  }
  return false;
}

export const resumoMes = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));

    const totalDespesas = dMes.reduce((s, d) => s + d.valor, 0);
    const totalReceitas = rMes.reduce((s, r) => s + r.valor, 0);
    const pagas = dMes.filter((d) => d.pago).reduce((s, d) => s + d.valor, 0);
    const recebidas = rMes.filter((r) => r.recebido).reduce((s, r) => s + r.valor, 0);

    return {
      totalDespesas,
      totalReceitas,
      saldo: totalReceitas - totalDespesas,
      aPagar: totalDespesas - pagas,
      aReceber: totalReceitas - recebidas,
      economia: recebidas - pagas,
    };
  },
});

// Pizza: despesas por categoria
export const despesasPorCategoria = query({
  args: { sessionToken: v.string(), mes: v.string() },
  handler: async (ctx, { sessionToken, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, categorias] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("categorias").withIndex("by_family_tipo", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const map = new Map<string, number>();
    for (const d of dMes) {
      map.set(d.categoriaId, (map.get(d.categoriaId) ?? 0) + d.valor);
    }
    return Array.from(map.entries()).map(([catId, valor]) => {
      const cat = categorias.find((c) => c._id === catId);
      return { label: cat?.nome ?? "?", valor, cor: cat?.cor ?? "#94A3B8" };
    });
  },
});

// Barras: receitas vs despesas últimos 6 meses
export const historico6Meses = query({
  args: { sessionToken: v.string(), mesAtual: v.string() },
  handler: async (ctx, { sessionToken, mesAtual }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const [despesas, receitas] = await Promise.all([
      ctx.db.query("despesas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
      ctx.db.query("receitas").withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId)).collect(),
    ]);
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const mes = shiftMonth(mesAtual, -i);
      const totalD = despesas.filter((d) => isDespesaInMes(d, mes)).reduce((s, d) => s + d.valor, 0);
      const totalR = receitas.filter((r) => isReceitaInMes(r, mes)).reduce((s, r) => s + r.valor, 0);
      result.push({ mes, despesas: totalD, receitas: totalR, saldo: totalR - totalD });
    }
    return result;
  },
});

// Próximas contas a vencer (10)
export const proximasContas = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const hoje = new Date().toISOString().slice(0, 10);
    const mesAtual = hoje.slice(0, 7);
    const despesas = await ctx.db
      .query("despesas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();
    return despesas
      .filter((d) => isDespesaInMes(d, mesAtual) && !d.pago)
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .slice(0, 10);
  },
});
