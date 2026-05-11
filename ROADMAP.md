# Roadmap V1 — Plataforma de Finanças Pessoais

> Documento mestre de execução. Baseado no escopo de 12 seções aprovado pelo consultor financeiro (maio/2026).

## Estratégia geral

V1 entregue em **3 ondas** sucessivas, cada uma um produto utilizável:

| Onda | Tema | Prazo | Resultado |
|---|---|---|---|
| 1 | Fundamentos | Mês 1-2 | App de controle financeiro funcional |
| 2 | Planejamento Simples | Mês 3-4 | App de organização financeira |
| 3 | Casais e Engajamento | Mês 5-6 | Plataforma completa V1 |

---

## Decisões de modelagem (registradas)

1. **Cartões × Contas:** mantemos `cartoes` separado de `contas` (semântica diferente — fatura, fechamento, limite). `despesas` ganha `contaId` e `cartaoId` (mutuamente exclusivos pra despesas). Migração futura possível, mas não agora.
2. **Pagadores (Onda 3):** `pagadores` continua sendo "quem te paga" (ligado a receitas). Em despesas usamos `pessoaId` existente como "quem do casal pagou". Nada precisa renomear.
3. **Subcategorias:** limitadas a 2 níveis (mãe → filha). Atende o caso de uso sem complexidade desnecessária.
4. **WhatsApp:** empurrado para V2. Onda 3 cobre push (PWA) + email.
5. **Painel Consultor:** versão mínima na Onda 3 (visualizar + comentar + agenda). PDF customizado vai pra V2.
6. **Reserva de Emergência:** padrão sugerido **6 meses** de despesas. Usuário pode ajustar entre 3-12.
7. **Ordem de execução:** sequencial Onda 1 → Onda 2 → Onda 3. Marcos dentro da onda também sequenciais (alguns paralelizáveis se houver capacidade).

---

## ONDA 1 — Fundamentos

| Marco | Conteúdo | Status |
|---|---|---|
| 1.A | Múltiplas contas + Transferências (4.1) | ✅ Concluído |
| 1.B | Saldo efetivado vs projetado + Lançamentos do dia (4.4 + 4.5) | ✅ Concluído |
| 1.C | Lançamentos unificado + Edição em massa (4.7) | ✅ Concluído |
| 1.D | Subcategorias hierárquicas + Recorrências robustas (4.6 + 4.2) | ✅ Concluído |
| 1.E | Orçamento vs Realizado com semáforo (4.8) | ✅ Concluído |
| 1.F | Comparativos 12 meses + Conta de Aplicações (4.9 + 4.10) | ✅ Concluído |

> **🎉 Onda 1 — 6/6 marcos concluídos.** App de controle financeiro doméstico funcional, comparável aos concorrentes em mecânica básica.

**Validar 4.3 (parcelados de cartão):** estado atual em `despesas` parece atender; QA valida no Marco 1.A.

---

## ONDA 2 — Planejamento Simples

| Marco | Conteúdo | Status |
|---|---|---|
| 2.A | Objetivos com card visual + foto + aporte sugerido (5.1) | ✅ Concluído |
| 2.B | Reserva de Emergência (5.2) | ✅ Concluído |
| 2.C | Módulo Dívidas + Curva de quitação (5.3) | ✅ Concluído |
| 2.D | 4 Indicadores leves de saúde (5.4 + tabela §8) | ✅ Concluído |

> **🎉 Onda 2 — 4/4 marcos concluídos.** App agora oferece organização financeira: objetivos visuais, Reserva de Emergência calculada, controle de dívidas e indicadores de saúde.

---

## ONDA 3 — Casais e Engajamento

| Marco | Conteúdo | Status |
|---|---|---|
| 3.A | Refino Modo Casal + Pagadores (6.1 + 6.2) | ✅ Concluído |
| 3.B | Money Date + PDF (6.3) | ✅ Concluído |
| 3.C | Notificações push + email (6.4, sem WhatsApp) | ✅ Concluído |
| 3.D | Educação financeira embutida (6.5) | ✅ Concluído |
| 3.E | Painel do Consultor (versão mínima) (6.6) | ✅ Concluído |

> **🎉 Onda 3 — 5/5 marcos concluídos. V1 ENTREGUE.** Plataforma completa com modo casal, money date, notificações, educação financeira embutida e painel do consultor.

---

## Tabela de indicadores leves (§8)

| Indicador | Fórmula | 🟢 Verde | 🟡 Amarelo | 🔴 Vermelho |
|---|---|---|---|---|
| % poupança do mês | (Receita − Despesa) ÷ Receita | ≥ 20% | 10-19% | < 10% |
| % comprometimento fixo | Despesa fixa ÷ Receita | ≤ 50% | 51-70% | > 70% |
| Dias de reserva | (Saldo + aplicações) ÷ despesa diária | ≥ 180 | 90-179 | < 90 |
| Meses até meta de reserva | (Meta − Acumulado) ÷ aporte mensal | ≤ 12 | 13-24 | > 24 |

Faixas customizáveis pelo consultor por cliente (V2).

---

## Fora de escopo da V1 (vai pra V2)

Patrimônio (imóveis/veículos), carteira de investimentos com rentabilidade, asset allocation, simulador de aposentadoria, Curva de Vitalidade Financeira completa, Open Finance (Pluggy/Belvo), planejamento sucessório/tributário, B3, WhatsApp Business API, CRM completo do consultor, suitability, política de retirada, simulador de quitação antecipada.

---

## Convenções

