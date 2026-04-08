# SKILL: Gráficos (Recharts)

## Padrões
- Container `ResponsiveContainer width="100%" height={300}`.
- Cores do design system (variáveis CSS via `getComputedStyle` ou constantes).
- Tooltip customizado com fundo `bg-card`, sombra, borda arredondada.
- Legend posicionada no topo ou direita.

## Gráficos do app

### Financeiro
- **Pizza** — despesas por categoria (`PieChart` + `Cell` colorido por categoria).
- **Barras** — receitas vs despesas 6 meses (`BarChart` com 2 `Bar`).
- **Linha** — evolução do saldo (`LineChart` com área gradiente).

### Tarefas
- **Linha múltipla** — XP ganho 7 dias, 1 linha por pessoa (cor = `pessoa.corTema`).
- **Barras horizontais** — tarefas completadas por pessoa.
- **Pizza** — tarefas por categoria.

## Formato de dados
Sempre pré-processar no Convex (query agregadora) para não sobrecarregar o cliente. Retornar arrays prontos para o Recharts: `[{ label, valor, cor }, ...]`.

## Skeleton
Usar `Skeleton` do shadcn enquanto carrega — altura igual à do gráfico.
