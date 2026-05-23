import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getConsultorAccess } from "./_helpers";
import { Id } from "./_generated/dataModel";

// ============================================================
// MARCO 3.E - PAINEL DO CONSULTOR
// ============================================================
// Consultor e um tipo especial de user (role=consultor) que pode acessar
// dados de multiplas familias quando o cliente aprova um codigo de convite.

const CONVITE_VALIDADE_DIAS = 30;

function generateConviteCode(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  // codigo legivel em uppercase, 12 chars
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function dataExpiracaoConvite(criadoEm: string): Date {
  const d = new Date(criadoEm);
  d.setDate(d.getDate() + CONVITE_VALIDADE_DIAS);
  return d;
}

// ============================================================
// CLIENTES (familias) que o consultor acessa
// ============================================================

export const meusClientes = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role !== "consultor") {
      throw new Error("Acesso restrito a consultores");
    }

    const acessos = await ctx.db
      .query("acessosConsultor")
      .withIndex("by_consultor", (q) => q.eq("consultorId", user._id))
      .collect();

    // Para cada acesso ativo, busca dados da familia + estatisticas
    const result = await Promise.all(
      acessos.map(async (a) => {
        const familia = await ctx.db
          .query("familias")
          .withIndex("by_familyId", (q) => q.eq("familyId", a.familyId))
          .unique();

        // Comentarios pendentes (nao resolvidos) feitos pelo consultor.
        // Como o indice e by_familia_resolvido, ele filtra pela familia inteira;
        // depois filtramos no JS para pegar so os deste consultor.
        const comentariosPendentes = a.status === "ativo"
          ? await ctx.db
              .query("comentariosConsultor")
              .withIndex("by_familia_resolvido", (q) =>
                q.eq("familyId", a.familyId).eq("resolvido", false)
              )
              .collect()
          : [];
        const meusPendentes = comentariosPendentes.filter(
          (c) => c.consultorId === user._id
        );

        // Proxima reuniao agendada (futura, status=agendada)
        const agora = new Date().toISOString();
        const reunioes = a.status === "ativo"
          ? await ctx.db
              .query("reunioesConsultor")
              .withIndex("by_familia_data", (q) =>
                q.eq("familyId", a.familyId).gte("dataHora", agora)
              )
              .collect()
          : [];
        const proximaReuniao = reunioes
          .filter((r) => r.consultorId === user._id && r.status === "agendada")
          .sort((x, y) => x.dataHora.localeCompare(y.dataHora))[0];

        return {
          acessoId: a._id,
          familyId: a.familyId,
          nomeFamilia: familia?.nome ?? "Familia",
          status: a.status,
          conviteCode: a.conviteCode,
          criadoEm: a.criadoEm,
          aprovadoEm: a.aprovadoEm,
          comentariosPendentes: meusPendentes.length,
          proximaReuniao: proximaReuniao
            ? {
                id: proximaReuniao._id,
                titulo: proximaReuniao.titulo,
                dataHora: proximaReuniao.dataHora,
              }
            : null,
        };
      })
    );

    // Ordena: ativos primeiro, depois pendentes, depois revogados
    const ordem = { ativo: 0, pendente: 1, revogado: 2 } as const;
    return result.sort((a, b) => ordem[a.status] - ordem[b.status]);
  },
});

// Consultor cria um convite para uma familia. Familia recebe um conviteCode
// que deve ser inserido pelo admin para aprovar.
export const convidarFamilia = mutation({
  args: {
    sessionToken: v.string(),
    nomeFamiliaSugerido: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, nomeFamiliaSugerido }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role !== "consultor") {
      throw new Error("Acesso restrito a consultores");
    }

    const conviteCode = generateConviteCode();
    const criadoEm = new Date().toISOString();

    // familyId vai ser preenchido quando alguem aceitar o convite.
    // Por enquanto, usamos um placeholder unico baseado no convite.
    const placeholderFamilyId = `PENDING-${conviteCode}`;

    const id = await ctx.db.insert("acessosConsultor", {
      consultorId: user._id,
      familyId: placeholderFamilyId,
      status: "pendente",
      conviteCode,
      criadoEm,
    });

    return {
      acessoId: id,
      conviteCode,
      validadeDias: CONVITE_VALIDADE_DIAS,
      nomeFamiliaSugerido,
    };
  },
});

