"use node";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ============================================================
// Definições de TOOLS no formato esperado pela Anthropic API
// ============================================================
export const TOOL_DEFS = [
  {
    name: "obter_data_atual",
    description:
      "Retorna a data atual (YYYY-MM-DD), o mês atual (YYYY-MM), o dia da semana e útil para resolver expressões como 'hoje', 'ontem', 'esta semana'.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "resumo_mes",
    description:
      "Resumo financeiro do mês: total de despesas, total de receitas, saldo, valor a pagar, valor a receber, economia, e tendências comparadas ao mês anterior.",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string", description: "YYYY-MM" } },
      required: ["mes"],
    },
  },
  {
    name: "listar_despesas_mes",
    description:
      "Lista todas as despesas de um mês, com filtros opcionais. Devolve descrição, valor, categoria, status (paga/pendente), data de vencimento, parcela, cartão.",
    input_schema: {
      type: "object",
      properties: {
        mes: { type: "string", description: "YYYY-MM" },
        status: {
          type: "string",
          enum: ["todos", "pago", "pendente"],
          description: "Filtrar por status de pagamento (default: todos)",
        },
        categoria_nome: {
          type: "string",
          description: "Filtra apenas despesas dessa categoria (case-insensitive, contém)",
        },
        cartao: {
          type: "string",
          description: "Filtra apenas despesas pagas com esse cartão (contém)",
        },
        pessoa_nome: {
          type: "string",
          description: "Filtra apenas despesas atribuídas a essa pessoa (contém)",
        },
        limite: { type: "number", description: "Máximo de itens a retornar (default 50)" },
      },
      required: ["mes"],
    },
  },
  {
    name: "listar_receitas_mes",
    description: "Lista todas as receitas de um mês com filtros opcionais.",
    input_schema: {
      type: "object",
      properties: {
        mes: { type: "string", description: "YYYY-MM" },
        status: {
          type: "string",
          enum: ["todos", "recebido", "pendente"],
        },
        categoria_nome: { type: "string" },
        pagador_nome: { type: "string" },
        limite: { type: "number" },
      },
      required: ["mes"],
    },
  },
  {
    name: "listar_lancamentos_periodo",
    description:
      "Lista despesas e/ou receitas em um intervalo de datas arbitrário. Útil para 'esta semana', 'últimos 7 dias', 'entre dia X e Y'.",
    input_schema: {
      type: "object",
      properties: {
        data_inicio: { type: "string", description: "YYYY-MM-DD inclusive" },
        data_fim: { type: "string", description: "YYYY-MM-DD inclusive" },
        tipo: {
          type: "string",
          enum: ["despesas", "receitas", "ambos"],
          description: "Default ambos",
        },
      },
      required: ["data_inicio", "data_fim"],
    },
  },
  {
    name: "despesas_por_categoria",
    description: "Soma das despesas do mês agrupadas por categoria.",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string" } },
      required: ["mes"],
    },
  },
  {
    name: "receitas_por_categoria",
    description: "Soma das receitas do mês agrupadas por categoria.",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string" } },
      required: ["mes"],
    },
  },
  {
    name: "gastos_por_pessoa",
    description: "Quanto cada membro da família gastou no mês (total, pago, pendente).",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string" } },
      required: ["mes"],
    },
  },
  {
    name: "receitas_por_pagador",
    description: "Top pagadores (quem pagou ao usuário) no mês, com total e percentual.",
    input_schema: {
      type: "object",
      properties: {
        mes: { type: "string" },
        limite: { type: "number" },
      },
      required: ["mes"],
    },
  },
  {
    name: "historico_meses",
    description:
      "Histórico mês a mês de despesas, receitas e saldo. Use para comparativos longos. Retorna 6 ou 12 meses.",
    input_schema: {
      type: "object",
      properties: {
        mes_referencia: { type: "string", description: "YYYY-MM, mês final do histórico" },
        meses: { type: "number", enum: [6, 12], description: "Quantos meses voltar (default 6)" },
      },
      required: ["mes_referencia"],
    },
  },
  {
    name: "evolucao_categorias",
    description:
      "Evolução de cada categoria de despesa nos últimos 3 meses, com variação percentual.",
    input_schema: {
      type: "object",
      properties: { mes_referencia: { type: "string" } },
      required: ["mes_referencia"],
    },
  },
  {
    name: "categorias_estouradas",
    description: "Top categorias de despesa que cresceram mais de 20% em relação ao mês anterior.",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string" } },
      required: ["mes"],
    },
  },
  {
    name: "proximas_contas",
    description: "Top 10 próximas contas a vencer (despesas pendentes do mês atual).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "progresso_mes",
    description: "Quantas contas já foram pagas no mês e o percentual.",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string" } },
      required: ["mes"],
    },
  },
  {
    name: "metas_status",
    description: "Lista todas as metas de poupança ativas com valor alvo, valor atual e prazo.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "listar_categorias",
    description:
      "Lista categorias cadastradas (de despesa, receita ou ambas). Use para encontrar o categoriaId correto antes de propor um lançamento.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["despesa", "receita", "ambas"] },
      },
      required: [],
    },
  },
  {
    name: "listar_pessoas",
    description: "Lista membros ativos da família (necessário para criar receita).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "listar_pagadores",
    description: "Lista pagadores cadastrados (opcional ao criar receita).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  // ============== ESCRITA (DRAFT, requer confirmação) ==============
  {
    name: "propor_despesa",
    description:
      "Propõe a criação de uma DESPESA. Cria um draft pendente que o usuário precisa confirmar. NUNCA cria diretamente. Sempre escreva uma mensagem de confirmação explicando o draft criado.",
    input_schema: {
      type: "object",
      properties: {
        descricao: { type: "string" },
        valor_centavos: { type: "number", description: "Valor em centavos (R$ 45,90 = 4590)" },
        tipo: { type: "string", enum: ["fixa", "parcelada", "avulsa"], description: "Default avulsa" },
        categoriaId: { type: "string", description: "Id da categoria (use listar_categorias)" },
        dataVencimento: { type: "string", description: "YYYY-MM-DD" },
        pessoaId: { type: "string", description: "Opcional: quem fez o gasto" },
        totalParcelas: { type: "number", description: "Apenas se tipo=parcelada" },
        parcelaAtual: { type: "number", description: "Apenas se tipo=parcelada (default 1)" },
        cartao: { type: "string", description: "Nome do cartão usado, se houver" },
        observacao: { type: "string" },
      },
      required: ["descricao", "valor_centavos", "categoriaId", "dataVencimento"],
    },
  },
  {
    name: "propor_receita",
    description:
      "Propõe a criação de uma RECEITA. Cria um draft pendente que o usuário precisa confirmar.",
    input_schema: {
      type: "object",
      properties: {
        descricao: { type: "string" },
        valor_centavos: { type: "number" },
        tipo: { type: "string", enum: ["fixa", "parcelada", "avulsa"] },
        categoriaId: { type: "string" },
        pessoaId: { type: "string", description: "Quem recebe (obrigatório)" },
        dataPrevisao: { type: "string", description: "YYYY-MM-DD" },
        pagadorId: { type: "string", description: "Opcional: id do pagador cadastrado" },
        pagadorNome: { type: "string", description: "Opcional: nome livre do pagador" },
        totalParcelas: { type: "number" },
        parcelaAtual: { type: "number" },
        observacao: { type: "string" },
      },
      required: ["descricao", "valor_centavos", "categoriaId", "pessoaId", "dataPrevisao"],
    },
  },
  {
    name: "propor_marcar_paga",
    description:
      "Propõe marcar uma despesa existente como PAGA em um mês específico. Cria draft que o usuário confirma.",
    input_schema: {
      type: "object",
      properties: {
        despesaId: { type: "string" },
        mes: { type: "string", description: "YYYY-MM do mês em que foi paga" },
      },
      required: ["despesaId", "mes"],
    },
  },
  {
    name: "propor_marcar_recebida",
    description:
      "Propõe marcar uma receita existente como RECEBIDA em um mês específico. Cria draft que o usuário confirma.",
    input_schema: {
      type: "object",
      properties: {
        receitaId: { type: "string" },
        mes: { type: "string" },
      },
      required: ["receitaId", "mes"],
    },
  },
] as const;

