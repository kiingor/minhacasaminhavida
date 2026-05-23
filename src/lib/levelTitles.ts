export interface LevelTitle {
  min: number;
  max: number;
  titulo: string;
  corClasse: string;
  icone: string;
}

// Paleta monocromática warm: ink-300 -> coral-500 -> ink-900 (progressão visual de nível)
export const LEVEL_TITLES: LevelTitle[] = [
  { min: 1,   max: 5,    titulo: "Novato",        corClasse: "#B8B8B8", icone: "Sprout" },
  { min: 6,   max: 10,   titulo: "Aprendiz",      corClasse: "#8A8A8A", icone: "Leaf" },
  { min: 11,  max: 15,   titulo: "Iniciante",     corClasse: "#FFCBB7", icone: "Shield" },
  { min: 16,  max: 20,   titulo: "Intermediário", corClasse: "#FFA88B", icone: "Swords" },
  { min: 21,  max: 25,   titulo: "Veterano",      corClasse: "#FF8965", icone: "Flame" },
  { min: 26,  max: 30,   titulo: "Experiente",    corClasse: "#FF6B47", icone: "Star" },
  { min: 31,  max: 40,   titulo: "Especialista",  corClasse: "#F0512C", icone: "Sparkles" },
  { min: 41,  max: 50,   titulo: "Mestre",        corClasse: "#C73E1F", icone: "Crown" },
  { min: 51,  max: 65,   titulo: "Grão-Mestre",   corClasse: "#9B3119", icone: "Gem" },
  { min: 66,  max: 80,   titulo: "Campeão",       corClasse: "#5C5C5C", icone: "Trophy" },
  { min: 81,  max: 99,   titulo: "Lendário",      corClasse: "#262626", icone: "Zap" },
  { min: 100, max: 9999, titulo: "Mítico",        corClasse: "#0F0F0F", icone: "Infinity" },
];

export function getTituloByNivel(nivel: number): LevelTitle {
  return LEVEL_TITLES.find((t) => nivel >= t.min && nivel <= t.max) ?? LEVEL_TITLES[0];
}
