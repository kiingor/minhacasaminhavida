// ============ CICLO DE FATURA DE CARTÃO — helpers PUROS ============
// Sem acesso a banco/ctx: funções determinísticas reaproveitáveis tanto no
// backend Convex quanto no client (a página de cartões importa daqui).
// Base da regra de COMPETÊNCIA do PDF: a fatura é definida pelo ciclo de
// fechamento, não pela data da compra. (Fase 1 do plano de fatura de cartão.)

// Último dia do mês (mes em 1..12), respeitando anos bissextos.
export function ultimoDiaDoMes(ano: number, mes1a12: number): number {
  return new Date(ano, mes1a12, 0).getDate();
}

// Ajusta um "dia desejado" (ex.: 31) ao último dia real do mês (ex.: fev => 28/29).
export function clampDia(ano: number, mes1a12: number, dia: number): number {
  return Math.min(Math.max(1, dia), ultimoDiaDoMes(ano, mes1a12));
}

// Normaliza nome de cartão p/ casamento robusto: trim + lowercase + sem acento.
// Usado no ponto único de escrita (resolver nome->cartaoId) e no backfill futuro.
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");
export function normalizarNomeCartao(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

// Soma `delta` meses a uma competência YYYY-MM, retornando YYYY-MM.
export function shiftCompetencia(competencia: string, delta: number): string {
  const [y, m] = competencia.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Competência (YYYY-MM) de uma compra, dado o dia de fechamento do cartão.
// Regra do PDF: compra ATÉ o dia de fechamento (inclusive) entra na fatura que
// fecha no mês corrente; compra APÓS o fechamento entra na fatura do mês seguinte.
// Ex.: compra 28/jun com fechamento dia 25 => competência julho.
// Sem diaFechamento (cartão sem ciclo) => competência = mês da própria data (legado).
export function competenciaDaCompra(
  dataCompra: string, // YYYY-MM-DD
  diaFechamento?: number
): string {
  const [ano, mes, dia] = dataCompra.split("-").map(Number);
  if (!diaFechamento) return dataCompra.slice(0, 7);
  const fechClamp = clampDia(ano, mes, diaFechamento);
  if (dia <= fechClamp) {
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }
  // após o fechamento => mês seguinte (new Date(ano, mes, 1) já é o próximo mês)
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Data de fechamento (YYYY-MM-DD) da fatura de uma competência.
// A fatura da competência YYYY-MM fecha no diaFechamento desse próprio mês.
export function dataFechamentoDaCompetencia(
  competencia: string, // YYYY-MM
  diaFechamento: number
): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const dia = clampDia(ano, mes, diaFechamento);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Data de vencimento (YYYY-MM-DD) da fatura de uma competência.
// Se diaVencimento <= diaFechamento, o vencimento cai no mês SEGUINTE ao fechamento
// (ex.: fecha dia 25, vence dia 5 do mês seguinte). Caso contrário, no mesmo mês.
export function dataVencimentoDaCompetencia(
  competencia: string, // YYYY-MM
  diaFechamento: number,
  diaVencimento: number
): string {
  const [ano, mes] = competencia.split("-").map(Number);
  let vAno = ano;
  let vMes = mes;
  if (diaVencimento <= diaFechamento) {
    const d = new Date(ano, mes, 1); // mês seguinte
    vAno = d.getFullYear();
    vMes = d.getMonth() + 1;
  }
  const dia = clampDia(vAno, vMes, diaVencimento);
  return `${vAno}-${String(vMes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Período de graça em dias (vencimento − fechamento) para uma competência de
// referência. Varia conforme o tamanho do mês, por isso recebe a competência.
export function periodoGracaDias(
  diaFechamento: number,
  diaVencimento: number,
  competenciaRef: string
): number {
  const fech = dataFechamentoDaCompetencia(competenciaRef, diaFechamento);
  const venc = dataVencimentoDaCompetencia(competenciaRef, diaFechamento, diaVencimento);
  const [fy, fm, fd] = fech.split("-").map(Number);
  const [vy, vm, vd] = venc.split("-").map(Number);
  return Math.round(
    (Date.UTC(vy, vm - 1, vd) - Date.UTC(fy, fm - 1, fd)) / 86400000
  );
}