- Valores em **centavos** (number inteiro), formate com `formatBRL()`.
- Datas como string `YYYY-MM-DD`.
- Toda mutation valida `sessionToken` via `getCurrentUser()` + checa `familyId`.
- Mobile-first.
- Cada marco passa por: PO → UX → DEV → QA → Tech Lead.

---

## Débitos técnicos conhecidos

### Marco 1.A
- **Performance saldoConsolidado/saldoDetalhado:** queries fazem full-scan de despesas/receitas/transferências por família. Aceitável pra V1, mas para famílias com muitos meses de histórico vai ficar lento. **Mitigação futura:** adicionar índice `by_conta` em despesas/receitas/transferências e materializar saldo (snapshot mensal) — virar tarefa quando passar de ~5k lançamentos.
- **`contas.remove`:** `.collect()` em despesas+receitas+transferências para verificar uso. Mesma natureza do anterior.
- **`useSearchParams` sem Suspense em `/financeiro/transferencias`:** padrão pré-existente também em `/financeiro/relatorios`. Ajustar de uma vez no Marco 1.C (refator de lançamentos) ou em uma rodada de polimento.
- **`window.confirm` em `ContaForm.handleTipoChange`:** trocar para `ConfirmDialog` do projeto (consistência visual + funciona melhor em PWA). Resolver no Marco 1.C ou polimento.

### Marco 1.B
- **`calcularSaldoContaInterno` duplicado:** réplica de `calcularSaldoConta` em `dashboardFinanceiro.ts` por restrição do Convex (queries não compõem). Extrair para `convex/financeiro/_saldoHelper.ts` em rodada futura — risco de divergência se a lógica de saldo mudar.
- ~~Link "Ver todos do dia"~~ ✅ Resolvido no Marco 1.C — agora aponta para `/financeiro/lancamentos`.
- **Duplicação de loop de contas** entre `saldoEfetivado` e `saldoProjetado`: cliente dispara 2 queries que iteram contas. Considerar query única `saldosDashboard` em otimização futura.
- **`mediaDiariaProjecao` usa `new Date()` em fuso UTC do servidor** — pré-existente. Alinhar com `todayISO()` em rodada de polimento.

### Marco 1.C
- **`listByMonth` faz full-scan de despesas/receitas** filtrando mês em JS. Padrão pré-existente da codebase (despesas fixas/parceladas se aplicam a múltiplos meses). Mitigação futura: separar avulsos (índice direto por data) de fixas/parceladas, ou materializar em snapshot mensal — virar tarefa quando passar de ~5k lançamentos.

### Marco 1.D
- **`setOverride` aceita override em despesa avulsa/parcelada** sem efeito real. Adicionar guard: `if (d.tipo !== "fixa") throw new Error(...)` em rodada de polimento.
- **`monthDiff`/`fixaInMes` duplicado** em `despesas.ts`, `receitas.ts`, `dashboardFinanceiro.ts`, `lancamentos.ts`. Extrair para `convex/_shared/recorrencia.ts`.
- **`parcelaAtual` em receitas parceladas** usa `offset < totalParcelas` enquanto despesas usam `parcelaNoMes <= totalParcelas`. Alinhar.
- **DespesaForm/ReceitaForm sem unmount entre edições**: estado `hidratado` pode não resetar ao trocar `editData`. Edge case de UX.

### Marco 1.E
- **`listMes` faz full-scan de despesas/receitas** (mesmo padrão das outras queries). Aceitável p/ V1.
- **`OrcamentoBarra` com `aria-valuemax={100}`** mas `valuenow` pode passar de 100 quando estourada. Adicionar `aria-valuetext` ou `aria-valuemax` dinâmico.
- **`copiarMesAnterior`** itera categorias com `ctx.db.get` sequencial. Usar `Promise.all` em volume maior.

### Marco 1.F
- **`calcularSaldoContaInterno` duplicado** entre `dashboardFinanceiro.ts` e `contas.ts` (`calcularSaldoConta`) — código idêntico. Mesma decisão do 1.B (evitar import circular). Extrair para `_helpers.ts` em rodada futura.
- **`historicoSaldoAplicacao` filtra familyId implicitamente** via `ctx.db.get` antes da query — funciona, mas dependência de ordem é frágil. Considerar índice `by_conta_family_data`.
- **`categoriasComparativo` não trata categorias órfãs** como `categoriasEstouradas` faz. Edge case raro.
- **`composicaoPatrimonio` faz N loops de `calcularSaldoContaInterno`** — performance similar a `saldoConsolidado` (já documentado).

### Marco 3.E
- **`resumoMesCliente` em `consultor.ts` duplica lógica** de `dashboardFinanceiro.resumoMes` (filtros isDespesaInMes/isReceitaInMes, valorDespesaNoMes/valorReceitaNoMes). Decisão V1: copiar para evitar refator de auth nas queries existentes; extrair em `_shared/recorrencia.ts` quando alinharmos os outros débitos similares (1.D / 1.F).
- **Consultor recebe `familyId=CONS-XXX` próprio** mas não usa esse familyId para nada (todas as queries dele exigem `familyId` explícito do cliente). Funciona, mas semanticamente confuso. Em V2: schema separado para `consultores` ou `users.familyId` opcional.
- **`acessosConsultor.familyId` armazena `PENDING-<code>` enquanto pendente** — facilita query mas requer dois caminhos no UI. Aceitável para V1.
- **PDF customizado e CRM completo** ficaram fora (escopo declarado V1 = visualizar + comentar + agenda).
- **Limite de consultores por família**: nenhuma trava — uma família pode aprovar múltiplos consultores. Considerar limite hard de 3-5 em V2.