// Cliente (admin da familia) aceita um convite usando o codigo
export const aceitarConvite = mutation({
  args: { sessionToken: v.string(), conviteCode: v.string() },
  handler: async (ctx, { sessionToken, conviteCode }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role === "consultor") {
      throw new Error("Consultor nao pode aceitar convite");
    }
    if (user.role !== "admin") {
      throw new Error("Apenas o admin da familia pode aceitar convites");
    }

    const code = conviteCode.trim().toUpperCase();
    const acesso = await ctx.db
      .query("acessosConsultor")
      .withIndex("by_convite", (q) => q.eq("conviteCode", code))
      .unique();

    if (!acesso) throw new Error("Codigo de convite invalido");
    if (acesso.status === "ativo") throw new Error("Convite ja aprovado");
    if (acesso.status === "revogado") throw new Error("Convite revogado");

    // Verifica expiracao
    const expira = dataExpiracaoConvite(acesso.criadoEm);
    if (expira < new Date()) {
      throw new Error("Convite expirado");
    }

    // Verifica se ja existe acesso ativo deste consultor a esta familia
    const existente = await getConsultorAccess(ctx, acesso.consultorId, user.familyId);
    if (existente) {
      throw new Error("Este consultor ja tem acesso a sua familia");
    }

    await ctx.db.patch(acesso._id, {
      status: "ativo",
      familyId: user.familyId,
      aprovadoPor: user._id,
      aprovadoEm: new Date().toISOString(),
    });

    return { acessoId: acesso._id };
  },
});

// Cliente revoga acesso de um consultor (admin only)
export const revogarAcesso = mutation({
  args: { sessionToken: v.string(), acessoId: v.id("acessosConsultor") },
  handler: async (ctx, { sessionToken, acessoId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role !== "admin") {
      throw new Error("Apenas o admin da familia pode revogar acesso");
    }
    const acesso = await ctx.db.get(acessoId);
    if (!acesso) throw new Error("Acesso nao encontrado");
    if (acesso.familyId !== user.familyId) {
      throw new Error("Permissao negada");
    }
    await ctx.db.patch(acessoId, { status: "revogado" });
  },
});

// Lista consultores que tem acesso a familia do user logado
export const consultoresDaFamilia = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role === "consultor") return [];

    const acessos = await ctx.db
      .query("acessosConsultor")
      .withIndex("by_familia", (q) => q.eq("familyId", user.familyId))
      .collect();

    const result = await Promise.all(
      acessos.map(async (a) => {
        const consultor = await ctx.db.get(a.consultorId);
        return {
          acessoId: a._id,
          consultorId: a.consultorId,
          nomeConsultor: consultor?.name ?? "Consultor",
          emailConsultor: consultor?.email ?? "",
          status: a.status,
          aprovadoEm: a.aprovadoEm,
          criadoEm: a.criadoEm,
        };
      })
    );
    return result.sort((a, b) => {
      const ordem = { ativo: 0, pendente: 1, revogado: 2 } as const;
      return ordem[a.status] - ordem[b.status];
    });
  },
});

// ============================================================
// COMENTARIOS
// ============================================================

export const comentarios = query({
  args: {
    sessionToken: v.string(),
    familyId: v.string(),
    contextoTela: v.optional(v.string()),
    incluirResolvidos: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, familyId, contextoTela, incluirResolvidos }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    // Validacao de acesso: consultor com acesso ativo OU usuario da familia
    if (user.role === "consultor") {
      const acesso = await getConsultorAccess(ctx, user._id, familyId);
      if (!acesso) throw new Error("Sem acesso a esta familia");
    } else if (user.familyId !== familyId) {
      throw new Error("Permissao negada");
    }

    let q;
    if (contextoTela) {
      q = ctx.db
        .query("comentariosConsultor")
        .withIndex("by_familia_contexto", (qb) =>
          qb.eq("familyId", familyId).eq("contextoTela", contextoTela)
        );
    } else {
      q = ctx.db
        .query("comentariosConsultor")
        .withIndex("by_familia_resolvido", (qb) => qb.eq("familyId", familyId));
    }
    const todos = await q.collect();

    const filtrados = incluirResolvidos
      ? todos
      : todos.filter((c) => !c.resolvido);

    // Anexa nome do consultor
    const consultorIds = Array.from(new Set(filtrados.map((c) => c.consultorId)));
    const consultores = await Promise.all(consultorIds.map((id) => ctx.db.get(id)));
    const nomeMap = new Map(
      consultores.filter((c) => c !== null).map((c) => [c!._id as string, c!.name])
    );

    return filtrados
      .map((c) => ({
        ...c,
        nomeConsultor: nomeMap.get(c.consultorId as string) ?? "Consultor",
      }))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },
});

