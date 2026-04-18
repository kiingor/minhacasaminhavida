# PO - Especificacao Funcional

## Titulo

Entrega combinada Financeiro: Seletor de icones em categorias + Novos graficos de despesas domesticas + Bugfix `toggleRecebido`/`togglePago` afetando todos os meses

---

## Contexto

O modulo Financeiro e o coracao do app para o uso familiar. Tres lacunas comprometem a experiencia hoje:

1. **Categorias sem identidade visual.** O schema `categorias` ja armazena `icone: string`, o seed popula com icones lucide (Home, UtensilsCrossed, etc) e o `PagadorForm` ja tem um padrao de grid de icones. Porem o form de categorias em `src/app/financeiro/categorias/page.tsx` so deixa editar nome + cor. Pior: o icone salvo nem e renderizado hoje nas listas de despesas/receitas (mostra apenas a inicial do nome sobre a cor). Isso quebra o "visual scan" mobile-first.
2. **Dashboard generico.** `src/app/financeiro/page.tsx` tem 4 cards (Saldo / A Receber / A Pagar / Economia), 4 graficos (despesas por categoria, historico 6m, receitas por categoria, top pagadores) e lista de proximas contas. Falta o que uma familia realmente quer no dia a dia: quanto ja foi pago do mes, quanto sobra por dia, se alguma categoria estourou, fixa vs variavel, peso do cartao de credito.
3. **BUG critico de marcacao.** `toggleRecebido` (receitas) e `togglePago` (despesas) fazem `ctx.db.patch(id, { recebido/pago: !current })` no documento original. Como `listByMonth` projeta virtualmente o mesmo doc para todos os meses (fixa = todos >= origMes; parcelada = range de parcelas), marcar como pago em qualquer mes deixa o item marcado em todos os meses da projecao. O usuario perde confianca no controle do mes. Bug confirmado em ambos os arquivos:
   - `convex/financeiro/receitas.ts` linhas 80-91
   - `convex/financeiro/despesas.ts` linhas 84-95

---

## Escopo (In)

### Bloco 1 — Seletor de icones em categorias

1. Form de categorias (`src/app/financeiro/categorias/page.tsx`) passa a ter um grid de icones lucide-react, seguindo o padrao visual de `PagadorForm.tsx` (grid 5 colunas, botao quadrado com border, estado ativo = `border-primary bg-primary/5 text-primary`).
2. Lista de categorias passa a renderizar o icone escolhido (nao mais a inicial do nome). As listas de **Despesas** (`src/app/financeiro/despesas/page.tsx`) e **Receitas** (`src/app/financeiro/receitas/page.tsx`) passam a renderizar o icone da categoria no card do item, em substituicao/adicao ao badge de cor (decisao: substituir a inicial no bloco colorido por um icone; PO prefere substituir para nao inflar o card mobile).
3. Catalogo de icones unico compartilhado entre "despesa" e "receita" — simplifica manutencao; o tipo da categoria nao restringe o icone. Lista-alvo de 30 icones lucide, cobrindo vida domestica:
   - **Moradia/Utilidades:** Home, Lightbulb, Droplet, Wifi, Flame
   - **Alimentacao:** UtensilsCrossed, ShoppingCart, Coffee, Beer
   - **Transporte:** Car, Bus, Bike, Fuel, ParkingCircle
   - **Saude/Cuidados:** HeartPulse, Pill, Stethoscope, Dumbbell
   - **Educacao/Trabalho:** GraduationCap, BookOpen, Briefcase, Laptop
   - **Lazer:** Gamepad2, Film, Music, Plane
   - **Financeiro/Outros:** CreditCard, PiggyBank, Gift, TrendingUp, Package
4. Cada icone identificado por string (nome do componente lucide, ex.: `"Home"`). Utilitario central `src/lib/categoriaIcons.ts` (NOVO) exporta:
   - `CATEGORIA_ICONS: Array<{ nome: string; Icon: LucideIcon }>` — fonte de verdade.
   - `iconeDaCategoria(nome?: string): LucideIcon` — fallback `Package`.
