// Biblioteca estatica de conteudos educacionais (artigos curtos).
// V1: tudo inline em TypeScript. Refinar com CMS depois quando fizer sentido.

export type CategoriaConteudo =
  | "Fundamentos"
  | "Dividas"
  | "Orcamento"
  | "Investimentos"
  | "Casal";

export interface ConteudoEducacional {
  /** ID estavel — usado na URL /aprender/[id]. */
  id: string;
  /** Titulo curto exibido no card e no topo da pagina. */
  titulo: string;
  categoria: CategoriaConteudo;
  /** Tempo de leitura estimado, em minutos. */
  tempoLeituraMinutos: number;
  /** Resumo de 1 a 2 frases — exibido no card. */
  resumo: string;
  /** Conteudo em markdown simples (h2, paragrafos, listas, **negrito**). */
  conteudoMarkdown: string;
  /** Nome do icone Lucide (ex: "Shield"). */
  icone: string;
  /** Cor do card / icone. */
  cor: string;
}

export const CONTEUDOS_EDUCACIONAIS: ConteudoEducacional[] = [
  {
    id: "reserva-emergencia-101",
    titulo: "Reserva de Emergencia: por que e quanto?",
    categoria: "Fundamentos",
    tempoLeituraMinutos: 4,
    resumo:
      "O primeiro passo de qualquer planejamento financeiro. Veja por que ela existe e como calcular o valor ideal para a sua familia.",
    icone: "Shield",
    cor: "#10B981",
    conteudoMarkdown: `## Por que voce precisa de uma reserva

Imagine que o carro quebrou. Ou veio uma conta inesperada do dentista. Ou pior: voce ou seu parceiro perderam o emprego. **Sem reserva, qualquer imprevisto vira divida** — e divida com juros corroi o orcamento por meses.

A reserva de emergencia e o colchao que separa um problema pontual de uma crise financeira.

## Quanto guardar

A regra geral e ter entre **3 e 6 meses do custo de vida** da familia. Para encontrar esse numero:

1. Some todas as despesas fixas mensais: moradia, alimentacao, transporte, contas basicas.
2. Multiplique por 3 (mais conservador) ou 6 (mais seguro).
3. Esse e o seu alvo.

Casais com renda estavel (CLT, dois salarios) podem ficar com 3 meses. Autonomos, MEIs ou monoprovedores devem mirar em 6 meses ou mais.

## Onde guardar

A reserva precisa de **alta liquidez** — voce precisa conseguir resgatar rapido. Boas opcoes:

- **Tesouro Selic** — rende perto da Selic, com risco baixissimo
- **CDB com liquidez diaria** de bancos solidos
- **Fundos DI** com taxa baixa

Importante: **reserva nao e investimento**. Nao queira "fazer ela render mais" colocando em renda variavel ou em algo com prazo de carencia. O objetivo e estar disponivel quando voce precisar.

## Como construir

Se ainda nao tem reserva, comece pequeno. Defina um aporte mensal automatico — mesmo que seja R$ 100 — e nao mexa. Em poucos meses voce vai ver o valor crescer e dormir melhor.

> **Dica**: trate o aporte da reserva como uma **conta a pagar** no orcamento. E uma despesa com voce mesmo.`,
  },
  {
    id: "como-sair-das-dividas",
    titulo: "Como sair das dividas (sem milagre)",
    categoria: "Dividas",
    tempoLeituraMinutos: 5,
    resumo:
      "Metodo direto, em 5 passos: organizar, negociar, escolher a estrategia, pagar e nao voltar. Sem promessas magicas.",
    icone: "TrendingDown",
    cor: "#F43F5E",
    conteudoMarkdown: `## Passo 1: respirar e listar tudo

A primeira coisa e parar de fugir do problema. Pegue uma planilha (ou o app mesmo) e liste **todas** as dividas: cartao de credito, cheque especial, financiamento, emprestimos, parcelados.

Para cada uma, anote:

- Saldo devedor (quanto falta)
- Taxa de juros mensal
- Parcela mensal

Voce vai ver o tamanho real do problema. E o tamanho real costuma ser menor do que parecia "de longe".

## Passo 2: negociar antes de pagar

Antes de comecar a quitar, **ligue para os credores**. Bancos e financeiras tem campanhas constantes de renegociacao com descontos pesados — chega a 90% em dividas antigas.

Algumas dicas:

- Negocie em datas de feirao (Serasa Limpa Nome, etc.)
- Peca desconto a vista; se nao puder, peca reducao da taxa de juros
- **Nao aceite a primeira proposta** — sempre tem espaco

## Passo 3: escolher a estrategia

Existem dois metodos classicos:

**Bola de neve (motivacional)**: pague primeiro a divida de menor saldo. Quando ela acabar, use o dinheiro liberado na proxima. O efeito psicologico de "fechar" dividas mantem o motor ligado.

**Avalanche (matematico)**: pague primeiro a de maior taxa de juros. Economiza mais dinheiro no total, mas exige paciencia ate ver progresso.

Nao existe "certo": existe o que vai te manter no plano. Para a maioria, **bola de neve funciona melhor** porque entrega vitorias rapidas.

## Passo 4: cortar o sangramento

Se voce esta endividado, e porque gasta mais do que ganha. Enquanto isso continuar, qualquer pagamento e remendo.

- Cancele assinaturas que nao usa
- Coloque o cartao de credito longe (literalmente)
- Faca um orcamento honesto e siga ele

## Passo 5: nao voltar

Quando quitar tudo, **nao comemore com novas compras**. O que tirou voce dali — disciplina e pagar a vista — e o que vai te manter livre.

Crie uma reserva de emergencia minima (1 mes de despesas) para nao precisar do cartao na primeira intercorrencia.`,
  },
  {
    id: "orcamento-50-30-20",
    titulo: "O metodo 50-30-20 explicado",
    categoria: "Orcamento",
    tempoLeituraMinutos: 3,
    resumo:
      "Uma forma simples de organizar o salario sem virar refem de planilhas: essencial, qualidade de vida e futuro.",
    icone: "PieChart",
    cor: "#6366F1",
    conteudoMarkdown: `## A ideia em 1 linha

Divida sua renda liquida em **tres baldes**: 50% essencial, 30% qualidade de vida, 20% futuro.

## 50% — Necessidades

Tudo que voce **tem que pagar** todo mes pra vida funcionar:

- Moradia (aluguel, financiamento, condominio, IPTU, agua, luz)
- Alimentacao basica
- Transporte essencial
- Plano de saude e medicamentos continuos
- Educacao das criancas

Se essa parte ja passa de 50%, voce esta com **comprometimento alto** — antes de pensar em poupar, vale revisitar moradia e transporte (geralmente sao os maiores).

## 30% — Estilo de vida

Coisas que voce **escolhe ter** e que tornam a vida mais legal:

- Restaurantes, delivery
- Streaming, jogos, lazer
- Roupas alem do basico
- Viagens
- Hobbies

Aqui voce tem flexibilidade. Em meses apertados, o 30% encolhe primeiro.

## 20% — Futuro

A parte que voce paga **para o seu eu de daqui a 5, 10, 20 anos**:

- Reserva de emergencia (prioridade 1)
- Quitar dividas com juros altos
- Investimentos
- Aposentadoria

A regra de ouro e **automatizar**: assim que o salario cai, transfira esses 20% para uma conta separada. O que sobra na conta e o que voce vai gastar.

## E se nao bater?

Os percentuais sao referencia, nao prisao. Se sua realidade hoje e 65/25/10, **comece dali e va melhorando**. O importante e ter os tres baldes — nem que seja 1% de futuro pra comecar.`,
  },
  {
    id: "investir-comecando-do-zero",
    titulo: "Investir comecando do zero",
    categoria: "Investimentos",
    tempoLeituraMinutos: 5,
    resumo:
      "Sem jargao: o que e renda fixa, o que e renda variavel, e por onde comecar quando voce nunca investiu.",
    icone: "TrendingUp",
    cor: "#8B5CF6",
    conteudoMarkdown: `## Antes de tudo: pre-requisitos

Investir so faz sentido depois de:

1. **Reserva de emergencia montada** — pelo menos 3 meses
2. **Dividas caras quitadas** — cartao de credito, cheque especial
3. **Orcamento equilibrado** — voce gasta menos do que ganha

Sem isso, qualquer investimento e ilusao.

## Os dois grandes mundos

**Renda fixa**: voce empresta dinheiro (pra um banco, pro governo, pra uma empresa) e recebe juros. Voce sabe — ou tem boa previsibilidade — do quanto vai render. Mais seguro, ganho mais modesto.

**Renda variavel**: voce vira **socio** de algo (uma empresa, um imovel, um fundo). O valor oscila no dia a dia. Pode render muito mais, mas pode dar prejuizo. Risco maior.

Para quem esta comecando, **o caminho normal e:**

1. Comecar com renda fixa segura (Tesouro Selic, CDB de banco grande)
2. Ir aprendendo como o mercado funciona
3. Quando estiver confortavel, expor uma parte pequena a renda variavel

## Os queridinhos do iniciante

- **Tesouro Selic**: titulo do governo. Rende perto da Selic, liquidez diaria. Risco soberano (so quebra se o governo brasileiro quebrar).
- **CDB com liquidez diaria**: bancos pagam ate ~110% do CDI. Cobertura do FGC ate R$ 250 mil por instituicao.
- **LCI / LCA**: similares ao CDB, mas isentos de IR. Costumam ter prazo minimo (carencia).

## O que evitar no comeco

- **Acoes individuais** sem entender o que esta comprando
- **Criptomoedas** com dinheiro que voce precisa
- **Fundos** com taxa de administracao alta (>1% ao ano)
- **Promessas de retorno garantido** acima de 15% ao ano (e golpe na quase totalidade dos casos)

## Disciplina vence tudo

Mais importante que **escolher** o investimento certo e **manter o aporte mensal**. Quem coloca R$ 200 todo mes em qualquer Tesouro Selic chega muito mais longe do que quem espera "o investimento perfeito" e nunca comeca.`,
  },
  {
    id: "divisao-proporcional",
    titulo: "Por que dividir contas com proporcionalidade",
    categoria: "Casal",
    tempoLeituraMinutos: 4,
    resumo:
      "50/50 e justo? Nao quando os salarios sao diferentes. Entenda o conceito de divisao proporcional e como aplicar no casal.",
    icone: "Scale",
    cor: "#06B6D4",
    conteudoMarkdown: `## O problema do "vamos rachar 50/50"

Casal A ganha R$ 5.000 e Casal B ganha R$ 10.000. Aluguel: R$ 2.000.

Se rachar **50/50**:
- A paga R$ 1.000 (20% da renda)
- B paga R$ 1.000 (10% da renda)

A esta gastando o **dobro do esforco** que B pra mesma despesa. Por mais que a conta seja igual, o **peso na vida** nao e.

## O que e divisao proporcional

A ideia e simples: cada um contribui na **mesma proporcao da renda**.

Renda total do casal: R$ 5.000 + R$ 10.000 = **R$ 15.000**

- A representa 33,3% (5.000 / 15.000)
- B representa 66,7% (10.000 / 15.000)

Despesa do casal: R$ 2.000

- A paga R$ 666,60 (33,3%)
- B paga R$ 1.333,40 (66,7%)

Agora **os dois gastam ~13% da renda** com aluguel. **O esforco e igual**.

## Por que isso importa no longo prazo

Sem divisao proporcional, quem ganha menos:

- Sobra menos pra investir
- Tem dificuldade pra montar reserva propria
- Acumula menos patrimonio individual ao longo da vida

Com divisao proporcional, **os dois saem da relacao financeira em pe de igualdade** — independente de qual seja o futuro.

## Como aplicar na pratica

1. Some as rendas liquidas dos dois
2. Calcule o percentual de cada um
3. Some as despesas comuns do mes (moradia, mercado, contas, lazer compartilhado)
4. Cada um paga sua proporcao

O app ja calcula isso automaticamente — basta cadastrar as rendas e marcar as despesas como comuns.

## E despesas pessoais?

Cabelo, roupa, hobby, presente pros pais — cada um paga as suas com o que sobrou da sua renda apos as despesas comuns. Assim cada um mantem **autonomia** sobre o proprio dinheiro.

## E se a renda for muito desigual?

Quanto maior a diferenca, **mais importante** e a proporcionalidade. E quando faz mais diferenca pra protecao do mais vulneravel.`,
  },
  {
    id: "money-date",
    titulo: "Money Date: o ritual financeiro do casal",
    categoria: "Casal",
    tempoLeituraMinutos: 3,
    resumo:
      "30 minutos por mes, marcados na agenda, dedicados ao dinheiro a dois. Pequeno habito que muda tudo.",
    icone: "Coffee",
    cor: "#F59E0B",
    conteudoMarkdown: `## A ideia

Um encontro **mensal**, marcado na agenda, **dos dois com o dinheiro**. Dura 30 minutos. Tem cafe, vinho, ou o que for. Mas tem foco.

A maior fonte de briga em relacionamentos longos e dinheiro. Nao porque casais brigam **por** dinheiro — e porque **nao falam** sobre ele. Money Date e o lugar pra essa conversa acontecer **de forma estruturada e sem surpresa**.

## A pauta minima

1. **Como foi o mes que passou**
   - Bateu o orcamento? Onde estourou?
   - Algo inesperado?

2. **Onde estamos hoje**
   - Saldo total
   - Reserva de emergencia
   - Dividas em aberto

3. **O que vem ai**
   - Compras grandes planejadas
   - Viagens
   - Mudancas de renda previsiveis

4. **Os objetivos**
   - Como esta o progresso?
   - Algum ajuste?

5. **Combinados**
   - 1 ou 2 acoes pro mes seguinte

## Regras importantes

- **Sem celular** (a nao ser pra consultar dados)
- **Sem TV de fundo**
- **Nao e momento de cobranca** — e momento de alinhamento
- **Quem trouxe o problema, propoe a solucao**
- **Toda semana decisao virou tarefa** com data e responsavel

## Por que funciona

- Tira o tema "dinheiro" do **modo crise** — nao precisa ser uma briga pra falar disso
- **Cria responsabilidade compartilhada**
- **Reduz ansiedade** — voce sabe que tem espaco pra resolver, nao precisa carregar sozinho
- **Aproxima** — fala-se de futuro junto, nao do extrato

## Como comecar

Se voce esta lendo isso, **voce e quem propoe**. Mande uma mensagem agora pro seu parceiro: "topa marcar 30 minutos no domingo pra gente alinhar nossas financas?". Se aceitar, marca na agenda. Se nao topar, marca pra voce mesmo e leva os assuntos pra conversa do dia a dia.

O app tem uma area dedicada — **Money Date** — com a pauta sugerida e os indicadores que voces precisam.`,
  },
  {
    id: "inflacao-na-pratica",
    titulo: "Inflacao na pratica: por que seu dinheiro encolhe",
    categoria: "Fundamentos",
    tempoLeituraMinutos: 3,
    resumo:
      "Aquela poupanca esquecida no banco esta perdendo valor todo ano. Entenda como a inflacao corrói patrimonio.",
    icone: "TrendingDown",
    cor: "#EF4444",
    conteudoMarkdown: `## O que e inflacao, sem rodeio

Inflacao e o **aumento generalizado dos precos** ao longo do tempo. R$ 100 hoje compram menos coisas do que R$ 100 compravam ha 5 anos. E vao comprar menos ainda daqui a 5 anos.

No Brasil, a inflacao oficial e medida pelo **IPCA** (Indice Nacional de Precos ao Consumidor Amplo), calculado pelo IBGE.

## Um exemplo concreto

Suponha que a inflacao seja 5% ao ano (proximo da meta historica brasileira).

Voce tem R$ 10.000 guardados em casa, no colchao.

- Hoje: poder de compra = R$ 10.000
- Daqui a 1 ano: poder de compra = R$ 9.524
- Daqui a 5 anos: poder de compra = R$ 7.835
- Daqui a 10 anos: poder de compra = R$ 6.139

Sem fazer nada, voce **perdeu R$ 3.861** em poder de compra. E ninguem roubou nada.

## E na poupanca?

A poupanca rende **menos** que o IPCA na maioria dos anos. Quem mantem dinheiro la perde poder de compra **mais devagar** que no colchao, mas ainda perde.

Em 2022, por exemplo, o IPCA foi 5,79% e a poupanca rendeu cerca de 8% — funcionou. Mas em 2023, IPCA 4,62% e poupanca 8% tambem — bateu. Em anos de juros baixos, poupanca rende perto do IPCA ou abaixo.

## A regra de ouro

Para **nao perder dinheiro**, seu rendimento precisa **superar a inflacao**. Esse e o **rendimento real**.

Se um CDB rende 12% ao ano e a inflacao foi 5%, seu **rendimento real** foi de ~7% ao ano. So aqui voce esta de fato ficando mais rico.

## O que fazer

- **Reserva de emergencia**: Tesouro Selic ou CDB com liquidez diaria de banco solido. Rende perto da Selic, que costuma bater a inflacao com folga.
- **Longo prazo**: Tesouro IPCA+ (paga IPCA + um % fixo, **garantindo rendimento real positivo**).
- **Aporte mensal**: melhor que tentar acertar o "momento certo".

A inflacao e silenciosa, mas e a inimiga numero 1 do patrimonio mal alocado. Entender ela e ja meio caminho pra venca-la.`,
  },
];

export const CATEGORIAS_CONTEUDO: CategoriaConteudo[] = [
  "Fundamentos",
  "Dividas",
  "Orcamento",
  "Investimentos",
  "Casal",
];

export function getConteudo(id: string): ConteudoEducacional | undefined {
  return CONTEUDOS_EDUCACIONAIS.find((c) => c.id === id);
}