export const adicionarComentario = mutation({
  args: {
    sessionToken: v.string(),
    familyId: v.string(),
    contextoTela: v.string(),
    texto: v.string(),
  },
  handler: async (ctx, { sessionToken, familyId, contextoTela, texto }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role !== "consultor") {
      throw new Error("Apenas consultores podem comentar");
    }
    const acesso = await getConsultorAccess(ctx, user._id, familyId);
    if (!acesso) throw new Error("Sem acesso a esta familia");

    const textoLimpo = texto.trim();
    if (textoLimpo.length === 0) throw new Error("Texto obrigatorio");
    if (textoLimpo.length > 2000) throw new Error("Texto muito longo (max 2000)");

    const agora = new Date().toISOString();
    const id = await ctx.db.insert("comentariosConsultor", {
      consultorId: user._id,
      familyId,
      contextoTela,
      texto: textoLimpo,
      resolvido: false,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    return id;
  },
});

export const resolverComentario = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("comentariosConsultor"),
    resolvido: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, id, resolvido }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c) throw new Error("Comentario nao encontrado");

    // Apenas o autor (consultor) ou um membro da familia pode marcar/desmarcar
    if (user.role === "consultor") {
      if (c.consultorId !== user._id) throw new Error("Permissao negada");
    } else if (user.familyId !== c.familyId) {
      throw new Error("Permissao negada");
    }

    await ctx.db.patch(id, {
      resolvido: resolvido ?? !c.resolvido,
      atualizadoEm: new Date().toISOString(),
    });
  },
});

export const removerComentario = mutation({
  args: { sessionToken: v.string(), id: v.id("comentariosConsultor") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const c = await ctx.db.get(id);
    if (!c) throw new Error("Comentario nao encontrado");
    // So o autor pode remover
    if (user.role !== "consultor" || c.consultorId !== user._id) {
      throw new Error("Apenas o autor pode remover");
    }
    await ctx.db.delete(id);
  },
});

// ============================================================
// REUNIOES
// ============================================================

export const reunioes = query({
  args: {
    sessionToken: v.string(),
    familyId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, familyId }) => {
    const user = await getCurrentUser(ctx, sessionToken);

    let docs;
    if (user.role === "consultor") {
      // Consultor: lista todas as reunioes dele, opcionalmente filtra por familia
      const todas = await ctx.db
        .query("reunioesConsultor")
        .withIndex("by_consultor_data", (q) => q.eq("consultorId", user._id))
        .collect();
      docs = familyId ? todas.filter((r) => r.familyId === familyId) : todas;
    } else {
      // Cliente: so reunioes da sua familia (familyId arg ignorado)
      docs = await ctx.db
        .query("reunioesConsultor")
        .withIndex("by_familia_data", (q) => q.eq("familyId", user.familyId))
        .collect();
    }

    // Anexa nome do consultor e nome da familia
    const consultorIds = Array.from(new Set(docs.map((d) => d.consultorId)));
    const familyIds = Array.from(new Set(docs.map((d) => d.familyId)));
    const [consultores, familias] = await Promise.all([
      Promise.all(consultorIds.map((id) => ctx.db.get(id))),
      Promise.all(
        familyIds.map((fid) =>
          ctx.db
            .query("familias")
            .withIndex("by_familyId", (q) => q.eq("familyId", fid))
            .unique()
        )
      ),
    ]);
    const consultorMap = new Map(
      consultores.filter((c) => c !== null).map((c) => [c!._id as string, c!.name])
    );
    const familiaMap = new Map(
      familias.filter((f) => f !== null).map((f) => [f!.familyId, f!.nome])
    );

    return docs
      .map((d) => ({
        ...d,
        nomeConsultor: consultorMap.get(d.consultorId as string) ?? "Consultor",
        nomeFamilia: familiaMap.get(d.familyId) ?? "Familia",
      }))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  },
});

