import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ CORE / AUTH ============
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    familyId: v.string(),
    pessoaId: v.optional(v.id("pessoas")),
  })
    .index("by_email", ["email"])
    .index("by_family", ["familyId"]),

  // Sessões de login (token simples)
  sessions: defineTable({
    userId: v.id("users"),
    familyId: v.string(),
    token: v.string(),
    expiresAt: v.string(), // ISO
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  familias: defineTable({
    nome: v.string(),
    familyId: v.string(),
    conviteCode: v.optional(v.string()),
    criadoEm: v.string(),
  }).index("by_familyId", ["familyId"]),

  // ============ PESSOAS ============
  pessoas: defineTable({
    nome: v.string(),
    apelido: v.optional(v.string()),
    tipo: v.union(v.literal("titular"), v.literal("dependente")),
    fotoUrl: v.optional(v.string()),
    fotoStorageId: v.optional(v.id("_storage")),
    corTema: v.string(),
    horarioTrabalho: v.optional(
      v.object({
        diasSemana: v.array(v.number()),
        horaInicio: v.string(),
        horaFim: v.string(),
        cargaHorariaDiaria: v.number(),
        intervalos: v.optional(
          v.array(
            v.object({
              inicio: v.string(),
              fim: v.string(),
              descricao: v.string(),
            })
          )
        ),
      })
    ),
    xpTotal: v.number(),
    nivelAtual: v.number(),
    tarefasCompletadasTotal: v.number(),
    streakDias: v.number(),
    ultimaAtividade: v.optional(v.string()),
    familyId: v.string(),
    ativo: v.boolean(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_xp", ["familyId", "xpTotal"]),

  // ============ FINANCEIRO ============
  categorias: defineTable({
    nome: v.string(),
    tipo: v.union(v.literal("despesa"), v.literal("receita")),
    icone: v.string(),
    cor: v.string(),
    familyId: v.string(),
  }).index("by_family_tipo", ["familyId", "tipo"]),

  pagadores: defineTable({
    nome: v.string(),
    apelido: v.optional(v.string()),
    tipo: v.union(v.literal("pessoa_fisica"), v.literal("pessoa_juridica"), v.literal("outro")),
    documento: v.optional(v.string()),
    cor: v.string(),
    icone: v.optional(v.string()),
    observacao: v.optional(v.string()),
    ativo: v.boolean(),
    familyId: v.string(),
  }).index("by_family", ["familyId"]),

  despesas: defineTable({
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.optional(v.id("pessoas")),
    dataVencimento: v.string(),
    dataPagamento: v.optional(v.string()),
    pago: v.boolean(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
    metaIdOrigem: v.optional(v.id("metas")),
    criadoPor: v.id("users"),
    familyId: v.string(),
    criadoEm: v.string(),
  })
    .index("by_family_mes", ["familyId", "dataVencimento"])
    .index("by_family_categoria", ["familyId", "categoriaId"]),

  receitas: defineTable({
    descricao: v.string(),
    valor: v.number(),
    tipo: v.union(v.literal("fixa"), v.literal("parcelada"), v.literal("avulsa")),
    categoriaId: v.id("categorias"),
    pessoaId: v.id("pessoas"),
    pagadorId: v.optional(v.id("pagadores")),
    pagadorNome: v.optional(v.string()),
    dataPrevisao: v.string(),
    dataRecebimento: v.optional(v.string()),
    recebido: v.boolean(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    recorrente: v.optional(v.boolean()),
    observacao: v.optional(v.string()),
    criadoPor: v.id("users"),
    familyId: v.string(),
    criadoEm: v.string(),
  })
    .index("by_family_mes", ["familyId", "dataPrevisao"])
    .index("by_family_pessoa", ["familyId", "pessoaId"]),

  metas: defineTable({
    titulo: v.string(),
    descricao: v.optional(v.string()),
    valorAlvo: v.number(),
    valorAtual: v.number(),
    prazo: v.string(),
    icone: v.string(),
    cor: v.string(),
    ativa: v.boolean(),
    familyId: v.string(),
    criadoPor: v.id("users"),
  }).index("by_family", ["familyId"]),

  aportesMeta: defineTable({
    metaId: v.id("metas"),
    valor: v.number(),
    data: v.string(),
    observacao: v.optional(v.string()),
    familyId: v.string(),
  }).index("by_meta", ["metaId"]),

  pagamentosDespesas: defineTable({
    despesaId: v.id("despesas"),
    mes: v.string(),
    dataPagamento: v.string(),
    valorPago: v.optional(v.number()),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_familia_mes", ["familyId", "mes"])
    .index("by_despesa_mes", ["despesaId", "mes"]),

  recebimentosReceitas: defineTable({
    receitaId: v.id("receitas"),
    mes: v.string(),
    dataRecebimento: v.string(),
    valorRecebido: v.optional(v.number()),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_familia_mes", ["familyId", "mes"])
    .index("by_receita_mes", ["receitaId", "mes"]),

  // ============ TAREFAS ============
  tarefasCatalogo: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
    icone: v.string(),
    cor: v.string(),
    categoria: v.string(),
    tempoExecucaoMinutos: v.number(),
    xpBase: v.number(),
    dificuldade: v.union(v.literal("facil"), v.literal("media"), v.literal("dificil")),
    recorrencia: v.optional(
      v.union(v.literal("diaria"), v.literal("semanal"), v.literal("mensal"), v.literal("pontual"))
    ),
    familyId: v.string(),
    ativa: v.boolean(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_categoria", ["familyId", "categoria"]),

  tarefasLancamentos: defineTable({
    tarefaCatalogoId: v.id("tarefasCatalogo"),
    pessoaId: v.id("pessoas"),
    data: v.string(),
    horarioAgendado: v.optional(v.object({ inicio: v.string(), fim: v.string() })),
    completada: v.boolean(),
    completadaEm: v.optional(v.string()),
    xpGanho: v.number(),
    nomeSnapshot: v.string(),
    iconeSnapshot: v.string(),
    corSnapshot: v.string(),
    tempoExecucaoSnapshot: v.number(),
    observacao: v.optional(v.string()),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_family_data", ["familyId", "data"])
    .index("by_pessoa_data", ["pessoaId", "data"]),

  // ============ CARTÕES ============
  cartoes: defineTable({
    nome: v.string(),
    bandeira: v.optional(v.string()), // Visa, Mastercard, Elo, etc.
    cor: v.string(),
    familyId: v.string(),
  }).index("by_family", ["familyId"]),

  // Recorrência: quais tarefas do catálogo cada pessoa faz regularmente
  tarefasRecorrentes: defineTable({
    pessoaId: v.id("pessoas"),
    tarefaCatalogoId: v.id("tarefasCatalogo"),
    // 0=Dom, 1=Seg ... 6=Sáb; undefined = todos os dias
    diasSemana: v.optional(v.array(v.number())),
    familyId: v.string(),
    ativo: v.boolean(),
  })
    .index("by_familia", ["familyId"])
    .index("by_pessoa_ativo", ["pessoaId", "ativo"]),

  levelUps: defineTable({
    pessoaId: v.id("pessoas"),
    nivelAnterior: v.number(),
    nivelNovo: v.number(),
    tituloNovo: v.string(),
    data: v.string(),
    visualizado: v.boolean(),
    familyId: v.string(),
  }).index("by_pessoa_visualizado", ["pessoaId", "visualizado"]),

  conquistas: defineTable({
    pessoaId: v.id("pessoas"),
    tipo: v.string(),
    nome: v.string(),
    descricao: v.string(),
    icone: v.string(),
    desbloqueadaEm: v.string(),
    familyId: v.string(),
  }).index("by_pessoa", ["pessoaId"]),

  // ============ AGENTE IA ============
  conversasIA: defineTable({
    titulo: v.string(),
    familyId: v.string(),
    pessoaId: v.optional(v.id("pessoas")),
    canal: v.union(v.literal("web"), v.literal("whatsapp")),
    ultimaMensagemEm: v.string(),
    arquivada: v.boolean(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_atualizada", ["familyId", "ultimaMensagemEm"]),

  mensagensIA: defineTable({
    conversaId: v.id("conversasIA"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolUseBlocks: v.optional(v.string()),
    toolResultBlocks: v.optional(v.string()),
    anexos: v.optional(
      v.array(
        v.object({
          tipo: v.union(v.literal("imagem"), v.literal("pdf"), v.literal("audio")),
          storageId: v.id("_storage"),
          nome: v.string(),
          mediaType: v.string(),
          transcricao: v.optional(v.string()),
        })
      )
    ),
    familyId: v.string(),
    criadoEm: v.string(),
  }).index("by_conversa", ["conversaId"]),

  draftsLancamento: defineTable({
    conversaId: v.id("conversasIA"),
    mensagemId: v.optional(v.id("mensagensIA")),
    tipo: v.union(
      v.literal("despesa"),
      v.literal("receita"),
      v.literal("marcar_paga"),
      v.literal("marcar_recebida")
    ),
    payload: v.string(),
    resumo: v.string(),
    status: v.union(v.literal("pendente"), v.literal("confirmado"), v.literal("cancelado")),
    despesaIdCriada: v.optional(v.id("despesas")),
    receitaIdCriada: v.optional(v.id("receitas")),
    erro: v.optional(v.string()),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
    resolvidoEm: v.optional(v.string()),
  })
    .index("by_conversa", ["conversaId"])
    .index("by_conversa_status", ["conversaId", "status"]),
});
