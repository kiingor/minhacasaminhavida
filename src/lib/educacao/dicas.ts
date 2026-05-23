// Banco estatico de dicas curtas (1-2 frases) para o componente DicaDoDia.
// A dica e selecionada de forma deterministica pelo dia do ano:
//   index = dayOfYear % DICAS.length
// Garante que todo mundo veja a mesma dica no mesmo dia, e que a dica
// rotacione previsivelmente.

export interface Dica {
  texto: string;
  /** Caminho opcional para artigo relacionado em /aprender. */
  saibaMais?: string;
}

export const DICAS: Dica[] = [
  {
    texto:
      "Antes de pensar em investir, garanta a reserva de emergencia. Ela e o seu para-choque contra imprevistos.",
    saibaMais: "/aprender/reserva-emergencia-101",
  },
  {
    texto:
      "Cartao de credito e ferramenta, nao renda extra. Se nao consegue pagar a fatura toda, esta gastando alem do que ganha.",
  },
  {
    texto:
      "Automatize seus aportes. O dinheiro que voce nao ve, voce nao gasta — e ele cresce no piloto automatico.",
  },
  {
    texto:
      "A maior briga de casal é dinheiro mal-conversado. Reserve 30 minutos por mês pra um Money Date.",
    saibaMais: "/aprender/money-date",
  },
  {
    texto:
      "Liste todas as suas assinaturas. Quase sempre tem 2 ou 3 que voce nao usa mais e estao saindo do bolso silenciosamente.",
  },
  {
    texto:
      "Comprometimento ideal com despesas fixas: ate 50% da renda. Acima disso, qualquer imprevisto vira dor de cabeca.",
  },
  {
    texto:
      "Inflacao corrói dinheiro parado. R$ 100 no colchao hoje compram menos amanha — investir nao e luxo, e protecao.",
    saibaMais: "/aprender/inflacao-na-pratica",
  },
  {
    texto:
      "Negocie todas as suas dividas. Bancos costumam dar descontos pesados em campanhas — vale a ligacao.",
    saibaMais: "/aprender/como-sair-das-dividas",
  },
  {
    texto:
      "Quem ganha mais paga mais — divisao proporcional e justica financeira no casal. 50/50 nao e justo quando os salarios diferem.",
    saibaMais: "/aprender/divisao-proporcional",
  },
  {
    texto:
      "Crie objetivos com nome e valor. Dinheiro sem proposito vira gasto; com proposito, vira conquista.",
  },
  {
    texto:
      "Antes de comprar algo nao essencial, espere 24h. Muito do impulso some — e voce economiza sem se sentir privado.",
  },
  {
    texto:
      "O metodo 50-30-20 funciona porque e simples: metade do dinheiro pro essencial, 30% pra qualidade de vida, 20% pro futuro.",
    saibaMais: "/aprender/orcamento-50-30-20",
  },
  {
    texto:
      "Dividas com juros altos (cartao, cheque especial) sao prioridade. Quitar elas e o melhor investimento garantido que existe.",
  },
  {
    texto:
      "Acompanhar gasto so e util se acompanhar o orcamento. Saber pra onde foi e meio caminho — definir pra onde vai e o caminho todo.",
  },
  {
    texto:
      "Patrimonio liquido = ativos − dividas. E o melhor termometro de saude financeira de longo prazo.",
  },
  {
    texto:
      "Pequenas economias diarias se transformam em milhares ao ano. R$ 15 por dia em cafe = R$ 5.475 em 12 meses.",
  },
  {
    texto:
      "Diversifique. Concentrar todo o dinheiro em um so investimento e como apostar em uma cor da roleta.",
  },
  {
    texto:
      "Tesouro Selic e o investimento mais seguro do Brasil. Rende perto da Selic, com liquidez diaria — perfeito pra reserva.",
  },
  {
    texto:
      "Se um investimento promete mais de 15% ao ano garantidos, e golpe na quase totalidade dos casos. Desconfie.",
  },
  {
    texto:
      "Antes de comprar a vista um item caro, calcule quantas horas de trabalho ele vale. Esse exercicio muda decisoes.",
  },
  {
    texto:
      "Lazer cabe no orcamento — e deve caber. Cortar 100% do prazer e receita certa pra voltar a estourar mes que vem.",
  },
  {
    texto:
      "Receba o dinheiro e ja transfira a parte do investimento. O que sobra na conta e o que voce tem pra gastar.",
  },
  {
    texto:
      "Curto prazo: liquidez. Longo prazo: rentabilidade. Reserva nao e investimento — sao coisas diferentes com objetivos diferentes.",
  },
  {
    texto:
      "Compras parceladas sao financiamentos disfarcados. 'Sem juros' do cartao tem juros — ja embutidos no preco.",
  },
  {
    texto:
      "Faca uma vez por ano: revise os planos (telefone, internet, streaming, seguros). Concorrencia mudou, sua mensalidade pode cair.",
  },
  {
    texto:
      "PGBL deduz IR de quem faz declaracao completa; VGBL serve quem faz simplificada. Confunde-se pouco quem entende isso.",
  },
  {
    texto:
      "Lista de desejos resolve impulsividade. O que aparece na lista e ainda quer dali a 30 dias — provavelmente vale comprar.",
  },
  {
    texto:
      "Antes de aceitar uma promocao, pergunte: 'eu compraria isso pelo preco normal?'. Se a resposta for nao, nao e promocao.",
  },
  {
    texto:
      "Acompanhe os indicadores de saude do app. Numeros frios mostram o que a sensacao subjetiva costuma esconder.",
  },
  {
    texto:
      "Ensine os filhos sobre dinheiro cedo. A maior heranca financeira nao e o dinheiro — e a relacao saudavel com ele.",
  },
  {
    texto:
      "Renda passiva nao cai do ceu. Comeca com economia constante, multiplica com investimento de longo prazo, e demora.",
  },
  {
    texto:
      "Gastar com saude (academia, alimentacao, exames) e investimento. Nao economize ai — economize em outras coisas.",
  },
];

/**
 * Calcula o dia do ano (1 a 366) a partir de uma Date.
 * Pure: nao depende de fuso horario do servidor.
 */
export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60_000;
  return Math.floor(diff / 86_400_000);
}

/**
 * Retorna a dica do dia. Determinista pelo dia do ano local do usuario.
 * Uso recomendado: chamar dentro de useEffect/useState pra evitar
 * mismatch SSR/CSR (datas no servidor podem diferir do cliente).
 */
export function dicaDoDia(date: Date = new Date()): Dica {
  const idx = dayOfYear(date) % DICAS.length;
  return DICAS[idx];
}
