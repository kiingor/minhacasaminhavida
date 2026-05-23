// Biblioteca estatica de termos financeiros.
// Usada pelo componente <TermoTooltip /> para mostrar definicoes curtas
// no hover (desktop) ou tap (mobile). Sem CMS / sem banco — V1 estatico.

export interface TermoFinanceiro {
  /** Nome curto exibido no balao (ex: "PGBL"). */
  nome: string;
  /** Definicao curta — 1 a 3 frases. */
  definicao: string;
  /** Caminho relativo opcional para artigo do "Aprender". */
  saibaMais?: string;
  /** Aliases / sinonimos — usados na auto-deteccao em texto. */
  aliases?: string[];
}

export const TERMOS_FINANCEIROS: Record<string, TermoFinanceiro> = {
  pgbl: {
    nome: "PGBL",
    definicao:
      "Plano Gerador de Beneficio Livre. Tipo de previdencia privada com beneficio fiscal: contribuicoes podem ser deduzidas do Imposto de Renda (ate 12% da renda bruta), mas o IR incide sobre o valor total no resgate.",
    saibaMais: "/aprender/investir-comecando-do-zero",
    aliases: ["pgbl"],
  },
  vgbl: {
    nome: "VGBL",
    definicao:
      "Vida Gerador de Beneficio Livre. Tambem e previdencia privada, mas sem deducao no IR. Em compensacao, no resgate o IR incide so sobre o rendimento (nao sobre o total). Indicado para quem faz declaracao simplificada.",
    saibaMais: "/aprender/investir-comecando-do-zero",
    aliases: ["vgbl"],
  },
  selic: {
    nome: "Selic",
    definicao:
      "Taxa basica de juros da economia brasileira, definida pelo Banco Central. Serve de referencia para investimentos de renda fixa, financiamentos e emprestimos. Quando a Selic sobe, investimentos em renda fixa rendem mais; quando cai, financiar fica mais barato.",
    aliases: ["selic", "taxa selic"],
  },
  ipca: {
    nome: "IPCA",
    definicao:
      "Indice Nacional de Precos ao Consumidor Amplo. E o indicador oficial da inflacao brasileira, calculado pelo IBGE. Mede a variacao de precos de uma cesta de produtos e servicos consumidos por familias.",
    aliases: ["ipca"],
  },
  cdb: {
    nome: "CDB",
    definicao:
      "Certificado de Deposito Bancario. E um titulo de renda fixa emitido por bancos: voce empresta dinheiro ao banco e recebe juros. Coberto pelo FGC ate R$ 250 mil por instituicao.",
    saibaMais: "/aprender/investir-comecando-do-zero",
    aliases: ["cdb"],
  },
  lci: {
    nome: "LCI",
    definicao:
      "Letra de Credito Imobiliario. Titulo de renda fixa emitido por bancos com lastro em creditos imobiliarios. Tem isencao de Imposto de Renda para pessoa fisica e cobertura do FGC.",
    aliases: ["lci"],
  },
  lca: {
    nome: "LCA",
    definicao:
      "Letra de Credito do Agronegocio. Similar a LCI, mas com lastro em creditos do agronegocio. Tambem e isenta de IR para pessoa fisica e tem cobertura do FGC.",
    aliases: ["lca"],
  },
  "tesouro-direto": {
    nome: "Tesouro Direto",
    definicao:
      "Programa do Tesouro Nacional para venda de titulos publicos a pessoas fisicas pela internet. Considerado o investimento mais seguro do pais, ja que e garantido pelo governo federal.",
    saibaMais: "/aprender/investir-comecando-do-zero",
    aliases: ["tesouro direto", "tesouro"],
  },
  "patrimonio-liquido": {
    nome: "Patrimonio Liquido",
    definicao:
      "E o que sobra quando voce subtrai tudo o que deve (passivos) de tudo o que possui (ativos). Em outras palavras: ativos − dividas = patrimonio liquido. E o melhor termometro de saude financeira de longo prazo.",
    aliases: ["patrimonio liquido", "patrimonio"],
  },
  "reserva-de-emergencia": {
    nome: "Reserva de Emergencia",
    definicao:
      "Dinheiro guardado em aplicacao de alta liquidez (resgate rapido) para cobrir imprevistos: desemprego, doenca, conserto urgente. O ideal e ter de 3 a 6 meses do custo de vida da familia.",
    saibaMais: "/aprender/reserva-emergencia-101",
    aliases: ["reserva de emergencia", "reserva", "fundo de emergencia"],
  },
  inflacao: {
    nome: "Inflacao",
    definicao:
      "Aumento generalizado e continuo dos precos. Quando ha inflacao, o mesmo dinheiro compra menos coisas com o passar do tempo. No Brasil, e medida principalmente pelo IPCA.",
    aliases: ["inflacao"],
  },
  "renda-fixa": {
    nome: "Renda Fixa",
    definicao:
      "Investimentos em que voce sabe (ou tem boa previsibilidade) o quanto vai render. Inclui CDBs, Tesouro Direto, LCIs, LCAs, debentures. Geralmente mais seguro e com retorno mais modesto que a renda variavel.",
    saibaMais: "/aprender/investir-comecando-do-zero",
    aliases: ["renda fixa"],
  },
  "renda-variavel": {
    nome: "Renda Variavel",
    definicao:
      "Investimentos cujo retorno nao e previsivel: o valor oscila no mercado. Inclui acoes, fundos imobiliarios (FIIs), ETFs e criptomoedas. Tem potencial de retorno maior, com mais risco.",
    aliases: ["renda variavel"],
  },
  diversificacao: {
    nome: "Diversificacao",
    definicao:
      "Estrategia de distribuir o dinheiro em varios tipos de investimento e ativos, em vez de concentrar tudo em um so. Reduz o risco: se um vai mal, o outro pode compensar.",
    aliases: ["diversificacao", "diversificar"],
  },
  liquidez: {
    nome: "Liquidez",
    definicao:
      "Velocidade com que voce consegue transformar um investimento em dinheiro disponivel. Conta corrente tem alta liquidez (saca na hora); imovel tem baixa (pode levar meses). Reserva de emergencia precisa de alta liquidez.",
    aliases: ["liquidez"],
  },
  comprometimento: {
    nome: "Comprometimento",
    definicao:
      "Percentual da sua receita ja comprometido com despesas fixas (aluguel, financiamento, plano de saude, escola). Quanto menor, mais flexibilidade voce tem para imprevistos e investimentos. O ideal e ficar abaixo de 50%.",
    aliases: ["comprometimento", "comprometido"],
  },
  "taxa-de-juros": {
    nome: "Taxa de Juros",
    definicao:
      "Percentual cobrado por quem empresta dinheiro a voce — ou pago a voce quando voce investe. No emprestimo, e quanto a divida cresce ao longo do tempo. Em investimento, e quanto seu dinheiro rende.",
    aliases: ["taxa de juros", "juros"],
  },
  "saldo-devedor": {
    nome: "Saldo Devedor",
    definicao:
      "Quanto ainda falta pagar de uma divida ou financiamento naquele momento — depois de descontadas as parcelas ja pagas e somados os juros do periodo. Diferente do total das parcelas restantes, que inclui juros futuros.",
    aliases: ["saldo devedor"],
  },
};

/**
 * Retorna o termo a partir de uma chave (case-insensitive).
 * Aceita tanto a chave do objeto ("pgbl") quanto aliases ("PGBL", "taxa selic").
 */
export function getTermo(key: string): TermoFinanceiro | undefined {
  const k = key.trim().toLowerCase();
  // Primeiro tenta chave direta.
  if (TERMOS_FINANCEIROS[k]) return TERMOS_FINANCEIROS[k];
  // Depois procura por alias.
  for (const termo of Object.values(TERMOS_FINANCEIROS)) {
    if (termo.aliases?.some((a) => a.toLowerCase() === k)) return termo;
  }
  return undefined;
}

/**
 * Lista ordenada (alfabetica) de termos para listagem na pagina /aprender.
 */
export function listarTermos(): Array<{ slug: string; termo: TermoFinanceiro }> {
  return Object.entries(TERMOS_FINANCEIROS)
    .map(([slug, termo]) => ({ slug, termo }))
    .sort((a, b) => a.termo.nome.localeCompare(b.termo.nome));
}
