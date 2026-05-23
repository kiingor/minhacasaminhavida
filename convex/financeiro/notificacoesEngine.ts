import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// ============================================================================
// MARCO 3.C - Engine de deteccao de eventos para notificacoes
// ============================================================================
//
// Roda toda a logica idempotente de criacao de notificacoes.
// E disparado pelo frontend quando o usuario abre o app.
//
// Idempotencia: cada notificacao tem uma `chaveDedup` (tipo + entidade + janela).
// Antes de criar uma nova, checamos se ja existe pra cada user da familia.

// ---------------- Helpers ----------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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

function projetarParaMes(dataOriginal: string, mesAlvo: string): string {
  const diaOriginal = Number(dataOriginal.slice(8, 10));
  const [y, m] = mesAlvo.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  const dia = Math.min(diaOriginal, ultimoDia);
  return `${mesAlvo}-${String(dia).padStart(2, "0")}`;
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------------- Tipos ----------------

type Prefs = {
  orcamento80: boolean;
  vencimentoAmanha: boolean;
  metaAtingida: boolean;
  resumoSemanal: boolean;
  moneyDate: boolean;
};

type NovaNotificacao = {
  tipo:
    | "orcamento_80"
    | "orcamento_estourado"
    | "vencimento_amanha"
    | "meta_atingida"
    | "resumo_semanal"
    | "money_date"
    | "divida_quitada"
    | "reserva_completa";
  titulo: string;
  mensagem: string;
  link?: string;
  chaveDedup: string;
  prefKey: keyof Prefs | null; // qual preferencia controla esse tipo (null = sempre)
};

// ---------------- Helpers de banco ----------------

async function getFamilyUsers(ctx: MutationCtx, familyId: string): Promise<Doc<"users">[]> {
  return await ctx.db
    .query("users")
    .withIndex("by_family", (q) => q.eq("familyId", familyId))
    .collect();
}

async function getPrefs(ctx: MutationCtx, userId: Id<"users">): Promise<Prefs> {
  const p = await ctx.db
    .query("preferenciasNotificacao")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (p) {
    return {
      orcamento80: p.orcamento80,
      vencimentoAmanha: p.vencimentoAmanha,
      metaAtingida: p.metaAtingida,
      resumoSemanal: p.resumoSemanal,
      moneyDate: p.moneyDate,
    };
  }
  return {
    orcamento80: true,
    vencimentoAmanha: true,
    metaAtingida: true,
    resumoSemanal: true,
    moneyDate: true,
  };
}

async function jaNotificou(
  ctx: MutationCtx,
  userId: Id<"users">,
  chaveDedup: string
): Promise<boolean> {
  const existente = await ctx.db
    .query("notificacoes")
    .withIndex("by_user_dedup", (q) => q.eq("userId", userId).eq("chaveDedup", chaveDedup))
    .first();
  return existente !== null;
}

async function criarParaFamilia(
  ctx: MutationCtx,
  familyId: string,
  users: Doc<"users">[],
  evento: NovaNotificacao
) {
  const agora = new Date().toISOString();
  let criadas = 0;
  for (const u of users) {
    // Respeita preferencia
    if (evento.prefKey) {
      const prefs = await getPrefs(ctx, u._id);
      if (!prefs[evento.prefKey]) continue;
    }
    // Idempotencia
    if (await jaNotificou(ctx, u._id, evento.chaveDedup)) continue;

    await ctx.db.insert("notificacoes", {
      userId: u._id,
      familyId,
      tipo: evento.tipo,
      titulo: evento.titulo,
      mensagem: evento.mensagem,
      link: evento.link,
      chaveDedup: evento.chaveDedup,
      lida: false,
      criadaEm: agora,
    });
    criadas++;
  }
  return criadas;
}

// ============================================================================
// Mutation principal
// ============================================================================

export const verificarEventos = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const familyId = user.familyId;
    const hoje = todayISO();
    const amanha = addDaysISO(hoje, 1);
    const mes = currentMonth();
    const diaDoMes = Number(hoje.slice(8, 10));

    const users = await getFamilyUsers(ctx, familyId);
    if (users.length === 0) return { criadas: 0 };

    let totalCriadas = 0;

    // ----------------------------------------------------------------
    // Evento: orcamento_80 / orcamento_estourado
    // ----------------------------------------------------------------
    {
      const [despesas, categorias, limites] = await Promise.all([
        ctx.db
          .query("despesas")
          .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
          .collect(),
        ctx.db
          .query("categorias")
          .withIndex("by_family_tipo", (q) => q.eq("familyId", familyId).eq("tipo", "despesa"))
          .collect(),
        ctx.db
          .query("limitesOrcamento")
          .withIndex("by_family_mes", (q) => q.eq("familyId", familyId).eq("mes", mes))
          .collect(),
      ]);

      if (limites.length > 0) {
        const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
        const realizadoPorCat = new Map<string, number>();
        for (const d of dMes) {
          const valor = valorDespesaNoMes(d, mes);
          const k = d.categoriaId as string;
          realizadoPorCat.set(k, (realizadoPorCat.get(k) ?? 0) + valor);
        }

        // Soma realizado considerando hierarquia (se limite e da mae, soma filhas tambem)
        const filhasPorPai = new Map<string, Doc<"categorias">[]>();
        for (const c of categorias) {
          if (c.categoriaPaiId) {
            const k = c.categoriaPaiId as string;
            if (!filhasPorPai.has(k)) filhasPorPai.set(k, []);
            filhasPorPai.get(k)!.push(c);
          }
        }
        const catMap = new Map(categorias.map((c) => [c._id as string, c]));

        for (const limite of limites) {
          if (limite.valorLimite <= 0) continue;
          const cat = catMap.get(limite.categoriaId as string);
          if (!cat) continue;

          const realizadoProprio = realizadoPorCat.get(limite.categoriaId as string) ?? 0;
          const filhas = filhasPorPai.get(limite.categoriaId as string) ?? [];
          const realizadoFilhas = filhas.reduce(
            (s, f) => s + (realizadoPorCat.get(f._id as string) ?? 0),
            0
          );
          const realizado = realizadoProprio + realizadoFilhas;
          const percentual = (realizado / limite.valorLimite) * 100;

          if (percentual >= 100) {
            const evento: NovaNotificacao = {
              tipo: "orcamento_estourado",
              titulo: `Orçamento estourado: ${cat.nome}`,
              mensagem: `Você gastou ${formatBRL(realizado)} de ${formatBRL(
                limite.valorLimite
              )} (${Math.round(percentual)}%) este mês.`,
              link: "/financeiro/orcamento",
              chaveDedup: `orcamento_estourado:${limite.categoriaId}:${mes}`,
              prefKey: "orcamento80",
            };
            totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
          } else if (percentual >= 80) {
            const evento: NovaNotificacao = {
              tipo: "orcamento_80",
              titulo: `Atenção: ${cat.nome} em ${Math.round(percentual)}%`,
              mensagem: `Você já gastou ${formatBRL(realizado)} de ${formatBRL(
                limite.valorLimite
              )} este mês.`,
              link: "/financeiro/orcamento",
              chaveDedup: `orcamento_80:${limite.categoriaId}:${mes}`,
              prefKey: "orcamento80",
            };
            totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // Evento: vencimento_amanha
    // ----------------------------------------------------------------
    {
      const mesAmanha = amanha.slice(0, 7);
      const meses = mes === mesAmanha ? [mes] : [mes, mesAmanha];

      const despesas = await ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
        .collect();

      // Pagamentos efetuados (qualquer mes em jogo)
      const pagamentosArrays = await Promise.all(
        meses.map((m) =>
          ctx.db
            .query("pagamentosDespesas")
            .withIndex("by_familia_mes", (q) => q.eq("familyId", familyId).eq("mes", m))
            .collect()
        )
      );
      const pagosPorMes = new Map<string, Set<string>>();
      meses.forEach((m, i) => {
        pagosPorMes.set(m, new Set(pagamentosArrays[i].map((p) => p.despesaId as string)));
      });

      const incluidas = new Set<string>();
      for (const mAlvo of meses) {
        const dMes = despesas.filter((d) => isDespesaInMes(d, mAlvo));
        const pagos = pagosPorMes.get(mAlvo) ?? new Set<string>();
        for (const d of dMes) {
          const idStr = d._id as string;
          if (incluidas.has(idStr)) continue;
          if (pagos.has(idStr)) continue;
          const ov = (d.overrides ?? []).find((o) => o.mes === mAlvo);
          const dataBase = ov?.dataVencimento ?? d.dataVencimento;
          const dataProj =
            dataBase.slice(0, 7) === mAlvo ? dataBase : projetarParaMes(dataBase, mAlvo);
          if (dataProj === amanha) {
            incluidas.add(idStr);
            const valor = ov?.valor ?? d.valor;
            const descricao = ov?.descricao ?? d.descricao;
            const evento: NovaNotificacao = {
              tipo: "vencimento_amanha",
              titulo: `Vence amanhã: ${descricao}`,
              mensagem: `${formatBRL(valor)} com vencimento em ${dataProj.slice(8, 10)}/${dataProj.slice(5, 7)}.`,
              link: "/financeiro/lancamentos",
              chaveDedup: `vencimento_amanha:${idStr}:${dataProj}`,
              prefKey: "vencimentoAmanha",
            };
            totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // Evento: meta_atingida / reserva_completa
    // ----------------------------------------------------------------
    {
      const metas = await ctx.db
        .query("metas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect();
      for (const meta of metas) {
        if (!meta.ativa) continue;
        if (meta.valorAlvo <= 0) continue;
        if (meta.valorAtual < meta.valorAlvo) continue;

        const isReserva = meta.tipoEspecial === "reserva_emergencia";
        const evento: NovaNotificacao = {
          tipo: isReserva ? "reserva_completa" : "meta_atingida",
          titulo: isReserva
            ? "Reserva de emergência completa!"
            : `Meta atingida: ${meta.titulo}`,
          mensagem: isReserva
            ? `Você atingiu ${formatBRL(meta.valorAtual)} de ${formatBRL(
                meta.valorAlvo
              )}. Sua família está protegida.`
            : `Parabéns! Você juntou ${formatBRL(meta.valorAtual)} para "${meta.titulo}".`,
          link: "/financeiro/metas",
          chaveDedup: isReserva
            ? `reserva_completa:${meta._id}`
            : `meta_atingida:${meta._id}`,
          prefKey: "metaAtingida",
        };
        totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
      }
    }

    // ----------------------------------------------------------------
    // Evento: divida_quitada
    // ----------------------------------------------------------------
    {
      const dividas = await ctx.db
        .query("dividas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect();
      for (const divida of dividas) {
        if (divida.ativa) continue; // ja quitada => ativa=false
        if (divida.saldoDevedor > 0) continue;
        const evento: NovaNotificacao = {
          tipo: "divida_quitada",
          titulo: `Dívida quitada: ${divida.nome}`,
          mensagem: `Você terminou de pagar ${formatBRL(divida.valorOriginal)}. Liberdade!`,
          link: "/financeiro/dividas",
          chaveDedup: `divida_quitada:${divida._id}`,
          prefKey: null, // sempre notifica conquistas grandes
        };
        totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
      }
    }

    // ----------------------------------------------------------------
    // Evento: money_date (dia 5 do mes)
    // ----------------------------------------------------------------
    if (diaDoMes >= 5) {
      const evento: NovaNotificacao = {
        tipo: "money_date",
        titulo: "Hora do Money Date deste mês",
        mensagem: "Reúna o casal e revise as finanças do mês com a pauta pronta.",
        link: "/financeiro/money-date",
        chaveDedup: `money_date:${mes}`,
        prefKey: "moneyDate",
      };
      totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
    }

    // ----------------------------------------------------------------
    // Evento: resumo_semanal (toda segunda-feira)
    // ----------------------------------------------------------------
    {
      const [y, m, d] = hoje.split("-").map(Number);
      const diaSemana = new Date(y, m - 1, d).getDay(); // 0=Dom, 1=Seg ...
      if (diaSemana === 1) {
        // Calcula numero da semana ISO simples (yyyy-Www) a partir de hoje
        const inicio = new Date(y, 0, 1);
        const diasDesdeInicio = Math.floor(
          (new Date(y, m - 1, d).getTime() - inicio.getTime()) / 86400000
        );
        const semana = Math.ceil((diasDesdeInicio + inicio.getDay() + 1) / 7);
        const evento: NovaNotificacao = {
          tipo: "resumo_semanal",
          titulo: "Resumo da sua semana",
          mensagem: "Veja como sua família se saiu na última semana.",
          link: "/financeiro",
          chaveDedup: `resumo_semanal:${y}-W${String(semana).padStart(2, "0")}`,
          prefKey: "resumoSemanal",
        };
        totalCriadas += await criarParaFamilia(ctx, familyId, users, evento);
      }
    }

    return { criadas: totalCriadas };
  },
});