5. Seed (`seedDefaults`) e atualizado para referenciar nomes presentes no catalogo (ja sao, mas validar; se algum nome ficar fora do catalogo, fallback renderiza `Package`).

### Bloco 2 — Novos cards/graficos do dashboard familiar

Conjunto eleito (coeso, focado em despesa domestica, sem exigir classificacao nova alem de dados ja existentes):

1. **Card "Progresso do mes"** — barra de progresso `pagas / totalDespesas` com contagem `X de Y contas pagas`. Substitui nada; vai ao lado dos SummaryCards ou como linha logo abaixo. Justificativa: responde a pergunta mais frequente ("ja paguei tudo?").
2. **Card "Media diaria e projecao"** — calcula `totalDespesas do mes / dia atual` e projeta `media * dias_do_mes`. Mostra tambem o saldo projetado (`totalReceitas - projecaoDespesas`). Justificativa: feedback preditivo para frear meio do mes.
3. **Grafico "Fixas vs Variaveis do mes"** — par de barras horizontais (ou donut pequeno). Classificacao derivada do campo `tipo` ja existente em `despesas`:
   - **Fixas:** `tipo === "fixa"`
   - **Variaveis:** `tipo === "avulsa" || tipo === "parcelada"`
   (Parceladas entram em variaveis por serem compromissos com fim — decisao documentada.)
4. **Grafico "Cartao vs a vista"** — par de barras (ou stacked bar) comparando despesas com `cartao` preenchido vs sem. Usa campo `cartao` ja existente em `despesas`.
5. **Lista "Alertas: categorias que estouraram"** — top 5 categorias com maior variacao percentual positiva vs mes anterior, apenas quando variacao >= +20% **e** valor absoluto relevante (>= R$ 50,00 em centavos: 5000). Usa logica parecida com `evolucaoCategorias` ja existente. Mostra badge vermelho com `+NN%`. Se nenhuma estourou: estado vazio "Nenhum estouro no mes — parabens!".

### Fora de escopo (justificado)

- **"% das receitas consumido em essenciais vs superfluo"**: exigiria adicionar campo `essencial: boolean` em `categorias` ou tabela de classificacao. E uma boa feature, mas escopo proprio — adicionaria modelagem, form, UX de classificacao e migration. **Fica fora desta entrega** para nao inflar.
- **Ranking de pessoa que mais gastou** ja existe via `gastosPorPessoa` mas nao e exibido no dashboard; pode ser adicionado em entrega separada se o usuario validar necessidade.
- **Editar cor em linha na lista** (sem abrir dialog) — refinamento de UX, fora daqui.
- **Escolher icone por tipo (despesa vs receita)**: decidido usar catalogo unico para reduzir complexidade.

### Bloco 3 — Bugfix `toggleRecebido` / `togglePago`

1. Corrigir o bug em ambos (`despesas.togglePago` e `receitas.toggleRecebido`) e em ambas as projecoes (fixa e parcelada).
2. Avulsa: comportamento atual ja e correto (um doc = um mes), mas tambem passa a usar o novo modelo por consistencia.
3. UI: todos os lugares que leem `d.pago` / `r.recebido` passam a ler o status do **mes projetado**, nao o do documento.

---

## User Stories

### US-1 — Seletor de icones
> Como usuaria, ao criar/editar uma categoria eu quero escolher um icone representativo (alem de cor), para identificar rapidamente no scroll do celular qual e qual.

### US-2 — Icone aparece nas listas
> Como usuario, ao abrir "Despesas" ou "Receitas" eu quero ver o icone da categoria ao lado do valor, para bater o olho e reconhecer sem precisar ler o nome.

