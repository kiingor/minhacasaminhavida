# SKILL: Tarefas

## Catálogo vs Lançamento
- **Catálogo** (`tarefasCatalogo`): definição reutilizável (nome, tempo, XP base, dificuldade).
- **Lançamento** (`tarefasLancamentos`): instância atribuída a uma pessoa em uma data, com **snapshot** dos campos do catálogo (se o catálogo mudar depois, o histórico fica preservado).

## Fluxo diário
1. Usuário escolhe pessoa + data + tarefas do catálogo → cria N lançamentos.
2. (Opcional) Roda algoritmo de agenda para preencher `horarioAgendado`.
3. Pessoa marca check → `completada=true`, `completadaEm=now`, soma `xpGanho` ao `pessoa.xpTotal`.
4. Recalcula nível. Se subiu → cria registro em `levelUps` com `visualizado=false`.

## XP
- Base por dificuldade: fácil 15, média 40, difícil 80.
- Bônus de streak: `xpGanho = xpBase * (1 + min(streakDias * 0.1, 0.5))`.
- Persistir `xpGanho` no lançamento (snapshot — desmarcar usa esse valor para reverter).

## Desmarcar
- Subtrai `xpGanho` do total. Recalcula nível (pode descer). NÃO remove `levelUps` antigos.

## Streak
- Incrementa `streakDias` se completou ≥1 tarefa hoje E ontem também. Zera se pulou um dia.
- Atualizar em mutation `marcarCompletada`.

## Recorrência
- `diaria | semanal | mensal | pontual`. Usado por job/seed para sugerir tarefas no dia.
