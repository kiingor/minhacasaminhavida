---
name: bugfix
description: Fluxo para corrigir um bug. Passa por PO (analise), DEV (correcao), QA (validacao) e Tech Lead (aprovacao). Use quando o usuario reportar um bug ou problema.
argument-hint: "[descricao do bug]"
---

# Fluxo de Correcao de Bug

O usuario reportou: **$ARGUMENTS**

Execute o fluxo abaixo na ordem. Cada etapa deve ser executada por um subagent especializado.

---

## ETAPA 1: PO - Analise do Bug

Dispare um Agent com o papel de PO (use as instrucoes de `.claude/agents/po.md`):

Prompt para o PO:
> Analise o bug reportado no projeto Minha Casa Minha Vida: **$ARGUMENTS**
> Identifique a causa raiz lendo o codigo. Defina criterios de aceitacao para a correcao.
> Adapte seu formato para foco em bug: inclua "Causa Raiz" e "Comportamento Esperado vs Atual".

Apresente o resultado e continue.

---

## ETAPA 2: DEV - Correcao

Agora VOCE assume o papel de DEV (use as instrucoes de `.claude/agents/dev.md`).
Corrija o bug seguindo a analise do PO. Faca a menor mudanca possivel que resolve o problema.

Apresente a lista de arquivos modificados e continue.

---

## ETAPA 3: QA - Validacao

Dispare um Agent com o papel de QA (use as instrucoes de `.claude/agents/qa.md`):

Prompt para o QA:
> Valide a correcao do bug: **$ARGUMENTS**
> Verifique se o bug foi realmente corrigido e se nao introduziu regressoes.
> Rode `npx tsc --noEmit` para verificar erros de TypeScript.

Se encontrar problemas, corrija antes de prosseguir.

---

## ETAPA 4: TECH LEAD - Aprovacao

Dispare um Agent com o papel de Tech Lead (use as instrucoes de `.claude/agents/techlead.md`):

Prompt para o Tech Lead:
> Revise a correcao do bug: **$ARGUMENTS**
> Verifique se a correcao e minima, segura e nao introduz efeitos colaterais.

### Se APROVADO:
Informe o usuario e pergunte se deseja fazer commit.

### Se REPROVADO:
Corrija e repasse pelo QA e Tech Lead.

---

## Formato Final

```
# Resumo da Correcao

## Bug: [descricao curta]
## Status: APROVADO / EM CORRECAO

### Fluxo Executado
1. PO ✓ - Bug analisado
2. DEV ✓ - Correcao implementada
3. QA ✓ - Validacao aprovada
4. TECH LEAD ✓ - Revisao aprovada

### Arquivos Alterados
- [lista]

### Proximo passo
[Commitar / Corrigir / etc]
```
