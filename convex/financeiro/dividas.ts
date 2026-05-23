import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

const TIPO_DIVIDA = v.union(
  v.literal("cartao"),
  v.literal("financiamento"),
  v.literal("emprestimo"),
  v.literal("parcelamento"),
  v.literal("outro")
);

const TAXA_PERIODICIDADE = v.union(v.literal("mensal"), v.literal("anual"));

// ---------- Helpers ----------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentYM(): string {
  return new Date().toISOString().slice(0, 7);
}

// Avanca uma data ISO YYYY-MM-DD em N meses preservando o "diaVencimento" desejado.
// Se o mes destino nao tem o dia (ex: 31 em fevereiro), usa o ultimo dia do mes.
function shiftDataMeses(dataIso: string, deltaMeses: number, diaVencimento: number): string {
  const [y, m] = dataIso.split("-").map(Number);
  const target = new Date(y, m - 1 + deltaMeses, 1);
  const ultimoDia = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const dia = Math.min(diaVencimento, ultimoDia);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(
    dia
  ).padStart(2, "0")}`;
}

// Converte uma taxa anual em mensal equivalente: (1+ia)^(1/12) - 1
function taxaMensalEquivalente(taxaPercentual: number, periodicidade: "mensal" | "anual"): number {
  if (taxaPercentual <= 0) return 0;
  const taxaDecimal = taxaPercentual / 100;
  if (periodicidade === "mensal") return taxaDecimal;
  return Math.pow(1 + taxaDecimal, 1 / 12) - 1;
}

// ---------- Queries ----------

export const list = query({
  args: { sessionToken: v.string(), ativa: v.optional(v.boolean()) },
  handler: async (ctx, { sessionToken, ativa }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    let dividas;
    if (typeof ativa === "boolean") {
      dividas = await ctx.db
        .query("dividas")
        .withIndex("by_family_ativa", (q) =>
          q.eq("familyId", user.familyId).eq("ativa", ativa)
        )
        .collect();
    } else {
      dividas = await ctx.db
        .query("dividas")
        .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
        .collect();
    }
    // Ativas primeiro, depois ordenadas por proximoVencimento asc
    return dividas.sort((a, b) => {
      if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
      return a.proximoVencimento.localeCompare(b.proximoVencimento);
    });
  },
});

export const getById = query({
  args: { sessionToken: v.string(), id: v.id("dividas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const divida = await ctx.db.get(id);
    if (!divida || divida.familyId !== user.familyId) throw new Error("Divida nao encontrada");
    return divida;
  },
});

export const listPagamentos = query({
  args: { sessionToken: v.string(), dividaId: v.id("dividas") },
  handler: async (ctx, { sessionToken, dividaId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const divida = await ctx.db.get(dividaId);
    if (!divida || divida.familyId !== user.familyId) throw new Error("Divida nao encontrada");
    const pags = await ctx.db
      .query("pagamentosDividas")
      .withIndex("by_divida_mes", (q) => q.eq("dividaId", dividaId))
      .collect();
    return pags.sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento));
  },
});

// ---------- Mutations ----------

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nome: v.string(),
    credor: v.optional(v.string()),
    tipo: TIPO_DIVIDA,
    valorOriginal: v.number(),
    saldoDevedor: v.optional(v.number()), // se omitido, usa valorOriginal
    taxaJuros: v.number(),
    taxaPeriodicidade: TAXA_PERIODICIDADE,
    totalParcelas: v.number(),
    parcelasPagas: v.optional(v.number()),
    valorParcela: v.number(),
    proximoVencimento: v.string(),
    diaVencimento: v.number(),
    cor: v.string(),
    icone: v.optional(v.string()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (!args.nome.trim()) throw new Error("Informe o nome da divida");
    if (!Number.isFinite(args.valorOriginal) || args.valorOriginal < 0)
      throw new Error("Valor original invalido");
    if (!Number.isFinite(args.valorParcela) || args.valorParcela < 0)
      throw new Error("Valor da parcela invalido");
    if (!Number.isFinite(args.taxaJuros) || args.taxaJuros < 0)
      throw new Error("Taxa de juros invalida");
    if (!Number.isInteger(args.totalParcelas) || args.totalParcelas < 0)
      throw new Error("Total de parcelas invalido");
    if (args.parcelasPagas !== undefined) {
      if (!Number.isInteger(args.parcelasPagas) || args.parcelasPagas < 0)
        throw new Error("Parcelas pagas invalido");
      if (args.totalParcelas > 0 && args.parcelasPagas > args.totalParcelas)
        throw new Error("Parcelas pagas maior que total");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.proximoVencimento))
      throw new Error("Data de vencimento invalida");
    if (!Number.isInteger(args.diaVencimento) || args.diaVencimento < 1 || args.diaVencimento > 31)
      throw new Error("Dia de vencimento invalido");

    const saldoInicial =
      typeof args.saldoDevedor === "number" ? args.saldoDevedor : args.valorOriginal;
    if (saldoInicial < 0) throw new Error("Saldo devedor invalido");

    const ativa = saldoInicial > 0;

    return await ctx.db.insert("dividas", {
      nome: args.nome.trim(),
      credor: args.credor?.trim() || undefined,
      tipo: args.tipo,
      valorOriginal: args.valorOriginal,
      saldoDevedor: saldoInicial,
      taxaJuros: args.taxaJuros,
      taxaPeriodicidade: args.taxaPeriodicidade,
      totalParcelas: args.totalParcelas,
      parcelasPagas: args.parcelasPagas ?? 0,
      valorParcela: args.valorParcela,
      proximoVencimento: args.proximoVencimento,
      diaVencimento: args.diaVencimento,
      ativa,
      cor: args.cor,
      icone: args.icone,
      observacao: args.observacao?.trim() || undefined,
      familyId: user.familyId,
      criadoPor: user._id,
      criadoEm: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("dividas"),
    nome: v.optional(v.string()),
    credor: v.optional(v.string()),
    tipo: v.optional(TIPO_DIVIDA),
    valorOriginal: v.optional(v.number()),
    saldoDevedor: v.optional(v.number()),
    taxaJuros: v.optional(v.number()),
    taxaPeriodicidade: v.optional(TAXA_PERIODICIDADE),
    totalParcelas: v.optional(v.number()),
    parcelasPagas: v.optional(v.number()),
    valorParcela: v.optional(v.number()),
    proximoVencimento: v.optional(v.string()),
    diaVencimento: v.optional(v.number()),
    ativa: v.optional(v.boolean()),
    cor: v.optional(v.string()),
    icone: v.optional(v.string()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const divida = await ctx.db.get(id);
    if (!divida || divida.familyId !== user.familyId) throw new Error("Divida nao encontrada");

    if (rest.nome !== undefined && !rest.nome.trim()) throw new Error("Informe o nome da divida");
    if (rest.valorOriginal !== undefined && rest.valorOriginal < 0)
      throw new Error("Valor original invalido");
    if (rest.valorParcela !== undefined && rest.valorParcela < 0)
      throw new Error("Valor da parcela invalido");
    if (rest.saldoDevedor !== undefined && rest.saldoDevedor < 0)
      throw new Error("Saldo devedor invalido");
    if (rest.taxaJuros !== undefined && rest.taxaJuros < 0)
      throw new Error("Taxa de juros invalida");
    if (rest.totalParcelas !== undefined && (!Number.isInteger(rest.totalParcelas) || rest.totalParcelas < 0))
      throw new Error("Total de parcelas invalido");
    if (rest.parcelasPagas !== undefined && (!Number.isInteger(rest.parcelasPagas) || rest.parcelasPagas < 0))
      throw new Error("Parcelas pagas invalido");
    if (rest.diaVencimento !== undefined && (rest.diaVencimento < 1 || rest.diaVencimento > 31))
      throw new Error("Dia de vencimento invalido");
    if (rest.proximoVencimento !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(rest.proximoVencimento))
      throw new Error("Data de vencimento invalida");

    const patch: Record<string, unknown> = { ...rest };
    if (rest.nome !== undefined) patch.nome = rest.nome.trim();
    if (rest.credor !== undefined) patch.credor = rest.credor.trim() || undefined;
    if (rest.observacao !== undefined) patch.observacao = rest.observacao.trim() || undefined;

    // Se saldoDevedor cair pra 0 manualmente, marca como inativa
    if (rest.saldoDevedor !== undefined && rest.saldoDevedor === 0) {
      patch.ativa = rest.ativa ?? false;
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("dividas") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const divida = await ctx.db.get(id);
    if (!divida || divida.familyId !== user.familyId) throw new Error("Divida nao encontrada");

    const pagamentos = await ctx.db
      .query("pagamentosDividas")
      .withIndex("by_divida_mes", (q) => q.eq("dividaId", id))
      .collect();
    if (pagamentos.length > 0) {
      throw new Error(
        "Esta divida tem pagamentos registrados e nao pode ser excluida. Voce pode marca-la como inativa."
      );
    }

    await ctx.db.delete(id);
  },
});

export const registrarPagamento = mutation({
  args: {
    sessionToken: v.string(),
    dividaId: v.id("dividas"),
    valorPago: v.number(),
    dataPagamento: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, dividaId, valorPago, dataPagamento }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const divida = await ctx.db.get(dividaId);
    if (!divida || divida.familyId !== user.familyId) throw new Error("Divida nao encontrada");
    if (!divida.ativa) throw new Error("Divida ja quitada");
    if (!Number.isFinite(valorPago) || valorPago <= 0)
      throw new Error("Informe um valor de pagamento valido");

    const dataEfetiva = dataPagamento ?? todayISO();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEfetiva)) throw new Error("Data invalida");

    // Idempotência: bloqueia duplo-clique / replay da mesma operação.
    // Considera duplicado se já existe pagamento dessa mesma dívida no mesmo dia
    // com o mesmo valor.
    const mesEfetivo = dataEfetiva.slice(0, 7);
    const pagamentosNoMes = await ctx.db
      .query("pagamentosDividas")
      .withIndex("by_divida_mes", (q) =>
        q.eq("dividaId", dividaId).eq("mes", mesEfetivo)
      )
      .collect();
    const duplicado = pagamentosNoMes.find(
      (p) => p.dataPagamento === dataEfetiva && p.valorPago === valorPago
    );
    if (duplicado) {
      throw new Error(
        "Já existe um pagamento registrado para esta dívida com a mesma data e valor."
      );
    }

    const saldoAtual = divida.saldoDevedor;
    const saldoNovo = Math.max(0, saldoAtual - valorPago);

    // Incrementa parcelasPagas se valorPago >= valorParcela (e valorParcela > 0)
    const incrementoParcelas =
      divida.valorParcela > 0 && valorPago >= divida.valorParcela ? 1 : 0;
    let parcelasPagasNovo = divida.parcelasPagas + incrementoParcelas;
    if (divida.totalParcelas > 0 && parcelasPagasNovo > divida.totalParcelas) {
      parcelasPagasNovo = divida.totalParcelas;
    }

    // Quitada: zera saldo, marca todas as parcelas pagas
    let proxVenc = divida.proximoVencimento;
    let ativaNova: boolean = divida.ativa;
    if (saldoNovo <= 0) {
      ativaNova = false;
      if (divida.totalParcelas > 0) {
        parcelasPagasNovo = divida.totalParcelas;
      }
    } else {
      // Avanca proximo vencimento +1 mes preservando o dia
      proxVenc = shiftDataMeses(divida.proximoVencimento, 1, divida.diaVencimento);
    }

    // Insere pagamento
    const pagId = await ctx.db.insert("pagamentosDividas", {
      dividaId,
      mes: mesEfetivo,
      dataPagamento: dataEfetiva,
      valorPago,
      saldoAposPagamento: saldoNovo,
      familyId: user.familyId,
      criadoPor: user._id,
      criadoEm: new Date().toISOString(),
    });

    // Atualiza divida
    await ctx.db.patch(dividaId, {
      saldoDevedor: saldoNovo,
      parcelasPagas: parcelasPagasNovo,
      proximoVencimento: proxVenc,
      ativa: ativaNova,
    });

    return { pagamentoId: pagId, saldoAposPagamento: saldoNovo, quitada: !ativaNova };
  },
});

// ---------- Resumo / Curva ----------

export const resumo = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const dividas = await ctx.db
      .query("dividas")
      .withIndex("by_family", (q) => q.eq("familyId", user.familyId))
      .collect();

    const ativas = dividas.filter((d) => d.ativa);
    const quitadas = dividas.filter((d) => !d.ativa);

    const totalSaldoDevedor = ativas.reduce((s, d) => s + d.saldoDevedor, 0);

    const mesAtual = currentYM();
    const dividasMesAtual = ativas.filter((d) => d.proximoVencimento.slice(0, 7) === mesAtual);
    const parcelaMesAtual = dividasMesAtual.reduce((s, d) => s + d.valorParcela, 0);

    // Mes mais distante de quitacao com base em parcelasRestantes (ignora juros)
    let mesQuitacaoMaisDistante: string | null = null;
    let parcelasRestantesMaiorTotal = 0;
    for (const d of ativas) {
      const parcelasRestantes =
        d.totalParcelas > 0 ? Math.max(0, d.totalParcelas - d.parcelasPagas) : 0;
      if (parcelasRestantes > parcelasRestantesMaiorTotal) {
        parcelasRestantesMaiorTotal = parcelasRestantes;
        const proxYM = d.proximoVencimento.slice(0, 7);
        const [y, m] = proxYM.split("-").map(Number);
        const dt = new Date(y, m - 1 + Math.max(0, parcelasRestantes - 1), 1);
        mesQuitacaoMaisDistante = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      }
    }

    return {
      totalSaldoDevedor,
      parcelaMesAtual,
      countDividasMesAtual: dividasMesAtual.length,
      mesQuitacaoMaisDistante,
      parcelasRestantesMaiorTotal,
      countAtivas: ativas.length,
      countQuitadas: quitadas.length,
    };
  },
});

export const curvaQuitacao = query({
  args: { sessionToken: v.string(), meses: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, meses }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const ativas = await ctx.db
      .query("dividas")
      .withIndex("by_family_ativa", (q) =>
        q.eq("familyId", user.familyId).eq("ativa", true)
      )
      .collect();

    if (ativas.length === 0) return [];

    const horizonte = Math.max(1, Math.min(120, meses ?? 36));

    // Estado por divida: saldo atual + parcelasRestantes
    interface State {
      saldo: number;
      parcelasRestantes: number;
      valorParcela: number;
      taxaMensal: number;
      totalParcelas: number;
    }
    const estados: State[] = ativas.map((d) => {
      const parcelasRestantes =
        d.totalParcelas > 0 ? Math.max(0, d.totalParcelas - d.parcelasPagas) : 0;
      return {
        saldo: d.saldoDevedor,
        parcelasRestantes,
        valorParcela: d.valorParcela,
        taxaMensal: taxaMensalEquivalente(d.taxaJuros, d.taxaPeriodicidade),
        totalParcelas: d.totalParcelas,
      };
    });

    // Ponto inicial (mes atual): soma dos saldos atuais
    const hoje = new Date();
    const pontos: { mes: string; saldoTotal: number; dividasAtivas: number }[] = [];

    for (let i = 0; i < horizonte; i++) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;

      let saldoTotal = 0;
      let dividasAtivasNoMes = 0;
      for (const e of estados) {
        if (e.saldo <= 0) continue;
        // Aplica juros do mes
        const saldoComJuros = e.saldo + e.saldo * e.taxaMensal;

        // Define pagamento do mes
        let pagamento = 0;
        if (e.totalParcelas > 0) {
          if (e.parcelasRestantes > 0) {
            // Para nao deixar saldo residual depois da ultima parcela contratada,
            // se a ultima parcela nao zerar via valorParcela, paga o saldo cheio.
            pagamento = e.parcelasRestantes === 1 ? saldoComJuros : e.valorParcela;
            e.parcelasRestantes = Math.max(0, e.parcelasRestantes - 1);
          } else {
            // Sem parcelas restantes: nao paga; saldo so cresce com juros.
            pagamento = 0;
          }
        } else {
          // Cartao rotativo / divida sem total: paga apenas o "minimo" se valorParcela > 0
          pagamento = e.valorParcela > 0 ? e.valorParcela : 0;
        }

        const saldoNovo = Math.max(0, saldoComJuros - pagamento);
        e.saldo = saldoNovo;
        saldoTotal += saldoNovo;
        if (saldoNovo > 0) dividasAtivasNoMes++;
      }

      pontos.push({ mes, saldoTotal: Math.round(saldoTotal), dividasAtivas: dividasAtivasNoMes });

      // Se zerou tudo, encerra cedo
      if (saldoTotal <= 0) break;
    }

    return pontos;
  },
});