### US-3 — Progresso do mes
> Como chefe de familia, quero ver "paguei 7 de 12 contas (58%)" direto no dashboard, para saber se o mes esta sob controle.

### US-4 — Projecao de fim de mes
> Como casal que controla o orcamento, quero ver a media diaria de gasto e a projecao de onde vou parar no fim do mes, para ajustar antes de estourar.

### US-5 — Fixas vs variaveis
> Como usuaria, quero visualizar quanto do meu mes e compromisso fixo vs o que e comportamento (variavel), para identificar onde posso cortar.

### US-6 — Peso do cartao
> Como usuario, quero ver o quanto da minha despesa esta no cartao vs a vista, para nao ser surpreendida pela fatura.

### US-7 — Alerta de estouro
> Como responsavel pelo orcamento, quero ser alertada quando uma categoria cresceu muito vs o mes anterior, para investigar.

### US-8 — Bugfix recebido/pago por mes
> Como usuario, quero que marcar uma conta fixa de abril como paga NAO marque automaticamente maio, junho etc., porque cada mes tem sua propria baixa.

### US-9 — Bugfix sem perder historico existente
> Como usuario que ja usa o app, quero que contas ja marcadas como pagas/recebidas continuem marcadas no mes em que elas foram marcadas, sem precisar refazer.

---

## Criterios de Aceitacao

### CA — Bloco 1 (Icones de categoria)

- [ ] `src/lib/categoriaIcons.ts` existe e exporta `CATEGORIA_ICONS` (30 icones) e `iconeDaCategoria(nome)`.
- [ ] Form de categoria mostra um grid 5 colunas (mobile) / 6 (>= sm) de botoes de icone, com estado selecionado destacado (padrao `PagadorForm`).
- [ ] Ao criar/editar, o icone selecionado e persistido via mutation `financeiro.categorias.update`/`create` (ja aceitam `icone: string`).
- [ ] Ao abrir um item existente, o icone atual vem pre-selecionado.
- [ ] Na lista de categorias (`/financeiro/categorias`), o bloco colorido a esquerda mostra o **icone** da categoria (nao a inicial).
- [ ] Na lista de despesas (`/financeiro/despesas`), cada item mostra o icone da categoria em um container colorido (`background: cor20`, `color: cor`).
- [ ] Na lista de receitas (`/financeiro/receitas`), idem.
- [ ] Se `cat.icone` nao existir no catalogo, renderiza `Package` sem quebrar.
- [ ] Seed de categorias continua funcionando e todos os seeds usam nomes presentes no catalogo.

### CA — Bloco 2 (Dashboard)

- [ ] Dashboard exibe card "Progresso do mes": barra 0-100%, texto `X de Y pagas` e valor pago / total.
- [ ] Dashboard exibe card "Media diaria" com: `media = totalDespesas / diaAtualDoMes`, `projecao = media * diasNoMes`, `saldoProjetado = totalReceitas - projecao`. Quando visualizar meses passados (mes < mes atual), usa `diasNoMes` como denominador e exibe apenas `media` (sem projecao, pois o mes ja fechou).
- [ ] Dashboard exibe grafico "Fixas vs Variaveis" com dois valores e percentuais.
- [ ] Dashboard exibe grafico "Cartao vs a vista" com dois valores e percentuais.
- [ ] Dashboard exibe bloco "Categorias que estouraram" com ate 5 itens (top por variacao %), considerando apenas variacao >= +20% e valor absoluto do mes atual >= R$ 50,00. Estado vazio amigavel quando nao ha estouros.
- [ ] Todas as novas queries em `convex/financeiro/dashboardFinanceiro.ts` respeitam `familyId` via `getCurrentUser`.
- [ ] Todas as novas queries convivem com a correcao do bugfix (Bloco 3), i.e., leem status por mes e nao o flag global.
- [ ] Skeletons mostrados enquanto queries carregam.
- [ ] Layout responsivo (mobile-first).

