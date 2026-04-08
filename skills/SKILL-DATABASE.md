# SKILL: Database (Convex)

## Princípios
- Todas as tabelas têm `familyId: v.string()` e índice `by_family`.
- Valores monetários em **centavos** (integer).
- Datas em ISO `YYYY-MM-DD` (string). Timestamps em ISO completo.
- Snapshots em `tarefasLancamentos` (nome, ícone, cor, tempo) para preservar histórico se o catálogo mudar.

## Tabelas
- **users**: auth + `familyId` + `pessoaId` (vincula login a uma pessoa).
- **pessoas**: dados pessoais + `horarioTrabalho` + stats de gamificação (`xpTotal`, `nivelAtual`, `streakDias`).
- **categorias**: financeiras (despesa/receita).
- **despesas**: tipo `fixa | parcelada | avulsa`, parcelas, cartão, recorrente.
- **receitas**: tipo idem, `pagadorNome` (externo), `pessoaId` (quem recebe).
- **metas** + **aportesMeta**.
- **tarefasCatalogo**: cadastro mestre (nome, ícone, tempo, xpBase, dificuldade, recorrência).
- **tarefasLancamentos**: instâncias diárias atribuídas a pessoa, com snapshot e `horarioAgendado`.
- **levelUps**: histórico para tocar animação na próxima visualização (`visualizado: false`).
- **conquistas**: achievements extensíveis.

## Índices essenciais
- `pessoas.by_family_xp` — para ranking.
- `despesas/receitas.by_family_mes` — para dashboards mensais.
- `tarefasLancamentos.by_family_data` e `by_pessoa_data` — para tela do dia.
- `levelUps.by_pessoa_visualizado` — para detectar level ups pendentes.

## Regras de query
- **Sempre** filtrar por `familyId` (segurança multi-tenant).
- Aproveitar reatividade Convex — não fazer polling.
