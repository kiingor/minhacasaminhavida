import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUser } from "../_helpers";
import {
  competenciaDaCompra,
  dataFechamentoDaCompetencia,
  dataVencimentoDaCompetencia,
  shiftCompetencia,
  normalizarNomeCartao,
} from "./cartaoCiclo";

// ============ FATURA DERIVADA POR COMPETÊNCIA (Fase 2 — só leitura) ============
// A fatura NÃO é uma tabela: é derivada das despesas do cartão agrupadas pela
// COMPETÊNCIA (o ciclo de fechamento). Há dois conceitos de mês:
//  - mesCalendario: usado por pagamentosDespesas/overrides (chave despesaId+mes);
//  - competencia: a fatura a que a ocorrência pertence (compra > fechamento → mês seguinte).
// Cartão sem diaFechamento/diaVencimento cai no fallback: competencia = mês-calendário.

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
function shiftMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}
// Despesa fixa aparece no mês alvo? (mesma regra de despesas.listByMonth)
function fixaInMes(
  d: { dataVencimento: string; periodicidade?: "mensal" | "anual" | "sazonal"; mesesSazonais?: number[] },
  mes: string
): boolean {
  const origMes = d.dataVencimento.slice(0, 7);
  if (mes < origMes) return false;
  const periodicidade = d.periodicidade ?? "mensal";
  if (periodicidade === "mensal") return true;
  const mesAlvoNum = Number(mes.slice(5, 7));
  if (periodicidade === "anual") return Number(origMes.slice(5, 7)) === mesAlvoNum;
  return (d.mesesSazonais ?? []).includes(mesAlvoNum);
}

type StatusFatura = "aberta" | "a_pagar" | "vencida" | "paga";

function statusFatura(
  competencia: string,
  qtdNaoPagas: number,
  ciclo: { F?: number; V?: number } | null
): StatusFatura {
  const hoje = hojeISO();
  if (ciclo && ciclo.F != null && ciclo.V != null) {
    const fech = dataFechamentoDaCompetencia(competencia, ciclo.F);
    const venc = dataVencimentoDaCompetencia(competencia, ciclo.F, ciclo.V);
    if (hoje < fech) return "aberta";
    if (qtdNaoPagas === 0) return "paga";
    if (hoje > venc) return "vencida";
    return "a_pagar";
  }
  // Sem ciclo: aproxima pelo mês-calendário.
  const hojeMes = hoje.slice(0, 7);
  if (competencia > hojeMes) return "aberta";
  if (qtdNaoPagas === 0) return "paga";
  if (competencia < hojeMes) return "vencida";
  return "a_pagar";
}

// ===== Helpers compartilhados de reprojeção por competência (Fase 2b) =====
// Usados por lancamentos.listByMonth E pelo dashboard (progressoMes/cartaoVsAVista)
// p/ garantir que a "fatura do mês" seja IDÊNTICA em todas as telas.
// Opt-in: só vale p/ cartão com diaFechamento+diaVencimento; senão, mês-calendário.

type DespesaCiclo = {
  tipo: "fixa" | "parcelada" | "avulsa";
  dataVencimento: string;
  dataCompra?: string;
  totalParcelas?: number;
  parcelaAtual?: number;
  periodicidade?: "mensal" | "anual" | "sazonal";
  mesesSazonais?: number[];
};

// Ocorrências da despesa (cartão COM ciclo F) cuja COMPETÊNCIA == viewMes.
// Cada ocorrência traz seu mesCalendario — a chave de valor/override/pagamento,
// que NÃO muda (preserva o caminho de escrita de pagamento existente).
export function ocorrenciasCartaoNaCompetencia(
  d: DespesaCiclo,
  viewMes: string,
  F: number
): Array<{ mesCalendario: string; parcelaAtual?: number }> {
  const origMes = d.dataVencimento.slice(0, 7);
  const refDate = d.dataCompra ?? d.dataVencimento;
  const baseComp = competenciaDaCompra(refDate, F);
  const out: Array<{ mesCalendario: string; parcelaAtual?: number }> = [];
  if (d.tipo === "avulsa") {
    if (baseComp === viewMes) out.push({ mesCalendario: origMes });
  } else if (d.tipo === "parcelada") {
    const total = d.totalParcelas ?? 1;
    const parcelaIni = d.parcelaAtual ?? 1;
    for (let k = parcelaIni; k <= total; k++) {
      const delta = k - parcelaIni;
      if (shiftCompetencia(baseComp, delta) === viewMes) {
        out.push({ mesCalendario: shiftMes(origMes, delta), parcelaAtual: k });
      }
    }
  } else {
    // fixa: candidatos viewMes e viewMes-1 (competência ∈ {mesCalendario, mesCalendario+1})
    const dia = d.dataVencimento.slice(8, 10);
    for (const m of [viewMes, shiftMes(viewMes, -1)]) {
      if (
        fixaInMes({ dataVencimento: d.dataVencimento, periodicidade: d.periodicidade, mesesSazonais: d.mesesSazonais }, m) &&
        competenciaDaCompra(`${m}-${dia}`, F) === viewMes
      ) {
        out.push({ mesCalendario: m });
      }
    }
  }
  return out;
}