export const agendarReuniao = mutation({
  args: {
    sessionToken: v.string(),
    familyId: v.string(),
    titulo: v.string(),
    dataHora: v.string(),
    duracaoMinutos: v.number(),
    pauta: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { sessionToken, familyId, titulo, dataHora, duracaoMinutos, pauta }
  ) => {
    const user = await getCurrentUser(ctx, sessionToken);

    let consultorId: Id<"users">;
    if (user.role === "consultor") {
      const acesso = await getConsultorAccess(ctx, user._id, familyId);
      if (!acesso) throw new Error("Sem acesso a esta familia");
      consultorId = user._id;
    } else {
      // Cliente agendando: precisa ter pelo menos 1 consultor com acesso ativo.
      if (user.familyId !== familyId) throw new Error("Permissao negada");
      const acessos = await ctx.db
        .query("acessosConsultor")
        .withIndex("by_familia", (q) => q.eq("familyId", familyId))
        .filter((q) => q.eq(q.field("status"), "ativo"))
        .collect();
      if (acessos.length === 0) {
        throw new Error("Nenhum consultor com acesso ativo");
      }
      // Pega o primeiro consultor (V1: simples). V2: permitir escolher.
      consultorId = acessos[0].consultorId;
    }

    if (titulo.trim().length === 0) throw new Error("Titulo obrigatorio");
    if (duracaoMinutos < 15 || duracaoMinutos > 480) {
      throw new Error("Duracao deve estar entre 15 e 480 minutos");
    }

    return await ctx.db.insert("reunioesConsultor", {
      consultorId,
      familyId,
      titulo: titulo.trim(),
      dataHora,
      duracaoMinutos,
      pauta: pauta?.trim() || undefined,
      status: "agendada",
      criadoEm: new Date().toISOString(),
    });
  },
});

export const atualizarReuniao = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("reunioesConsultor"),
    status: v.optional(
      v.union(
        v.literal("agendada"),
        v.literal("realizada"),
        v.literal("cancelada")
      )
    ),
    titulo: v.optional(v.string()),
    dataHora: v.optional(v.string()),
    duracaoMinutos: v.optional(v.number()),
    pauta: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...rest }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r) throw new Error("Reuniao nao encontrada");

    if (user.role === "consultor") {
      if (r.consultorId !== user._id) throw new Error("Permissao negada");
    } else if (user.familyId !== r.familyId) {
      throw new Error("Permissao negada");
    }

    const patch: Record<string, unknown> = {};
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.titulo !== undefined) patch.titulo = rest.titulo.trim();
    if (rest.dataHora !== undefined) patch.dataHora = rest.dataHora;
    if (rest.duracaoMinutos !== undefined) {
      if (rest.duracaoMinutos < 15 || rest.duracaoMinutos > 480) {
        throw new Error("Duracao deve estar entre 15 e 480 minutos");
      }
      patch.duracaoMinutos = rest.duracaoMinutos;
    }
    if (rest.pauta !== undefined) patch.pauta = rest.pauta.trim() || undefined;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
    }
  },
});

export const removerReuniao = mutation({
  args: { sessionToken: v.string(), id: v.id("reunioesConsultor") },
  handler: async (ctx, { sessionToken, id }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    const r = await ctx.db.get(id);
    if (!r) throw new Error("Reuniao nao encontrada");
    if (user.role === "consultor") {
      if (r.consultorId !== user._id) throw new Error("Permissao negada");
    } else if (user.familyId !== r.familyId) {
      throw new Error("Permissao negada");
    }
    await ctx.db.delete(id);
  },
});

// ============================================================
// QUERIES READ-ONLY ESPECIFICAS DO CONSULTOR
// ============================================================
// Consultor precisa visualizar dados da familia. Em vez de modificar todas
// as queries existentes, criamos wrappers especificos que reusam a logica.

