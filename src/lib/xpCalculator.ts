// XP necessário para passar do nível n para n+1
export function xpParaNivel(nivel: number): number {
  return Math.floor(100 * Math.pow(1.15, nivel - 1));
}

// XP total acumulado necessário para atingir determinado nível
export function xpTotalParaNivel(nivel: number): number {
  let total = 0;
  for (let i = 1; i < nivel; i++) total += xpParaNivel(i);
  return total;
}

// Calcula nível atual baseado em XP total
export function calcularNivel(xpTotal: number): {
  nivel: number;
  xpAtual: number;
  xpProximo: number;
} {
  let nivel = 1;
  let xpAcumulado = 0;
  while (xpAcumulado + xpParaNivel(nivel) <= xpTotal) {
    xpAcumulado += xpParaNivel(nivel);
    nivel++;
  }
  return {
    nivel,
    xpAtual: xpTotal - xpAcumulado,
    xpProximo: xpParaNivel(nivel),
  };
}

// XP base por dificuldade
export const XP_POR_DIFICULDADE = { facil: 15, media: 40, dificil: 80 } as const;

// Bônus de streak (máx +50%)
export function xpComStreak(xpBase: number, streakDias: number): number {
  const bonus = Math.min(streakDias * 0.1, 0.5);
  return Math.floor(xpBase * (1 + bonus));
}
