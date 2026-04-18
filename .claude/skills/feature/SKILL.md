---
name: feature
description: Fluxo completo para implementar uma nova feature. Passa por PO, UX, DEV, QA e Tech Lead automaticamente. Use quando o usuario pedir uma funcionalidade nova ou melhoria.
argument-hint: "[descricao da feature]"
---

# Fluxo de Feature Completa

O usuario pediu: **$ARGUMENTS**

Execute o fluxo completo abaixo, na ordem. Cada etapa deve ser executada por um subagent especializado. Apresente o resultado de cada etapa ao usuario antes de prosseguir para a proxima.

---

## ETAPA 1: PO - Especificacao

Dispare um Agent com o papel de PO (use as instrucoes de `.claude/agents/po.md`):

Prompt para o PO:
> Analise o codebase do projeto Minha Casa Minha Vida e crie a especificacao funcional para: **$ARGUMENTS**
> Leia o schema em `convex/schema.ts`, as paginas em `src/app/` e os componentes em `src/components/` para entender o estado atual.

Apresente o resultado ao usuario e continue.

---

## ETAPA 2: UX - Design de Interface

Dispare um Agent com o papel de UX (use as instrucoes de `.claude/agents/ux.md`):

Prompt para o UX:
> Com base na especificacao do PO acima, defina a interface para: **$ARGUMENTS**
> Leia os componentes existentes em `src/components/ui/` e `src/components/` para garantir consistencia.

Apresente o resultado ao usuario e continue.

---

## ETAPA 3: DEV - Implementacao

Agora VOCE assume o papel de DEV (use as instrucoes de `.claude/agents/dev.md`).
Implemente o codigo seguindo as especificacoes do PO e UX. Use Edit, Write e Bash para modificar os arquivos necessarios.

Apresente a lista de arquivos modificados/criados ao usuario e continue.

---

## ETAPA 4: QA - Validacao

Dispare um Agent com o papel de QA (use as instrucoes de `.claude/agents/qa.md`):

Prompt para o QA:
> Valide a implementacao feita para: **$ARGUMENTS**
> Leia todos os arquivos que foram modificados e verifique os criterios de aceitacao.
> Rode `npx tsc --noEmit` para verificar erros de TypeScript.

Se o QA encontrar bugs criticos, corrija-os antes de prosseguir.

---

## ETAPA 5: TECH LEAD - Aprovacao Final

Dispare um Agent com o papel de Tech Lead (use as instrucoes de `.claude/agents/techlead.md`):

Prompt para o Tech Lead:
> Faca a revisao final da implementacao de: **$ARGUMENTS**
> Leia todos os arquivos modificados e avalie qualidade, seguranca e aderencia aos padroes.

### Se APROVADO:
Informe o usuario que a feature esta pronta e pergunte se deseja fazer commit.

### Se REPROVADO:
Liste os problemas apontados pelo Tech Lead, corrija-os, e passe novamente pelo QA e Tech Lead ate aprovacao.

---

## Formato Final

Ao terminar todo o fluxo, apresente um resumo:

```
# Resumo da Entrega

## Feature: [nome]
## Status: APROVADO / EM CORRECAO

### Fluxo Executado
1. PO ✓ - Especificacao definida
2. UX ✓ - Interface desenhada
3. DEV ✓ - Codigo implementado
4. QA ✓ - Validacao aprovada
5. TECH LEAD ✓ - Revisao aprovada

### Arquivos Alterados
- [lista]

### Proximo passo
[Commitar / Corrigir / etc]
```
