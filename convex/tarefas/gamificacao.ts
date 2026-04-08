// Fórmulas de XP (espelho do lib/xpCalculator.ts para uso no backend)
export function xpParaNivel(nivel: number): number {
  return Math.floor(100 * Math.pow(1.15, nivel - 1));
}

export function calcularNivel(xpTotal: number): number {
  let nivel = 1;
  let xpAcumulado = 0;
  while (xpAcumulado + xpParaNivel(nivel) <= xpTotal) {
    xpAcumulado += xpParaNivel(nivel);
    nivel++;
  }
  return nivel;
}

export function xpComStreak(xpBase: number, streakDias: number): number {
  const bonus = Math.min(streakDias * 0.1, 0.5);
  return Math.floor(xpBase * (1 + bonus));
}

// Títulos MMORPG (espelho do lib/levelTitles.ts)
interface LevelTitle {
  min: number;
  max: number;
  titulo: string;
}

const TITLES: LevelTitle[] = [
  { min: 1, max: 5, titulo: "Novato" },
  { min: 6, max: 10, titulo: "Aprendiz" },
  { min: 11, max: 15, titulo: "Iniciante" },
  { min: 16, max: 20, titulo: "Intermediário" },
  { min: 21, max: 25, titulo: "Veterano" },
  { min: 26, max: 30, titulo: "Experiente" },
  { min: 31, max: 40, titulo: "Especialista" },
  { min: 41, max: 50, titulo: "Mestre" },
  { min: 51, max: 65, titulo: "Grão-Mestre" },
  { min: 66, max: 80, titulo: "Campeão" },
  { min: 81, max: 99, titulo: "Lendário" },
  { min: 100, max: 9999, titulo: "Mítico" },
];

export function getTituloByNivel(nivel: number): string {
  return TITLES.find((t) => nivel >= t.min && nivel <= t.max)?.titulo ?? "Novato";
}

// Calcula o streak novo dado a última atividade registrada e a data de hoje
export function novoStreak(ultimaAtividade: string | undefined, hoje: string, streakAtual: number): number {
  if (!ultimaAtividade) return 1;
  if (ultimaAtividade === hoje) return streakAtual; // já atualizado hoje
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const ontemISO = ontem.toISOString().slice(0, 10);
  if (ultimaAtividade === ontemISO) return streakAtual + 1;
  return 1; // quebrou o streak
}