### CA — Bloco 3 (Bugfix)

- [ ] Marcar uma despesa fixa de Abril/2026 como paga **nao** reflete em Maio/2026 ou qualquer outro mes.
- [ ] Marcar como paga e depois desmarcar volta ao estado "pendente" apenas naquele mes.
- [ ] Mesmo comportamento para receitas (`toggleRecebido`).
- [ ] Mesmo comportamento para parceladas (parcela 3 de 10 marcada nao afeta parcela 4).
- [ ] Avulsas continuam funcionando (um doc = um mes = uma baixa).
- [ ] `listByMonth` (despesas e receitas) passa a retornar o flag `pago`/`recebido` **correspondente ao mes projetado**, nao ao doc original.
- [ ] `resumoMes`, `historico6Meses`, `evolucaoReceitasDespesas` e demais queries de dashboard refletem o status correto por mes.
- [ ] Dados existentes de `pago: true` / `recebido: true` no doc original sao preservados apos migration: o mes correspondente ao `dataPagamento` / `dataRecebimento` (ou, na falta, o `dataVencimento.slice(0,7)` / `dataPrevisao.slice(0,7)`) fica marcado, demais meses ficam pendentes.
- [ ] Apos migration, campos `pago`/`recebido`/`dataPagamento`/`dataRecebimento` no doc original **nao** sao mais fonte de verdade para decidir baixa do mes (podem ser removidos em entrega posterior; manter no schema por compatibilidade com `optional` — ver Impacto no Schema).

---

## Regras de Negocio

### RN-1 — Catalogo unico de icones (nao por tipo)
Despesa e receita compartilham o mesmo catalogo, simplificando form e evitando duplicacao de codigo. A ausencia de restricao nao e um problema porque o icone e puramente visual.

### RN-2 — Fixas vs Variaveis
`fixa` = despesa recorrente permanente (aluguel, internet). `avulsa` + `parcelada` = variaveis. Justificativa de parcelada ir em "variavel": parcelada tem fim, nao e compromisso de longo prazo como uma conta fixa, e geralmente vem de consumo pontual (compra parcelada).

### RN-3 — Criterio de "estouro"
Categoria esta em "estouro" quando:
- `variacao_percentual >= 20%` (vs mes anterior)
- **E** `valorMesAtual >= R$ 50,00`
- **E** `valorMesAnterior > 0` (senao variacao e infinita — exibir "nova categoria" em bloco separado se desejado, mas MVP: ignorar).

### RN-4 — Projecao do mes
- Se `mes == mes atual`: `media = total / dia_de_hoje`, `projecao = media * diasNoMes`.
- Se `mes != mes atual` (passado ou futuro): exibir apenas media (`total / diasNoMes`), sem projecao.

### RN-5 — DECISAO DE MODELAGEM DO BUGFIX

**Alternativa A (descartada):** Mudar `recebido: boolean` para `recebidoPor: Array<{ mes: string; dataRecebimento: string }>`.
- **Pros:** dados ficam no doc original, sem nova tabela.
- **Contras:** muda schema em 2 tabelas, quebra todos os filtros (`.filter(r => r.recebido)`) em varios arquivos (`dashboardFinanceiro.ts`, `receitas/page.tsx`, `despesas/page.tsx`, `relatorios/page.tsx`), obriga mudar todas as queries que hoje fazem aritmetica sobre o flag. Array nao tem indice direto no Convex, entao filtrar "quais receitas estao recebidas no mes X" vira scan em memoria igual hoje, mas sobre arrays aninhados (pior).