// ============================================================
// Helpers
// ============================================================
function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shiftMonthStr(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesesEntre(inicio: string, fim: string): string[] {
  const meses: string[] = [];
  let cur = inicio.slice(0, 7);
  const fimMes = fim.slice(0, 7);
  let safety = 24;
  while (cur <= fimMes && safety-- > 0) {
    meses.push(cur);
    cur = shiftMonthStr(cur, 1);
  }
  return meses;
}

// ============================================================
// Contexto e dispatcher de execução
// ============================================================
export interface ToolExecCtx {
  ctx: ActionCtx;
  sessionToken: string;
  conversaId: Id<"conversasIA">;
  mensagemId?: Id<"mensagensIA">;
  familyId: string;
  userId: Id<"users">;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  // Quando a tool cria um draft, devolve o id e um resumo curto
  draftId?: string;
  resumo?: string;
}

export async function executarTool(
  toolName: string,
  args: Record<string, any>,
  exec: ToolExecCtx
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "obter_data_atual": {
        const hoje = new Date();
        const iso = hoje.toISOString().slice(0, 10);
        const mes = iso.slice(0, 7);
        const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
        return {
          ok: true,
          data: {
            hoje: iso,
            mes_atual: mes,
            dia_semana: dias[hoje.getDay()],
          },
        };
      }

      case "resumo_mes": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.resumoMes, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        return {
          ok: true,
          data: {
            mes: args.mes,
            total_despesas_brl: fmtBRL(data.totalDespesas),
            total_receitas_brl: fmtBRL(data.totalReceitas),
            saldo_brl: fmtBRL(data.saldo),
            a_pagar_brl: fmtBRL(data.aPagar),
            a_receber_brl: fmtBRL(data.aReceber),
            economia_brl: fmtBRL(data.economia),
            valores_centavos: {
              total_despesas: data.totalDespesas,
              total_receitas: data.totalReceitas,
              saldo: data.saldo,
              a_pagar: data.aPagar,
              a_receber: data.aReceber,
              economia: data.economia,
            },
            tendencias: data.trends,
          },
        };
      }

      case "listar_despesas_mes": {
        const desp = await exec.ctx.runQuery(api.financeiro.despesas.listByMonth, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        const cats = await exec.ctx.runQuery(api.financeiro.categorias.list, {
          sessionToken: exec.sessionToken,
        });
        const pessoas = await exec.ctx.runQuery(api.pessoas.list, {
          sessionToken: exec.sessionToken,
        });
        const catMap = new Map(cats.map((c: any) => [c._id, c]));
        const pesMap = new Map(pessoas.map((p: any) => [p._id, p]));

        let lista = desp.map((d: any) => ({
          _id: d._id,
          descricao: d.descricao,
          valor_centavos: d.valor,
          valor_brl: fmtBRL(d.valor),
          categoria: (catMap.get(d.categoriaId) as any)?.nome ?? "?",
          categoria_id: d.categoriaId,
          pessoa: d.pessoaId ? (pesMap.get(d.pessoaId) as any)?.nome ?? null : null,
          pessoa_id: d.pessoaId ?? null,
          data_vencimento: d.dataVencimento,
          status: d.pago ? "pago" : "pendente",
          tipo: d.tipo,
          parcela: d._parcela ? `${d._parcela}/${d.totalParcelas}` : null,
          cartao: d.cartao ?? null,
        }));

        if (args.status && args.status !== "todos") {
          lista = lista.filter((d: any) => d.status === args.status);
        }
        if (args.categoria_nome) {
          const t = String(args.categoria_nome).toLowerCase();
          lista = lista.filter((d: any) => d.categoria.toLowerCase().includes(t));
        }
        if (args.cartao) {
          const t = String(args.cartao).toLowerCase();
          lista = lista.filter((d: any) => d.cartao && d.cartao.toLowerCase().includes(t));
        }
        if (args.pessoa_nome) {
          const t = String(args.pessoa_nome).toLowerCase();
          lista = lista.filter((d: any) => d.pessoa && d.pessoa.toLowerCase().includes(t));
        }

        const limite = Math.max(1, Math.min(200, args.limite ?? 50));
        const total = lista.reduce((s: number, d: any) => s + d.valor_centavos, 0);
        return {
          ok: true,
          data: {
            mes: args.mes,
            total_itens: lista.length,
            total_brl: fmtBRL(total),
            itens: lista.slice(0, limite),
            truncado: lista.length > limite,
          },
        };
      }

      case "listar_receitas_mes": {
        const rec = await exec.ctx.runQuery(api.financeiro.receitas.listByMonth, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        const cats = await exec.ctx.runQuery(api.financeiro.categorias.list, {
          sessionToken: exec.sessionToken,
        });
        const pessoas = await exec.ctx.runQuery(api.pessoas.list, {
          sessionToken: exec.sessionToken,
        });
        const pagadores = await exec.ctx.runQuery(api.financeiro.pagadores.list, {
          sessionToken: exec.sessionToken,
        });
        const catMap = new Map(cats.map((c: any) => [c._id, c]));
        const pesMap = new Map(pessoas.map((p: any) => [p._id, p]));
        const pagMap = new Map(pagadores.map((p: any) => [p._id, p]));

        let lista = rec.map((r: any) => ({
          _id: r._id,
          descricao: r.descricao,
          valor_centavos: r.valor,
          valor_brl: fmtBRL(r.valor),
          categoria: (catMap.get(r.categoriaId) as any)?.nome ?? "?",
          pessoa: r.pessoaId ? (pesMap.get(r.pessoaId) as any)?.nome ?? null : null,
          pagador: r.pagadorId
            ? (pagMap.get(r.pagadorId) as any)?.nome ?? r.pagadorNome ?? null
            : r.pagadorNome ?? null,
          data_previsao: r.dataPrevisao,
          status: r.recebido ? "recebido" : "pendente",
          tipo: r.tipo,
          parcela: r._parcela ? `${r._parcela}/${r.totalParcelas}` : null,
        }));

        if (args.status && args.status !== "todos") {
          lista = lista.filter((r: any) => r.status === args.status);
        }
        if (args.categoria_nome) {
          const t = String(args.categoria_nome).toLowerCase();
          lista = lista.filter((r: any) => r.categoria.toLowerCase().includes(t));
        }
        if (args.pagador_nome) {
          const t = String(args.pagador_nome).toLowerCase();
          lista = lista.filter((r: any) => r.pagador && r.pagador.toLowerCase().includes(t));
        }

        const limite = Math.max(1, Math.min(200, args.limite ?? 50));
        const total = lista.reduce((s: number, r: any) => s + r.valor_centavos, 0);
        return {
          ok: true,
          data: {
            mes: args.mes,
            total_itens: lista.length,
            total_brl: fmtBRL(total),
            itens: lista.slice(0, limite),
            truncado: lista.length > limite,
          },
        };
      }

      case "listar_lancamentos_periodo": {
        const tipo = args.tipo ?? "ambos";
        const meses = mesesEntre(args.data_inicio, args.data_fim);
        const itens: any[] = [];
        for (const mes of meses) {
          if (tipo === "despesas" || tipo === "ambos") {
            const d = await exec.ctx.runQuery(api.financeiro.despesas.listByMonth, {
              sessionToken: exec.sessionToken,
              mes,
            });
            for (const x of d) {
              if (x.dataVencimento >= args.data_inicio && x.dataVencimento <= args.data_fim) {
                itens.push({
                  tipo_lancamento: "despesa",
                  _id: x._id,
                  descricao: x.descricao,
                  valor_centavos: x.valor,
                  valor_brl: fmtBRL(x.valor),
                  data: x.dataVencimento,
                  status: x.pago ? "pago" : "pendente",
                });
              }
            }
          }
          if (tipo === "receitas" || tipo === "ambos") {
            const r = await exec.ctx.runQuery(api.financeiro.receitas.listByMonth, {
              sessionToken: exec.sessionToken,
              mes,
            });
            for (const x of r) {
              if (x.dataPrevisao >= args.data_inicio && x.dataPrevisao <= args.data_fim) {
                itens.push({
                  tipo_lancamento: "receita",
                  _id: x._id,
                  descricao: x.descricao,
                  valor_centavos: x.valor,
                  valor_brl: fmtBRL(x.valor),
                  data: x.dataPrevisao,
                  status: x.recebido ? "recebido" : "pendente",
                });
              }
            }
          }
        }
        itens.sort((a, b) => a.data.localeCompare(b.data));
        const totalDesp = itens
          .filter((i) => i.tipo_lancamento === "despesa")
          .reduce((s, i) => s + i.valor_centavos, 0);
        const totalRec = itens
          .filter((i) => i.tipo_lancamento === "receita")
          .reduce((s, i) => s + i.valor_centavos, 0);
        return {
          ok: true,
          data: {
            data_inicio: args.data_inicio,
            data_fim: args.data_fim,
            total_despesas_brl: fmtBRL(totalDesp),
            total_receitas_brl: fmtBRL(totalRec),
            total_itens: itens.length,
            itens: itens.slice(0, 100),
            truncado: itens.length > 100,
          },
        };
      }

      case "despesas_por_categoria": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.despesasPorCategoria, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        const total = data.reduce((s: number, x: any) => s + x.valor, 0);
        return {
          ok: true,
          data: {
            mes: args.mes,
            total_brl: fmtBRL(total),
            categorias: data
              .map((x: any) => ({
                nome: x.label,
                valor_centavos: x.valor,
                valor_brl: fmtBRL(x.valor),
                percentual: total > 0 ? Math.round((x.valor / total) * 100) : 0,
              }))
              .sort((a: any, b: any) => b.valor_centavos - a.valor_centavos),
          },
        };
      }

      case "receitas_por_categoria": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.receitasPorCategoria, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        const total = data.reduce((s: number, x: any) => s + x.valor, 0);
        return {
          ok: true,
          data: {
            mes: args.mes,
            total_brl: fmtBRL(total),
            categorias: data
              .map((x: any) => ({
                nome: x.label,
                valor_centavos: x.valor,
                valor_brl: fmtBRL(x.valor),
                percentual: total > 0 ? Math.round((x.valor / total) * 100) : 0,
              }))
              .sort((a: any, b: any) => b.valor_centavos - a.valor_centavos),
          },
        };
      }

      case "gastos_por_pessoa": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.gastosPorPessoa, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        return {
          ok: true,
          data: {
            mes: args.mes,
            pessoas: data.map((p: any) => ({
              nome: p.nome,
              total_brl: fmtBRL(p.total),
              pago_brl: fmtBRL(p.pagas),
              pendente_brl: fmtBRL(p.pendentes),
            })),
          },
        };
      }

      case "receitas_por_pagador": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.receitasPorPagador, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
          limit: args.limite,
        });
        return {
          ok: true,
          data: {
            mes: args.mes,
            total_geral_brl: fmtBRL(data.totalGeral),
            pagadores: data.itens.map((i: any) => ({
              nome: i.nome,
              total_brl: fmtBRL(i.total),
              recebido_brl: fmtBRL(i.recebido),
              pendente_brl: fmtBRL(i.pendente),
              quantidade: i.qtd,
              percentual: i.percentual,
            })),
          },
        };
      }

      case "historico_meses": {
        const queryName =
          args.meses === 12
            ? api.financeiro.dashboardFinanceiro.evolucaoReceitasDespesas
            : api.financeiro.dashboardFinanceiro.historico6Meses;
        const data = await exec.ctx.runQuery(queryName, {
          sessionToken: exec.sessionToken,
          mesAtual: args.mes_referencia,
        });
        return {
          ok: true,
          data: {
            mes_referencia: args.mes_referencia,
            meses: data.map((m: any) => ({
              mes: m.mes,
              despesas_brl: fmtBRL(m.despesas),
              receitas_brl: fmtBRL(m.receitas),
              saldo_brl: fmtBRL(m.saldo),
            })),
          },
        };
      }

      case "evolucao_categorias": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.evolucaoCategorias, {
          sessionToken: exec.sessionToken,
          mesAtual: args.mes_referencia,
        });
        return {
          ok: true,
          data: {
            categorias: data.map((c: any) => ({
              nome: c.nome,
              total_3meses_brl: fmtBRL(c.total),
              variacao_percentual: c.variacao,
              meses: c.meses.map((m: any) => ({
                mes: m.mes,
                valor_brl: fmtBRL(m.valor),
              })),
            })),
          },
        };
      }

      case "categorias_estouradas": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.categoriasEstouradas, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        return {
          ok: true,
          data: data.map((c: any) => ({
            nome: c.nome,
            valor_atual_brl: fmtBRL(c.valorAtual),
            valor_anterior_brl: fmtBRL(c.valorAnterior),
            variacao_percentual: c.variacao,
          })),
        };
      }

      case "proximas_contas": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.proximasContas, {
          sessionToken: exec.sessionToken,
        });
        return {
          ok: true,
          data: data.map((d: any) => ({
            _id: d._id,
            descricao: d.descricao,
            valor_brl: fmtBRL(d.valor),
            data_vencimento: d.dataVencimento,
          })),
        };
      }

      case "progresso_mes": {
        const data = await exec.ctx.runQuery(api.financeiro.dashboardFinanceiro.progressoMes, {
          sessionToken: exec.sessionToken,
          mes: args.mes,
        });
        return {
          ok: true,
          data: {
            total_contas: data.totalContas,
            contas_pagas: data.contasPagas,
            valor_total_brl: fmtBRL(data.valorTotal),
            valor_pago_brl: fmtBRL(data.valorPago),
            percentual: data.percentual,
          },
        };
      }

      case "metas_status": {
        const metas = await exec.ctx.runQuery(api.financeiro.metas.list, {
          sessionToken: exec.sessionToken,
        });
        return {
          ok: true,
          data: metas
            .filter((m: any) => m.ativa)
            .map((m: any) => ({
              _id: m._id,
              titulo: m.titulo,
              valor_alvo_brl: fmtBRL(m.valorAlvo),
              valor_atual_brl: fmtBRL(m.valorAtual),
              percentual: m.valorAlvo > 0 ? Math.round((m.valorAtual / m.valorAlvo) * 100) : 0,
              prazo: m.prazo,
            })),
        };
      }

      case "listar_categorias": {
        const tipo = args.tipo === "ambas" || !args.tipo ? undefined : args.tipo;
        const data = await exec.ctx.runQuery(api.financeiro.categorias.list, {
          sessionToken: exec.sessionToken,
          tipo,
        });
        return {
          ok: true,
          data: data.map((c: any) => ({
            _id: c._id,
            nome: c.nome,
            tipo: c.tipo,
          })),
        };
      }

      case "listar_pessoas": {
        const data = await exec.ctx.runQuery(api.pessoas.list, {
          sessionToken: exec.sessionToken,
        });
        return {
          ok: true,
          data: data
            .filter((p: any) => p.ativo)
            .map((p: any) => ({
              _id: p._id,
              nome: p.nome,
              apelido: p.apelido ?? null,
              tipo: p.tipo,
            })),
        };
      }

      case "listar_pagadores": {
        const data = await exec.ctx.runQuery(api.financeiro.pagadores.list, {
          sessionToken: exec.sessionToken,
        });
        return {
          ok: true,
          data: data.map((p: any) => ({
            _id: p._id,
            nome: p.nome,
            apelido: p.apelido ?? null,
          })),
        };
      }

      case "propor_despesa": {
        const tipo = args.tipo ?? "avulsa";
        const payload = {
          descricao: String(args.descricao),
          valor: Math.abs(Math.round(Number(args.valor_centavos) || 0)),
          tipo,
          categoriaId: args.categoriaId,
          dataVencimento: args.dataVencimento,
          pessoaId: args.pessoaId || undefined,
          totalParcelas: args.totalParcelas,
          parcelaAtual: args.parcelaAtual,
          cartao: args.cartao,
          observacao: args.observacao,
        };
        const resumo = `Despesa: ${payload.descricao} — ${fmtBRL(payload.valor)} — venc. ${payload.dataVencimento}${payload.cartao ? ` — ${payload.cartao}` : ""}${payload.totalParcelas ? ` — parcela ${payload.parcelaAtual ?? 1}/${payload.totalParcelas}` : ""}`;
        const draftId = await exec.ctx.runMutation(internal.agente.drafts._criarDraftInternal, {
          conversaId: exec.conversaId,
          mensagemId: exec.mensagemId,
          tipo: "despesa",
          payload: JSON.stringify(payload),
          resumo,
          familyId: exec.familyId,
          criadoPor: exec.userId,
        });
        return { ok: true, draftId, resumo, data: { draftId, resumo, status: "pendente_confirmacao" } };
      }

      case "propor_receita": {
        const tipo = args.tipo ?? "avulsa";
        const payload = {
          descricao: String(args.descricao),
          valor: Math.abs(Math.round(Number(args.valor_centavos) || 0)),
          tipo,
          categoriaId: args.categoriaId,
          pessoaId: args.pessoaId,
          dataPrevisao: args.dataPrevisao,
          pagadorId: args.pagadorId || undefined,
          pagadorNome: args.pagadorNome,
          totalParcelas: args.totalParcelas,
          parcelaAtual: args.parcelaAtual,
          observacao: args.observacao,
        };
        const resumo = `Receita: ${payload.descricao} — ${fmtBRL(payload.valor)} — prev. ${payload.dataPrevisao}`;
        const draftId = await exec.ctx.runMutation(internal.agente.drafts._criarDraftInternal, {
          conversaId: exec.conversaId,
          mensagemId: exec.mensagemId,
          tipo: "receita",
          payload: JSON.stringify(payload),
          resumo,
          familyId: exec.familyId,
          criadoPor: exec.userId,
        });
        return { ok: true, draftId, resumo, data: { draftId, resumo, status: "pendente_confirmacao" } };
      }

      case "propor_marcar_paga": {
        const payload = { despesaId: args.despesaId, mes: args.mes };
        const resumo = `Marcar como paga: despesa ${args.despesaId} no mês ${args.mes}`;
        const draftId = await exec.ctx.runMutation(internal.agente.drafts._criarDraftInternal, {
          conversaId: exec.conversaId,
          mensagemId: exec.mensagemId,
          tipo: "marcar_paga",
          payload: JSON.stringify(payload),
          resumo,
          familyId: exec.familyId,
          criadoPor: exec.userId,
        });
        return { ok: true, draftId, resumo, data: { draftId, resumo, status: "pendente_confirmacao" } };
      }

      case "propor_marcar_recebida": {
        const payload = { receitaId: args.receitaId, mes: args.mes };
        const resumo = `Marcar como recebida: receita ${args.receitaId} no mês ${args.mes}`;
        const draftId = await exec.ctx.runMutation(internal.agente.drafts._criarDraftInternal, {
          conversaId: exec.conversaId,
          mensagemId: exec.mensagemId,
          tipo: "marcar_recebida",
          payload: JSON.stringify(payload),
          resumo,
          familyId: exec.familyId,
          criadoPor: exec.userId,
        });
        return { ok: true, draftId, resumo, data: { draftId, resumo, status: "pendente_confirmacao" } };
      }

      default:
        return { ok: false, error: `Tool desconhecida: ${toolName}` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}
