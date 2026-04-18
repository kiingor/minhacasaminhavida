---
name: refactor
description: Fluxo para refatorar codigo. Passa por DEV (implementacao), QA (validacao de nao-regressao) e Tech Lead (aprovacao). Use quando o usuario pedir refatoracao ou melhoria tecnica.
argument-hint: "[descricao da refatoracao]"
---

# Fluxo de Refatoracao

O usuario pediu: **$ARGUMENTS**

Execute o fluxo abaixo na ordem.

---

## ETAPA 1: DEV - Plano e Implementacao

Agora VOCE assume o papel de DEV (use as instrucoes de `.claude/agents/dev.md`).

Primeiro, leia o codigo atual e apresente um plano curto do que vai mudar e por que.
Depois, implemente a refatoracao.

Apresente a lista de arquivos modificados e continue.

---

## ETAPA 2: QA - Validacao de Nao-Regressao

Dispare um Agent com o papel de QA (use as instrucoes de `.claude/agents/qa.md`):

Prompt para o QA:
> Valide a refatoracao: **$ARGUMENTS**
> Foco em nao-regressao: verifique que o comportamento existente nao mudou.
> Rode `npx tsc --noEmit` para verificar erros de TypeScript.

Se encontrar regressoes, corrija antes de prosseguir.

---

## ETAPA 3: TECH LEAD - Aprovacao

Dispare um Agent com o papel de Tech Lead (use as instrucoes de `.claude/agents/techlead.md`):

Prompt para o Tech Lead:
> Revise a refatoracao: **$ARGUMENTS**
> Avalie se melhorou a qualidade sem introduzir riscos.

### Se APROVADO:
Informe o usuario e pergunte se deseja fazer commit.

### Se REPROVADO:
Corrija e repasse pelo QA e Tech Lead.

---

## Formato Final

```
# Resumo da Refatoracao

## Refatoracao: [descricao curta]
## Status: APROVADO / EM CORRECAO

### Fluxo Executado
1. DEV ✓ - Refatoracao implementada
2. QA ✓ - Nao-regressao validada
3. TECH LEAD ✓ - Revisao aprovada

### Arquivos Alterados
- [lista]

### Proximo passo
[Commitar / Corrigir / etc]
```