// Resolvedor de ciclo: dado os cartões da família, devolve o diaFechamento
// aplicável a uma despesa (por cartaoId OU por nome normalizado), ou null se o
// cartão não tem ciclo configurado (=> fallback p/ mês-calendário).
export function criarResolvedorCiclo(
  cartoes: Array<{ _id: Id<"cartoes">; nome: string; diaFechamento?: number; diaVencimento?: number }>
): (d: { cartao?: string | null; cartaoId?: Id<"cartoes"> | null }) => number | null {
  const porId = new Map<string, number>();
  const porNome = new Map<string, number>();
  for (const c of cartoes) {
    if (c.diaFechamento != null && c.diaVencimento != null) {
      porId.set(c._id as string, c.diaFechamento);
      porNome.set(normalizarNomeCartao(c.nome), c.diaFechamento);
    }
  }
  return (d) => {
    if (d.cartaoId) {
      const f = porId.get(d.cartaoId as string);
      if (f != null) return f;
    }
    if (d.cartao) {
      const f = porNome.get(normalizarNomeCartao(d.cartao));
      if (f != null) return f;
    }
    return null;
  };
}

interface Ocorrencia {
  despesaId: Id<"despesas">;
  descricao: string;
  valor: number;
  categoriaId: Id<"categorias">;
  mesCalendario: string;
  competencia: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  pago: boolean;
  dataPagamento?: string;
  dataRef: string; // YYYY-MM-DD p/ ordenação
}

