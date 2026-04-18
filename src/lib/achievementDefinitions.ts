export interface AchievementDef {
  tipo: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: "tarefas" | "streak" | "nivel" | "especial";
  meta?: number; // target number for progress display
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Tarefas
  { tipo: "primeira_tarefa", nome: "Primeira Tarefa", descricao: "Complete sua primeira tarefa", icone: "CheckCircle", categoria: "tarefas", meta: 1 },
  { tipo: "trabalhador", nome: "Trabalhador", descricao: "Complete 10 tarefas", icone: "Hammer", categoria: "tarefas", meta: 10 },
  { tipo: "produtivo", nome: "Produtivo", descricao: "Complete 50 tarefas", icone: "Zap", categoria: "tarefas", meta: 50 },
  { tipo: "maquina", nome: "Máquina", descricao: "Complete 100 tarefas", icone: "Cpu", categoria: "tarefas", meta: 100 },
  { tipo: "lendario_tarefas", nome: "Lendário", descricao: "Complete 500 tarefas", icone: "Crown", categoria: "tarefas", meta: 500 },
  // Streaks
  { tipo: "constante", nome: "Constante", descricao: "Mantenha um streak de 3 dias", icone: "Flame", categoria: "streak", meta: 3 },
  { tipo: "dedicado", nome: "Dedicado", descricao: "Mantenha um streak de 7 dias", icone: "CalendarCheck", categoria: "streak", meta: 7 },
  { tipo: "imparavel", nome: "Imparável", descricao: "Mantenha um streak de 14 dias", icone: "Rocket", categoria: "streak", meta: 14 },
  { tipo: "guerreiro", nome: "Guerreiro", descricao: "Mantenha um streak de 30 dias", icone: "Shield", categoria: "streak", meta: 30 },
  // Níveis
  { tipo: "nivel_5", nome: "Aprendiz", descricao: "Alcance o nível 5", icone: "Star", categoria: "nivel", meta: 5 },
  { tipo: "nivel_10", nome: "Iniciante", descricao: "Alcance o nível 10", icone: "Award", categoria: "nivel", meta: 10 },
  { tipo: "nivel_25", nome: "Veterano", descricao: "Alcance o nível 25", icone: "Medal", categoria: "nivel", meta: 25 },
  { tipo: "nivel_50", nome: "Mestre", descricao: "Alcance o nível 50", icone: "Trophy", categoria: "nivel", meta: 50 },
  // Especiais
  { tipo: "perfeicao", nome: "Dia Perfeito", descricao: "Complete 100% das tarefas (mín. 5) em um dia", icone: "Sparkles", categoria: "especial" },
  { tipo: "primeira_meta", nome: "Poupador", descricao: "Alcance sua primeira meta financeira", icone: "Target", categoria: "especial", meta: 1 },
  { tipo: "tres_metas", nome: "Investidor", descricao: "Alcance 3 metas financeiras", icone: "PiggyBank", categoria: "especial", meta: 3 },
];

export const CATEGORY_LABELS: Record<string, string> = {
  tarefas: "Tarefas",
  streak: "Sequência",
  nivel: "Nível",
  especial: "Especiais",
};

export const CATEGORY_COLORS: Record<string, string> = {
  tarefas: "#6366F1",
  streak: "#F97316",
  nivel: "#10B981",
  especial: "#EC4899",
};