// Resumo financeiro da familia para o consultor
export const resumoCliente = query({
  args: { sessionToken: v.string(), familyId: v.string() },
  handler: async (ctx, { sessionToken, familyId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role === "consultor") {
      const acesso = await getConsultorAccess(ctx, user._id, familyId);
      if (!acesso) throw new Error("Sem acesso a esta familia");
    } else if (user.familyId !== familyId) {
      throw new Error("Permissao negada");
    }

    const familia = await ctx.db
      .query("familias")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .unique();

    const [pessoas, contas, dividas, metas] = await Promise.all([
      ctx.db
        .query("pessoas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("contas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("dividas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("metas")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect(),
    ]);

    const dividasAtivas = dividas.filter((d) => d.ativa);
    const metasAtivas = metas.filter((m) => m.ativa);
    const saldoTotal = contas
      .filter((c) => c.ativa)
      .reduce((s, c) => s + c.saldoInicial, 0);

    return {
      nomeFamilia: familia?.nome ?? "Familia",
      familyId,
      qtdPessoas: pessoas.filter((p) => p.ativo).length,
      qtdContas: contas.filter((c) => c.ativa).length,
      qtdDividasAtivas: dividasAtivas.length,
      qtdMetasAtivas: metasAtivas.length,
      saldoInicialTotal: saldoTotal,
      pessoas: pessoas
        .filter((p) => p.ativo)
        .map((p) => ({
          _id: p._id,
          nome: p.nome,
          apelido: p.apelido,
          tipo: p.tipo,
          fotoUrl: p.fotoUrl,
          corTema: p.corTema,
          xpTotal: p.xpTotal,
          nivelAtual: p.nivelAtual,
        })),
    };
  },
});

// Lista resumida de dividas para o consultor
export const dividasCliente = query({
  args: { sessionToken: v.string(), familyId: v.string() },
  handler: async (ctx, { sessionToken, familyId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role === "consultor") {
      const acesso = await getConsultorAccess(ctx, user._id, familyId);
      if (!acesso) throw new Error("Sem acesso a esta familia");
    } else if (user.familyId !== familyId) {
      throw new Error("Permissao negada");
    }

    return await ctx.db
      .query("dividas")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .collect();
  },
});

// Lista resumida de metas para o consultor
export const metasCliente = query({
  args: { sessionToken: v.string(), familyId: v.string() },
  handler: async (ctx, { sessionToken, familyId }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role === "consultor") {
      const acesso = await getConsultorAccess(ctx, user._id, familyId);
      if (!acesso) throw new Error("Sem acesso a esta familia");
    } else if (user.familyId !== familyId) {
      throw new Error("Permissao negada");
    }

    return await ctx.db
      .query("metas")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .collect();
  },
});

// Resumo do mes (despesas/receitas/saldo) para uma familia
// Reusa a logica de financeiro/dashboardFinanceiro mas com auth flexivel.
export const resumoMesCliente = query({
  args: {
    sessionToken: v.string(),
    familyId: v.string(),
    mes: v.string(),
  },
  handler: async (ctx, { sessionToken, familyId, mes }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role === "consultor") {
      const acesso = await getConsultorAccess(ctx, user._id, familyId);
      if (!acesso) throw new Error("Sem acesso a esta familia");
    } else if (user.familyId !== familyId) {
      throw new Error("Permissao negada");
    }

    const [despesas, receitas] = await Promise.all([
      ctx.db
        .query("despesas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
        .collect(),
      ctx.db
        .query("receitas")
        .withIndex("by_family_mes", (q) => q.eq("familyId", familyId))
        .collect(),
    ]);

    function monthDiff(from: string, to: string): number {
      const [fy, fm] = from.split("-").map(Number);
      const [ty, tm] = to.split("-").map(Number);
      return (ty - fy) * 12 + (tm - fm);
    }
    function isDespesaInMes(d: typeof despesas[number], m: string): boolean {
      const origMes = d.dataVencimento.slice(0, 7);
      if (d.tipo === "avulsa") return origMes === m;
      if (d.tipo === "fixa") {
        if (m < origMes) return false;
        const periodicidade = d.periodicidade ?? "mensal";
        if (periodicidade === "mensal") return true;
        const mesAlvoNum = Number(m.slice(5, 7));
        if (periodicidade === "anual") {
          return Number(origMes.slice(5, 7)) === mesAlvoNum;
        }
        const meses: number[] = d.mesesSazonais ?? [];
        return meses.includes(mesAlvoNum);
      }
      if (d.tipo === "parcelada") {
        const parcelaInicial = d.parcelaAtual ?? 1;
        const offset = monthDiff(origMes, m);
        return offset >= 0 && parcelaInicial + offset <= (d.totalParcelas ?? 1);
      }
      return false;
    }
    function isReceitaInMes(r: typeof receitas[number], m: string): boolean {
      const origMes = r.dataPrevisao.slice(0, 7);
      if (r.tipo === "avulsa") return origMes === m;
      if (r.tipo === "fixa") {
        if (m < origMes) return false;
        const periodicidade = r.periodicidade ?? "mensal";
        if (periodicidade === "mensal") return true;
        const mesAlvoNum = Number(m.slice(5, 7));
        if (periodicidade === "anual") {
          return Number(origMes.slice(5, 7)) === mesAlvoNum;
        }
        const meses: number[] = r.mesesSazonais ?? [];
        return meses.includes(mesAlvoNum);
      }
      if (r.tipo === "parcelada") {
        const offset = monthDiff(origMes, m);
        return offset >= 0 && offset < (r.totalParcelas ?? 1);
      }
      return false;
    }
    function valorDespesa(d: typeof despesas[number], m: string): number {
      const ov = (d.overrides ?? []).find((o) => o.mes === m);
      if (ov && typeof ov.valor === "number") return ov.valor;
      return d.valor;
    }
    function valorReceita(r: typeof receitas[number], m: string): number {
      const ov = (r.overrides ?? []).find((o) => o.mes === m);
      if (ov && typeof ov.valor === "number") return ov.valor;
      return r.valor;
    }

    const dMes = despesas.filter((d) => isDespesaInMes(d, mes));
    const rMes = receitas.filter((r) => isReceitaInMes(r, mes));

    const [pagamentos, recebimentos] = await Promise.all([
      ctx.db
        .query("pagamentosDespesas")
        .withIndex("by_familia_mes", (q) =>
          q.eq("familyId", familyId).eq("mes", mes)
        )
        .collect(),
      ctx.db
        .query("recebimentosReceitas")
        .withIndex("by_familia_mes", (q) =>
          q.eq("familyId", familyId).eq("mes", mes)
        )
        .collect(),
    ]);
    const pagoSet = new Set(pagamentos.map((p) => p.despesaId as string));
    const recebidoSet = new Set(recebimentos.map((r) => r.receitaId as string));

    const totalDespesas = dMes.reduce((s, d) => s + valorDespesa(d, mes), 0);
    const totalReceitas = rMes.reduce((s, r) => s + valorReceita(r, mes), 0);
    const pagas = dMes
      .filter((d) => pagoSet.has(d._id as string))
      .reduce((s, d) => s + valorDespesa(d, mes), 0);
    const recebidas = rMes
      .filter((r) => recebidoSet.has(r._id as string))
      .reduce((s, r) => s + valorReceita(r, mes), 0);

    return {
      totalDespesas,
      totalReceitas,
      saldo: totalReceitas - totalDespesas,
      aPagar: totalDespesas - pagas,
      aReceber: totalReceitas - recebidas,
      economia: recebidas - pagas,
      qtdDespesas: dMes.length,
      qtdReceitas: rMes.length,
    };
  },
});

// Lista de comentarios PENDENTES de um consultor agregando todas as familias.
// Util pra dashboard "minha caixa de entrada".
export const meusComentariosPendentes = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role !== "consultor") return [];

    const todos = await ctx.db
      .query("comentariosConsultor")
      .withIndex("by_consultor", (q) => q.eq("consultorId", user._id))
      .collect();
    const pendentes = todos.filter((c) => !c.resolvido);

    const familyIds = Array.from(new Set(pendentes.map((c) => c.familyId)));
    const familias = await Promise.all(
      familyIds.map((fid) =>
        ctx.db
          .query("familias")
          .withIndex("by_familyId", (q) => q.eq("familyId", fid))
          .unique()
      )
    );
    const map = new Map(
      familias.filter((f) => f !== null).map((f) => [f!.familyId, f!.nome])
    );

    return pendentes
      .map((c) => ({
        ...c,
        nomeFamilia: map.get(c.familyId) ?? "Familia",
      }))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },
});