// Tela de detalhe do cartão: fatura atual + histórico + faturas futuras + parcelamentos.
export const detalheCartao = query({
  args: { sessionToken: v.string(), cartaoId: v.id("cartoes") },
  handler: async (ctx, { sessionToken, cartaoId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const cartao = await ctx.db.get(cartaoId);
    if (!cartao || cartao.familyId !== user.familyId) throw new Error("Cartão não encontrado");

    const F = cartao.diaFechamento;
    const V = cartao.diaVencimento;
    const temCiclo = F != null && V != null;
    const ciclo = temCiclo ? { F, V } : null;

    // Despesas do cartão: por FK (cartaoId) OU por nome normalizado (despesas
    // antigas ainda sem cartaoId). Garante a view correta mesmo sem backfill.
    const todas = await ctx.db
      .query("despesas")
      .withIndex("by_family_mes", (q) => q.eq("familyId", user.familyId))
      .collect();
    const nomeNorm = normalizarNomeCartao(cartao.nome);
    const despesas = todas.filter(
      (d) =>
        d.cartaoId === cartaoId ||
        (!d.cartaoId && d.cartao != null && normalizarNomeCartao(d.cartao) === nomeNorm)
    );

    // Pagamentos por despesa: despesaId -> (mesCalendario -> pagamento)
    const pagsPorDespesa = new Map<string, Map<string, { dataPagamento: string }>>();
    await Promise.all(
      despesas.map(async (d) => {
        const pags = await ctx.db
          .query("pagamentosDespesas")
          .withIndex("by_despesa_mes", (q) => q.eq("despesaId", d._id))
          .collect();
        pagsPorDespesa.set(
          d._id as string,
          new Map(pags.map((p) => [p.mes, { dataPagamento: p.dataPagamento }]))
        );
      })
    );

    const hojeMes = hojeISO().slice(0, 7);
    // Horizonte de projeção: pelo menos o próximo mês, estendido até a última
    // parcela futura comprometida (parceladas são finitas; fixas ficam capadas aqui).
    let horizonMes = shiftMes(hojeMes, 1);
    for (const d of despesas) {
      if (d.tipo === "parcelada") {
        const fim = shiftMes(d.dataVencimento.slice(0, 7), (d.totalParcelas ?? 1) - (d.parcelaAtual ?? 1));
        if (fim > horizonMes) horizonMes = fim;
      }
    }

    const ocorrencias: Ocorrencia[] = [];
    for (const d of despesas) {
      const origMes = d.dataVencimento.slice(0, 7);
      const refDate = d.dataCompra ?? d.dataVencimento;
      const baseComp = temCiclo ? competenciaDaCompra(refDate, F!) : origMes;
      const pagMap = pagsPorDespesa.get(d._id as string) ?? new Map();

      const push = (mesCal: string, competencia: string, parcela?: number) => {
        const ov = (d.overrides ?? []).find((o) => o.mes === mesCal);
        if (ov?.excluida) return;
        const valor = ov?.valor ?? d.valor;
        const dia = (ov?.dataVencimento ?? d.dataVencimento).slice(8, 10);
        const pag = pagMap.get(mesCal);
        ocorrencias.push({
          despesaId: d._id,
          descricao: ov?.descricao ?? d.descricao,
          valor,
          categoriaId: d.categoriaId,
          mesCalendario: mesCal,
          competencia,
          parcelaAtual: parcela,
          totalParcelas: d.totalParcelas,
          pago: !!pag,
          dataPagamento: pag?.dataPagamento,
          dataRef: `${mesCal}-${dia}`,
        });
      };

      if (d.tipo === "avulsa") {
        push(origMes, baseComp);
      } else if (d.tipo === "parcelada") {
        const total = d.totalParcelas ?? 1;
        const parcelaIni = d.parcelaAtual ?? 1;
        for (let k = parcelaIni; k <= total; k++) {
          const delta = k - parcelaIni;
          const mesCal = shiftMes(origMes, delta);
          const competencia = temCiclo ? shiftCompetencia(baseComp, delta) : mesCal;
          push(mesCal, competencia, k);
        }
      } else if (d.tipo === "fixa") {
        let m = origMes;
        let guard = 0;
        while (m <= horizonMes && guard < 240) {
          guard++;
          if (fixaInMes(d, m)) {
            const dia = d.dataVencimento.slice(8, 10);
            const competencia = temCiclo ? competenciaDaCompra(`${m}-${dia}`, F!) : m;
            push(m, competencia);
          }
          m = shiftMes(m, 1);
        }
      }
    }

    // Agrupa por competência -> fatura
    const porComp = new Map<string, Ocorrencia[]>();
    for (const o of ocorrencias) {
      const arr = porComp.get(o.competencia) ?? [];
      arr.push(o);
      porComp.set(o.competencia, arr);
    }

    const faturas = Array.from(porComp.entries())
      .map(([competencia, lancs]) => {
        lancs.sort((a, b) => a.dataRef.localeCompare(b.dataRef));
        const valorTotal = lancs.reduce((s, l) => s + l.valor, 0);
        const valorPago = lancs.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0);
        const qtdNaoPagas = lancs.filter((l) => !l.pago).length;
        return {
          competencia,
          dataFechamento: temCiclo ? dataFechamentoDaCompetencia(competencia, F!) : null,
          dataVencimento: temCiclo ? dataVencimentoDaCompetencia(competencia, F!, V!) : null,
          status: statusFatura(competencia, qtdNaoPagas, ciclo),
          valorTotal,
          valorPago,
          qtdLancamentos: lancs.length,
          lancamentos: lancs,
        };
      })
      .sort((a, b) => a.competencia.localeCompare(b.competencia));

    const compAtual = temCiclo ? competenciaDaCompra(hojeISO(), F!) : hojeMes;
    const faturaAtual = faturas.find((f) => f.competencia === compAtual) ?? null;
    const historico = faturas.filter((f) => f.competencia < compAtual).sort((a, b) => b.competencia.localeCompare(a.competencia));
    const futuras = faturas.filter((f) => f.competencia > compAtual);

    // Parcelamentos em andamento (cross-fatura)
    const parcelamentos = despesas
      .filter((d) => d.tipo === "parcelada")
      .map((d) => {
        const total = d.totalParcelas ?? 1;
        const parcelaIni = d.parcelaAtual ?? 1;
        const origMes = d.dataVencimento.slice(0, 7);
        const pagMap = pagsPorDespesa.get(d._id as string) ?? new Map();
        let pagas = 0;
        let proximaCompetencia: string | null = null;
        const refDate = d.dataCompra ?? d.dataVencimento;
        const baseComp = temCiclo ? competenciaDaCompra(refDate, F!) : origMes;
        for (let k = parcelaIni; k <= total; k++) {
          const delta = k - parcelaIni;
          const mesCal = shiftMes(origMes, delta);
          if (pagMap.has(mesCal)) {
            pagas++;
          } else if (!proximaCompetencia) {
            proximaCompetencia = temCiclo ? shiftCompetencia(baseComp, delta) : mesCal;
          }
        }
        const restantes = total - pagas;
        return {
          despesaId: d._id,
          descricao: d.descricao,
          valorParcela: d.valor,
          valorOriginal: d.valor * total,
          totalParcelas: total,
          parcelasPagas: pagas,
          parcelasRestantes: restantes,
          proximaCompetencia,
        };
      })
      .filter((p) => p.parcelasRestantes > 0)
      .sort((a, b) => (a.proximaCompetencia ?? "9999").localeCompare(b.proximaCompetencia ?? "9999"));

    return {
      cartao: {
        _id: cartao._id,
        nome: cartao.nome,
        bandeira: cartao.bandeira ?? null,
        cor: cartao.cor,
        limiteTotal: cartao.limiteTotal ?? null,
        diaFechamento: F ?? null,
        diaVencimento: V ?? null,
        ativo: cartao.ativo !== false,
        temCiclo,
      },
      compAtual,
      faturaAtual,
      historico,
      futuras,
      parcelamentos,
    };
  },
});