**Alternativa B (ESCOLHIDA):** Criar duas novas tabelas de "baixas por mes":
- `pagamentosDespesas`: `{ despesaId: Id<"despesas">, mes: string /* YYYY-MM */, dataPagamento: string, valorPago?: number, familyId: string, criadoPor: Id<"users">, criadoEm: string }` com indice `by_familia_mes` em `["familyId", "mes"]` e indice `by_despesa_mes` em `["despesaId", "mes"]` (unique logicamente — 1 baixa por (despesa, mes)).
- `recebimentosReceitas`: analogo, `{ receitaId: Id<"receitas">, mes: string, dataRecebimento: string, valorRecebido?: number, familyId, criadoPor, criadoEm }` com `by_familia_mes` e `by_receita_mes`.

**Justificativa da escolha B:**
- Isola a mudanca: nao alteramos `despesas` nem `receitas` (exceto marcar `pago` / `recebido` / `dataPagamento` / `dataRecebimento` como legados — serao ignorados apos migration).
- Queries por mes ganham indice direto (`by_familia_mes` com `mes == "YYYY-MM"` filtra rapido).
- Modelo coerente com a semantica real: cada mes de uma fixa/parcelada e uma transacao distinta.
- Permite futuro valor parcial, varias baixas, historico de alteracao — nao precisamos agora, mas nao engessa.
- `listByMonth`, `resumoMes`, graficos etc. fazem apenas 1 join adicional (colect pagamentos do mes, indexar por `despesaId`), e ja fazem scan full da tabela mesmo (o schema de `despesas` nao tem indice por mes projetado — o indice `by_family_mes` usa `dataVencimento` literal, nao cobre projecoes).

### RN-6 — Semantica das mutations apos bugfix

`togglePago(despesaId, mes)`:
- Se existe registro em `pagamentosDespesas` com `(despesaId, mes)`: remove (vira pendente).
- Se nao existe: insere `{ despesaId, mes, dataPagamento: hoje, familyId, criadoPor, criadoEm }`.
- Valida familyId da despesa.
- **Nova assinatura** exige `mes: string`. A UI (`despesas/page.tsx`, `receitas/page.tsx`) passa `d._projectedMes` que ja e gerado por `listByMonth`.

`toggleRecebido(receitaId, mes)`: analogo.

Avulsa: `mes` deve ser derivado de `dataVencimento.slice(0,7)` / `dataPrevisao.slice(0,7)`. UI passa `d._projectedMes` do mesmo jeito (funciona para todos os tipos).

### RN-7 — Leitura do status por mes

`listByMonth` (despesas e receitas) passa a:
1. Coletar todos os docs (como hoje).
2. Projetar virtualmente (como hoje).
3. Coletar de `pagamentosDespesas` / `recebimentosReceitas` todas as baixas do `familyId` no `mes` (indice `by_familia_mes`).
4. Para cada item projetado, procurar se existe baixa `(docId, mes)` — se sim, `pago/recebido = true` + `dataPagamento/dataRecebimento` da baixa; se nao, `false`.

Tambem nas queries do dashboard (`resumoMes`, `receitasPorPagador`, `relatorioReceitas`): substituir `r.recebido` / `d.pago` por lookup na nova tabela filtrada por `mes`.

### RN-8 — Migration

Executada via mutation one-shot `convex/financeiro/migrations.ts::migrarBaixasParaNovaTabela` (admin/manual). Para cada familia:

**Para despesas:**
- Coleta todas as `despesas` da `familyId`.
- Para cada `d` com `d.pago === true`:
  - Determina o `mes`:
    - Se `d.dataPagamento` existe: `mes = d.dataPagamento.slice(0,7)`.
    - Senao: `mes = d.dataVencimento.slice(0,7)` (fallback: assume que foi paga no mes do vencimento original).
  - Insere em `pagamentosDespesas`: `{ despesaId: d._id, mes, dataPagamento: d.dataPagamento ?? d.dataVencimento, familyId, criadoPor: d.criadoPor, criadoEm: d.criadoEm }` — se e so se nao existir ja um registro com `(despesaId, mes)` (idempotente).
- **Nao apaga** `pago`/`dataPagamento` do doc original nessa entrega (retrocompatibilidade; ficam como "zombies" ignorados pelo app).