// Estatisticas globais do consultor (dashboard /consultor)
export const dashboardConsultor = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    if (user.role !== "consultor") {
      throw new Error("Acesso restrito a consultores");
    }

    const acessos = await ctx.db
      .query("acessosConsultor")
      .withIndex("by_consultor", (q) => q.eq("consultorId", user._id))
      .collect();
    const ativos = acessos.filter((a) => a.status === "ativo");
    const pendentes = acessos.filter((a) => a.status === "pendente");

    // Comentarios pendentes (eu autor)
    const meusComentarios = await ctx.db
      .query("comentariosConsultor")
      .withIndex("by_consultor", (q) => q.eq("consultorId", user._id))
      .collect();
    const comentariosAbertos = meusComentarios.filter((c) => !c.resolvido).length;

    // Reunioes futuras
    const agora = new Date().toISOString();
    const reunioesFuturas = await ctx.db
      .query("reunioesConsultor")
      .withIndex("by_consultor_data", (q) =>
        q.eq("consultorId", user._id).gte("dataHora", agora)
      )
      .collect();
    const proximas = reunioesFuturas.filter((r) => r.status === "agendada");

    return {
      qtdClientesAtivos: ativos.length,
      qtdConvitesPendentes: pendentes.length,
      qtdComentariosAbertos: comentariosAbertos,
      qtdReunioesProximas: proximas.length,
    };
  },
});
