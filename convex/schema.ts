import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ CORE / AUTH ============
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    // Marco 3.E - "consultor" e um tipo especial: nao pertence a uma familia,
    // tem acesso a multiplas familias via tabela acessosConsultor.
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("consultor")),
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
    // Subcategorias hierarquicas (max 2 niveis: mae -> filha)
    categoriaPaiId: v.optional(v.id("categorias")),
    familyId: v.string(),
  })
    .index("by_family_tipo", ["familyId", "tipo"])
    .index("by_family_pai", ["familyId", "categoriaPaiId"]),

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
    contaId: v.optional(v.id("contas")),
    dataVencimento: v.string(),
    dataPagamento: v.optional(v.string()),
    pago: v.boolean(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    cartao: v.optional(v.string()),
    recorrente: v.optional(v.boolean()),
    // Recorrencia robusta (aplica quando recorrente=true / tipo=fixa)
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())), // 1..12
    overrides: v.optional(
      v.array(
        v.object({
          mes: v.string(), // YYYY-MM
          valor: v.optional(v.number()),
          descricao: v.optional(v.string()),
          dataVencimento: v.optional(v.string()),
        })
      )
    ),
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
    contaId: v.optional(v.id("contas")),
    dataPrevisao: v.string(),
    dataRecebimento: v.optional(v.string()),
    recebido: v.boolean(),
    totalParcelas: v.optional(v.number()),
    parcelaAtual: v.optional(v.number()),
    recorrente: v.optional(v.boolean()),
    // Recorrencia robusta (aplica quando recorrente=true / tipo=fixa)
    periodicidade: v.optional(
      v.union(v.literal("mensal"), v.literal("anual"), v.literal("sazonal"))
    ),
    mesesSazonais: v.optional(v.array(v.number())), // 1..12
    overrides: v.optional(
      v.array(
        v.object({
          mes: v.string(), // YYYY-MM
          valor: v.optional(v.number()),
          descricao: v.optional(v.string()),
          dataPrevisao: v.optional(v.string()),
        })
      )
    ),
    observacao: v.optional(v.string()),
    criadoPor: v.id("users"),
    familyId: v.string(),
    criadoEm: v.string(),
  })
    .index("by_family_mes", ["familyId", "dataPrevisao"])
    .index("by_family_pessoa", ["familyId", "pessoaId"]),

  // ============ CONTAS ============
  contas: defineTable({
    nome: v.string(),
    tipo: v.union(
      v.literal("corrente"),
      v.literal("poupanca"),
      v.literal("dinheiro"),
      v.literal("aplicacao")
    ),
    banco: v.optional(v.string()),
    saldoInicial: v.number(), // centavos
    saldoManual: v.optional(v.number()), // centavos, usado quando tipo=aplicacao
    cor: v.string(),
    icone: v.string(),
    ativa: v.boolean(),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  }).index("by_family", ["familyId"]),

  transferencias: defineTable({
    contaOrigemId: v.id("contas"),
    contaDestinoId: v.id("contas"),
    valor: v.number(), // centavos
    data: v.string(), // YYYY-MM-DD
    descricao: v.optional(v.string()),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  }).index("by_family_data", ["familyId", "data"]),

  // Historico de atualizacoes de saldo manual de aplicacoes (sparkline)
  historicoSaldoManual: defineTable({
    contaId: v.id("contas"),
    valor: v.number(), // centavos
    data: v.string(), // YYYY-MM-DD
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_conta_data", ["contaId", "data"])
    .index("by_family_data", ["familyId", "data"]),

  metas: defineTable({
    titulo: v.string(),
    descricao: v.optional(v.string()),
    valorAlvo: v.number(),
    valorAtual: v.number(),
    prazo: v.optional(v.string()),
    icone: v.string(),
    cor: v.string(),
    fotoStorageId: v.optional(v.id("_storage")),
    fotoUrl: v.optional(v.string()),
    ativa: v.boolean(),
    // Marco 2.B - Reserva de Emergencia: meta com tratamento especial.
    // Quando preenchido com "reserva_emergencia", a meta e fixada no topo
    // e o valorAlvo e calculado a partir de mediaDespesas3m * mesesCobertura.
    tipoEspecial: v.optional(v.union(v.literal("reserva_emergencia"))),
    mesesCobertura: v.optional(v.number()),
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

  limitesOrcamento: defineTable({
    categoriaId: v.id("categorias"),
    mes: v.string(), // "YYYY-MM"
    valorLimite: v.number(), // centavos
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_family_mes", ["familyId", "mes"])
    .index("by_categoria_mes", ["categoriaId", "mes"]),

  // ============ DIVIDAS ============
  dividas: defineTable({
    nome: v.string(),
    credor: v.optional(v.string()),
    tipo: v.union(
      v.literal("cartao"),
      v.literal("financiamento"),
      v.literal("emprestimo"),
      v.literal("parcelamento"),
      v.literal("outro")
    ),
    valorOriginal: v.number(), // centavos
    saldoDevedor: v.number(), // centavos, decrescente
    taxaJuros: v.number(), // percentual (ex: 1.5 = 1.5% am ou aa)
    taxaPeriodicidade: v.union(v.literal("mensal"), v.literal("anual")),
    totalParcelas: v.number(),
    parcelasPagas: v.number(), // 0 ate totalParcelas
    valorParcela: v.number(), // centavos
    proximoVencimento: v.string(), // YYYY-MM-DD
    diaVencimento: v.number(), // 1..31, para projetar proximas parcelas
    ativa: v.boolean(), // false quando quitada
    cor: v.string(),
    icone: v.optional(v.string()),
    observacao: v.optional(v.string()),
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_ativa", ["familyId", "ativa"]),

  pagamentosDividas: defineTable({
    dividaId: v.id("dividas"),
    mes: v.string(), // YYYY-MM
    dataPagamento: v.string(), // YYYY-MM-DD
    valorPago: v.number(), // centavos
    saldoAposPagamento: v.number(), // centavos
    familyId: v.string(),
    criadoPor: v.id("users"),
    criadoEm: v.string(),
  })
    .index("by_divida_mes", ["dividaId", "mes"])
    .index("by_family_mes", ["familyId", "mes"]),

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

  // ============ NOTIFICAÇÕES (Marco 3.C) ============
  notificacoes: defineTable({
    userId: v.id("users"),
    familyId: v.string(),
    tipo: v.union(
      v.literal("orcamento_80"),
      v.literal("orcamento_estourado"),
      v.literal("vencimento_amanha"),
      v.literal("meta_atingida"),
      v.literal("resumo_semanal"),
      v.literal("money_date"),
      v.literal("divida_quitada"),
      v.literal("reserva_completa")
    ),
    titulo: v.string(),
    mensagem: v.string(),
    link: v.optional(v.string()),
    // Chave de idempotencia: tipo + entidade + janela (mes/dia/semana).
    // Exemplos: "orcamento_80:cat123:2026-05", "vencimento_amanha:desp456:2026-05-11",
    // "money_date:2026-05", "meta_atingida:meta789".
    chaveDedup: v.string(),
    lida: v.boolean(),
    criadaEm: v.string(),
  })
    .index("by_user_lida", ["userId", "lida"])
    .index("by_user_criada", ["userId", "criadaEm"])
    .index("by_user_dedup", ["userId", "chaveDedup"]),

  preferenciasNotificacao: defineTable({
    userId: v.id("users"),
    familyId: v.string(),
    orcamento80: v.boolean(),
    vencimentoAmanha: v.boolean(),
    metaAtingida: v.boolean(),
    resumoSemanal: v.boolean(),
    moneyDate: v.boolean(),
    canalEmail: v.boolean(),
    canalPush: v.boolean(),
    atualizadoEm: v.string(),
  }).index("by_user", ["userId"]),

  // ============ PAINEL DO CONSULTOR (Marco 3.E) ============
  // Acesso de um consultor a uma familia. Aprovado pelo cliente via codigo de convite.
  acessosConsultor: defineTable({
    consultorId: v.id("users"), // user com role=consultor
    familyId: v.string(), // familia acessada
    status: v.union(
      v.literal("pendente"), // cliente convidado, ainda nao aprovou
      v.literal("ativo"), // aprovado, acesso liberado
      v.literal("revogado") // cliente removeu
    ),
    conviteCode: v.optional(v.string()), // codigo pra cliente aceitar
    aprovadoPor: v.optional(v.id("users")), // user do cliente que aprovou
    criadoEm: v.string(),
    aprovadoEm: v.optional(v.string()),
  })
    .index("by_consultor", ["consultorId"])
    .index("by_familia", ["familyId"])
    .index("by_convite", ["conviteCode"])
    .index("by_consultor_familia", ["consultorId", "familyId"]),

  // Comentarios do consultor amarrados a uma tela/contexto especifico do app cliente.
  comentariosConsultor: defineTable({
    consultorId: v.id("users"),
    familyId: v.string(),
    contextoTela: v.string(), // ex: "/financeiro/dividas", "objetivo:metaId"
    texto: v.string(),
    resolvido: v.boolean(),
    criadoEm: v.string(),
    atualizadoEm: v.string(),
  })
    .index("by_familia_contexto", ["familyId", "contextoTela"])
    .index("by_consultor", ["consultorId"])
    .index("by_familia_resolvido", ["familyId", "resolvido"]),

  // Reunioes agendadas entre consultor e familia.
  reunioesConsultor: defineTable({
    consultorId: v.id("users"),
    familyId: v.string(),
    titulo: v.string(),
    dataHora: v.string(), // ISO datetime
    duracaoMinutos: v.number(),
    pauta: v.optional(v.string()),
    status: v.union(
      v.literal("agendada"),
      v.literal("realizada"),
      v.literal("cancelada")
    ),
    criadoEm: v.string(),
  })
    .index("by_consultor_data", ["consultorId", "dataHora"])
    .index("by_familia_data", ["familyId", "dataHora"]),
});
