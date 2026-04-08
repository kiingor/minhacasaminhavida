export interface LevelTitle {
  min: number;
  max: number;
  titulo: string;
  corClasse: string;
  icone: string;
}

export const LEVEL_TITLES: LevelTitle[] = [
  { min: 1, max: 5, titulo: "Novato", corClasse: "#94A3B8", icone: "Sprout" },
  { min: 6, max: 10, titulo: "Aprendiz", corClasse: "#10B981", icone: "Leaf" },
  { min: 11, max: 15, titulo: "Iniciante", corClasse: "#3B82F6", icone: "Shield" },
  { min: 16, max: 20, titulo: "Intermediário", corClasse: "#06B6D4", icone: "Swords" },
  { min: 21, max: 25, titulo: "Veterano", corClasse: "#8B5CF6", icone: "Flame" },
  { min: 26, max: 30, titulo: "Experiente", corClasse: "#A855F7", icone: "Star" },
  { min: 31, max: 40, titulo: "Especialista", corClasse: "#EC4899", icone: "Sparkles" },
  { min: 41, max: 50, titulo: "Mestre", corClasse: "#F59E0B", icone: "Crown" },
  { min: 51, max: 65, titulo: "Grão-Mestre", corClasse: "#EF4444", icone: "Gem" },
  { min: 66, max: 80, titulo: "Campeão", corClasse: "#F97316", icone: "Trophy" },
  { min: 81, max: 99, titulo: "Lendário", corClasse: "#FBBF24", icone: "Zap" },
  { min: 100, max: 9999, titulo: "Mítico", corClasse: "#FFD700", icone: "Infinity" },
];

export function getTituloByNivel(nivel: number): LevelTitle {
  return LEVEL_TITLES.find((t) => nivel >= t.min && nivel <= t.max) ?? LEVEL_TITLES[0];
}
