# SKILL: Gamificação (MMORPG)

## Fórmula de XP
```ts
xpParaNivel(n) = floor(100 * 1.15^(n-1))   // XP para passar do nível n para n+1
xpTotalParaNivel(n) = soma(xpParaNivel(i)) para i=1..n-1
calcularNivel(xpTotal) = { nivel, xpAtual, xpProximo }
```
Crescimento exponencial suave (15% por nível).

## Títulos (src/lib/levelTitles.ts)
| Nível | Título | Cor | Ícone |
|---|---|---|---|
| 1-5 | Novato | #94A3B8 | Sprout |
| 6-10 | Aprendiz | #10B981 | Leaf |
| 11-15 | Iniciante | #3B82F6 | Shield |
| 16-20 | Intermediário | #06B6D4 | Swords |
| 21-25 | Veterano | #8B5CF6 | Flame |
| 26-30 | Experiente | #A855F7 | Star |
| 31-40 | Especialista | #EC4899 | Sparkles |
| 41-50 | Mestre | #F59E0B | Crown |
| 51-65 | Grão-Mestre | #EF4444 | Gem |
| 66-80 | Campeão | #F97316 | Trophy |
| 81-99 | Lendário | #FBBF24 | Zap |
| 100+ | Mítico | #FFD700 | Infinity |

`getTituloByNivel(nivel)` retorna entry correspondente.

## Detecção de Level Up
- Após mutation `marcarCompletada`, comparar `nivelAntes` vs `nivelDepois`.
- Se mudou → criar `levelUps` com `visualizado=false`.
- Frontend faz query reativa em `levelUps.by_pessoa_visualizado` e dispara modal automaticamente.
- Marcar `visualizado=true` ao fechar o modal.

## Conquistas (achievements)
Tipos sugeridos: `streak_7`, `streak_30`, `100_tarefas`, `500_tarefas`, `nivel_10`, `nivel_25`, `nivel_50`. Verificar após cada `marcarCompletada`.
