import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Id } from "../_generated/dataModel";

// Gera uma URL temporária para upload de comprovante no Convex _storage.
// Mesmo padrão de pessoas.generateUploadUrl / agente.gerarUrlUpload.
export const gerarUrlUpload = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await getCurrentUser(ctx, sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

interface ComprovanteItem {
  id: string;
  origem: "despesa" | "receita";
  lancamentoId: string;
  descricao: string;
  valor: number;
  sinal: "+" | "-";
  data: string; // YYYY-MM-DD do pagamento/recebimento
  mes: string;
  storageId: string;
  url: string | null;
  contentType: string | null; // ex: "image/jpeg", "application/pdf"
}

interface GrupoComprovantes {
  categoriaId: string | null;
  categoriaNome: string;
  cor: string;
  icone?: string;
  total: number;
  itens: ComprovanteItem[];
}

// Lista todos os comprovantes da família, agrupados por categoria do lançamento.
export const listarPorCategoria = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }): Promise<GrupoComprovantes[]> => {
    const user = await getCurrentUser(ctx, sessionToken);
    const familyId = user.familyId;

    const [pagamentos, recebimentos, categorias] = await Promise.all([
      ctx.db
        .query("pagamentosDespesas")
        .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("recebimentosReceitas")
        .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("categorias")
        .withIndex("by_family_tipo", (q) => q.eq("familyId", familyId))
        .collect(),
    ]);

    const catMap = new Map(categorias.map((c) => [c._id as string, c]));
    const grupos = new Map<string, GrupoComprovantes>();

    function grupoDe(categoriaId: string | null): GrupoComprovantes {
      const key = categoriaId ?? "_sem";
      let g = grupos.get(key);
      if (!g) {
        const cat = categoriaId ? catMap.get(categoriaId) : undefined;
        g = {
          categoriaId,
          categoriaNome: cat?.nome ?? "Sem categoria",
          cor: cat?.cor ?? "#94A3B8",
          icone: cat?.icone,
          total: 0,
          itens: [],
        };
        grupos.set(key, g);
      }
      return g;
    }

    for (const p of pagamentos) {
      if (!p.comprovanteStorageId) continue;
      const d = await ctx.db.get(p.despesaId);
      if (!d) continue;
      const url = await ctx.storage.getUrl(p.comprovanteStorageId);
      const meta = await ctx.db.system.get(p.comprovanteStorageId);
      const g = grupoDe(d.categoriaId as string);
      g.itens.push({
        id: p._id as string,
        origem: "despesa",
        lancamentoId: p.despesaId as string,
        descricao: d.descricao,
        valor: p.valorPago ?? d.valor,
        sinal: "-",
        data: p.dataPagamento,
        mes: p.mes,
        storageId: p.comprovanteStorageId as string,
        url,
        contentType: meta?.contentType ?? null,
      });
      g.total += 1;
    }

    for (const r of recebimentos) {
      if (!r.comprovanteStorageId) continue;
      const rec = await ctx.db.get(r.receitaId);
      if (!rec) continue;
      const url = await ctx.storage.getUrl(r.comprovanteStorageId);
      const meta = await ctx.db.system.get(r.comprovanteStorageId);
      const g = grupoDe(rec.categoriaId as string);
      g.itens.push({
        id: r._id as string,
        origem: "receita",
        lancamentoId: r.receitaId as string,
        descricao: rec.descricao,
        valor: r.valorRecebido ?? rec.valor,
        sinal: "+",
        data: r.dataRecebimento,
        mes: r.mes,
        storageId: r.comprovanteStorageId as string,
        url,
        contentType: meta?.contentType ?? null,
      });
      g.total += 1;
    }

    return Array.from(grupos.values())
      .map((g) => ({
        ...g,
        itens: g.itens.sort((a, b) => b.data.localeCompare(a.data)),
      }))
      .sort((a, b) => b.total - a.total);
  },
});

// Remove o comprovante de um pagamento/recebimento (apaga o arquivo do storage também).
export const remover = mutation({
  args: {
    sessionToken: v.string(),
    origem: v.union(v.literal("despesa"), v.literal("receita")),
    id: v.string(), // _id do pagamento/recebimento
  },
  handler: async (ctx, { sessionToken, origem, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (origem === "despesa") {
      const p = await ctx.db.get(id as Id<"pagamentosDespesas">);
      if (!p || p.familyId !== user.familyId) throw new Error("Não encontrado");
      if (p.comprovanteStorageId) await ctx.storage.delete(p.comprovanteStorageId);
      await ctx.db.patch(p._id, { comprovanteStorageId: undefined });
    } else {
      const r = await ctx.db.get(id as Id<"recebimentosReceitas">);
      if (!r || r.familyId !== user.familyId) throw new Error("Não encontrado");
      if (r.comprovanteStorageId) await ctx.storage.delete(r.comprovanteStorageId);
      await ctx.db.patch(r._id, { comprovanteStorageId: undefined });
    }
  },
});