**Para receitas:** analogo com `recebido` / `dataRecebimento` / `dataPrevisao`.

**Idempotencia:** a mutation pode rodar varias vezes sem duplicar; verifica existencia antes de inserir.

**Comunicacao:** documentar no README/CLAUDE.md que apos deploy deste bugfix a migration deve ser rodada 1x (`npx convex run financeiro.migrations.migrarBaixasParaNovaTabela`). Alternativamente, disparar auto-migration em primeiro login do admin (fora de escopo — entrega futura).

### RN-9 — Consequencia UX do bugfix

O usuario pode agora marcar/desmarcar cada mes independentemente. Nao ha mudanca visual no botao (checkbox quadrado no inicio da linha continua igual), mas o efeito agora e isolado ao mes corrente.

---

## Impactos

### Schema (`convex/schema.ts`)

**Adicionar duas tabelas:**

```ts
pagamentosDespesas: defineTable({
  despesaId: v.id("despesas"),
  mes: v.string(), // "YYYY-MM"
  dataPagamento: v.string(), // "YYYY-MM-DD"
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
```

**Campos legados preservados** (sem remover): `despesas.pago`, `despesas.dataPagamento`, `receitas.recebido`, `receitas.dataRecebimento`. Ficam escritos pela migration apenas, ignorados pelas queries dali em diante.

Nenhum campo adicionado a `categorias` (o `icone: string` ja existe).

### Queries/Mutations afetadas

**Modificadas (bugfix):**
- `convex/financeiro/despesas.ts`:
  - `listByMonth` — join com `pagamentosDespesas` do mes.
  - `togglePago` — muda assinatura para `(id, mes)`; insere/remove de `pagamentosDespesas`.
- `convex/financeiro/receitas.ts`:
  - `listByMonth` — join com `recebimentosReceitas` do mes.
  - `toggleRecebido` — muda assinatura para `(id, mes)`; insere/remove de `recebimentosReceitas`.
- `convex/financeiro/dashboardFinanceiro.ts`:
  - `resumoMes`, `receitasPorPagador`, `relatorioReceitas`, `proximasContas`, `gastosPorPessoa` — substituir `r.recebido` / `d.pago` por lookup por (id, mes).
  - `historico6Meses`, `evolucaoReceitasDespesas` — idem para cada mes do range.

**Novas (bloco 2 dashboard):**
- `dashboardFinanceiro.progressoMes` — retorna `{ totalContas, contasPagas, valorTotal, valorPago, percentual }`.
- `dashboardFinanceiro.mediaDiariaProjecao` — retorna `{ mediaDiaria, projecaoMes, saldoProjetado, isMesAtual }`.
- `dashboardFinanceiro.fixasVsVariaveis` — retorna `{ fixas: number, variaveis: number }`.
- `dashboardFinanceiro.cartaoVsAVista` — retorna `{ cartao: number, aVista: number }`.
- `dashboardFinanceiro.categoriasEstouradas` — retorna ate 5 `{ categoriaId, nome, cor, icone, valorAtual, valorAnterior, variacao }`.

**Novas (bugfix):**
- `convex/financeiro/migrations.ts::migrarBaixasParaNovaTabela` — mutation one-shot idempotente.

**Inalteradas:**
- `categorias.list`, `categorias.create`, `categorias.update`, `categorias.remove`, `categorias.seedDefaults` — ja aceitam `icone`.

### Telas / Componentes afetados

**Modificadas:**
- `src/app/financeiro/categorias/page.tsx` — adicionar grid de icones no form e render do icone na lista.
- `src/app/financeiro/despesas/page.tsx` — renderizar icone da categoria no card; passar `d._projectedMes` para `togglePago`.
- `src/app/financeiro/receitas/page.tsx` — renderizar icone da categoria no card; passar `r._projectedMes` para `toggleRecebido`.
- `src/app/financeiro/page.tsx` — novos cards/graficos (progresso, media diaria, fixas vs variaveis, cartao vs a vista, categorias estouradas).
- `src/app/financeiro/relatorios/page.tsx` — se usar `d.pago` / `r.recebido`, passar a consultar por mes.

