"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const analisar = action({
  args: {
    sessionToken: v.string(),
    pdfBase64: v.string(),
  },
  handler: async (ctx, { sessionToken, pdfBase64 }) => {
    // Validar sessão
    const user = await ctx.runQuery(internal.auth.getUserByToken, { sessionToken });
    if (!user) throw new Error("Não autenticado");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada no servidor");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `Analise esta fatura de cartão de crédito ou extrato bancário brasileiro e extraia TODOS os lançamentos/compras.

Retorne APENAS um JSON válido (sem markdown, sem explicações, sem texto adicional) com este formato exato:
[{"descricao":"nome do estabelecimento","valor":1234,"categoria_sugerida":"Alimentação","parcela_atual":null,"total_parcelas":null}]

Regras obrigatórias:
- "valor" em centavos inteiro positivo. Exemplo: R$ 45,90 → 4590
- Ignore: totais, subtotais, pagamentos, créditos, estornos, encargos, juros, anuidades, IOF
- Inclua SOMENTE compras/débitos
- "categoria_sugerida" deve ser exatamente uma destas: Alimentação, Transporte, Saúde, Lazer, Educação, Moradia, Mercado, Outros
- Se o lançamento for parcelado (ex: "Loja 2/6", "Parcela 1/3"), preencha "parcela_atual" e "total_parcelas" com os números inteiros. Caso contrário deixe null
- Retorne array vazio [] se não encontrar lançamentos
- Sem comentários, sem markdown, apenas o JSON puro`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro na API Anthropic: ${response.status} — ${err}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const raw = data.content[0]?.text?.trim() ?? "[]";
    // Remover possível markdown
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const items = JSON.parse(clean) as Array<{
        descricao: string;
        valor: number;
        categoria_sugerida: string;
        parcela_atual: number | null;
        total_parcelas: number | null;
      }>;
      return items.map((it) => ({
        descricao: String(it.descricao ?? "").trim(),
        valor: Math.abs(Math.round(Number(it.valor) || 0)),
        categoria_sugerida: String(it.categoria_sugerida ?? "Outros"),
        parcela_atual: it.parcela_atual ? Math.round(Number(it.parcela_atual)) : null,
        total_parcelas: it.total_parcelas ? Math.round(Number(it.total_parcelas)) : null,
      }));
    } catch {
      throw new Error("A IA não retornou um formato válido. Tente novamente.");
    }
  },
});