**Novas:**
- `src/lib/categoriaIcons.ts` — catalogo e helper `iconeDaCategoria`.
- `src/components/financeiro/ProgressoMesCard.tsx`.
- `src/components/financeiro/MediaDiariaCard.tsx`.
- `src/components/financeiro/FixasVsVariaveisChart.tsx`.
- `src/components/financeiro/CartaoVsAVistaChart.tsx`.
- `src/components/financeiro/CategoriasEstouradas.tsx`.

### Prioridade

- **Bloco 3 (Bugfix):** **Alta** — bug de confiabilidade, afeta controle financeiro que e o caso de uso principal.
- **Bloco 1 (Icones):** Media — melhoria de UX visivel no dia a dia.
- **Bloco 2 (Dashboard):** Media — entrega valor mas nao desbloqueia nada critico.

Sugestao: entregar os 3 juntos (feature package do financeiro) com o bugfix liderando o release note.

---

## Riscos

1. **Assinatura de mutation mudando (`togglePago`/`toggleRecebido`)** quebra qualquer chamador fora das pages de listagem. Grep confirmou: so existem 2 chamadores (`despesas/page.tsx`, `receitas/page.tsx`). Baixo risco, mas o DEV deve conferir antes de mergear.
2. **Migration perde dados se `dataPagamento` estiver ausente em docs antigos** — fallback para `dataVencimento.slice(0,7)` e uma aproximacao; o mes pode estar errado se a conta foi paga com atraso. **Mitigacao:** documentar no release note que o usuario pode precisar re-marcar itens antigos especificos; a grande maioria dos casos (pago no mes) fica correto.
3. **Perda de performance se `pagamentosDespesas` crescer muito.** Uma familia pagando 30 contas/mes gera ~360 docs/ano, 10 anos = 3600. E pequeno; indice `by_familia_mes` resolve. Sem risco real em horizonte razoavel.
4. **Catalogo de 30 icones** pode ficar apertado em mobile. Mitigar com grid `grid-cols-5` + scroll interno do Dialog (ja usado em `PagadorForm`).
5. **Icone da categoria vazia / corrompida** (`cat.icone` = "IconeInexistente"). Mitigar com fallback `Package` em `iconeDaCategoria`.
6. **Classificacao fixa vs variavel pode confundir** — usuario pode esperar que "parcelada" conte como fixa (compromisso). Documentar no tooltip do grafico ("Variaveis = avulsas e parceladas. Fixas = assinaturas/contas recorrentes.").
7. **Alertas de estouro em categorias novas** (mes anterior = 0) sao suprimidos na RN-3. Risco baixo, mas usuario pode sentir falta. Aceitavel no MVP.
8. **Carga da query `listByMonth`**: passara a fazer mais um `collect()` de `pagamentosDespesas` do mes. Indice resolve; custo adicional desprezivel.

---

## Resumo da decisao arquitetural (Bugfix)

> Criar tabelas `pagamentosDespesas` e `recebimentosReceitas` com `(despesaId|receitaId, mes)` como chave logica. Mutations `togglePago`/`toggleRecebido` passam a aceitar `mes` e operar sobre essas tabelas. Campos legados `pago`/`recebido`/`dataPagamento`/`dataRecebimento` ficam no schema, sao escritos pela migration para nao perder historico, mas deixam de ser fonte de verdade. Migration idempotente one-shot converte os dados existentes.

Esta e a abordagem **menos invasiva**: zero mudancas de tipo em schema existente, mudanca localizada em 2 mutations + leituras das queries de dashboard, e UI so precisa passar `_projectedMes` que ja existe no retorno do `listByMonth`.
