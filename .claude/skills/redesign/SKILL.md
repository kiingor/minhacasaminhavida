---
name: redesign
description: Fluxo de redesign visual de uma tela ou componente. Passa por UX Tech Lead (briefing) -> UX Designer (execucao) -> UX Tech Lead (review com loop) -> DEV (implementacao) -> QA -> Tech Lead. Use quando o usuario pedir redesign, mudanca visual significativa, ou aplicacao de novo design system a uma area do app.
argument-hint: "[tela ou componente para redesenhar]"
---

# Fluxo de Redesign Visual

O usuario pediu: **$ARGUMENTS**

Este fluxo e DIFERENTE do `/feature` porque o foco e visual/UX, nao funcional. As regras de negocio e dados nao mudam — apenas a apresentacao.

Execute o fluxo abaixo na ordem. Apresente o resultado de cada etapa ao usuario antes de prosseguir.

---

## ETAPA 1: UX TECH LEAD - Briefing

Dispare um Agent com o papel de UX Tech Lead (use as instrucoes de `.claude/agents/ux-techlead.md`):

Prompt para o UX Tech Lead:
> Voce esta no MODO: BRIEFING. Leia `tailwind.config.ts`, `src/app/globals.css` e os componentes em `src/components/ui/`. Em seguida, produza o briefing de design para: **$ARGUMENTS**
>
> Se houver uma imagem ou referencia visual mencionada na conversa, considere-a. Se o usuario nao falou da direcao visual, baseie-se no design system existente e proponha melhorias coerentes.
>
> Inclua tudo: paleta a usar, componentes a reutilizar, novos componentes (se necessario), restricoes, estados obrigatorios, criterios de aceite e acessibilidade minima.

Apresente o briefing ao usuario e continue.

---

## ETAPA 2: UX DESIGNER - Execucao

Dispare um Agent com o papel de UX Designer (use as instrucoes de `.claude/agents/ux-designer.md`):

Prompt para o UX Designer:
> Voce recebeu o seguinte briefing do UX Tech Lead:
>
> [COLE O BRIEFING DA ETAPA 1 AQUI INTEGRALMENTE]
>
> Produza a especificacao visual detalhada para: **$ARGUMENTS**
> Siga o briefing rigorosamente. Leia os componentes que o briefing pediu pra reutilizar.

Apresente a especificacao ao usuario e continue.

---

## ETAPA 3: UX TECH LEAD - Review (com loop)

Dispare um Agent com o papel de UX Tech Lead (use as instrucoes de `.claude/agents/ux-techlead.md`):

Prompt para o UX Tech Lead:
> Voce esta no MODO: REVIEW. Revise a seguinte entrega do UX Designer contra o briefing que voce mesmo deu na ETAPA 1:
>
> BRIEFING ORIGINAL:
> [COLE O BRIEFING DA ETAPA 1]
>
> ENTREGA DO DESIGNER:
> [COLE A ESPECIFICACAO DA ETAPA 2]
>
> Aprove ou reprove. Se reprovar, seja especifico sobre o que precisa mudar.

### Se REPROVADO:
Volte a ETAPA 2 com as correcoes do UX Tech Lead. Reexecute o UX Designer pedindo ajustes especificos. Reexecute esta etapa de review. Repita ate aprovacao (max 2 iteracoes — se reprovar 2x, pause e pergunte ao usuario como prosseguir).

### Se APROVADO:
Continue para a ETAPA 4.

---

## ETAPA 4: DEV - Implementacao

Agora VOCE assume o papel de DEV (use as instrucoes de `.claude/agents/dev.md`).

Implemente as mudancas seguindo a especificacao APROVADA do UX Designer. Use Edit, Write e Bash para modificar os arquivos necessarios.

Regras especificas pra redesign:
- NAO mude logica de negocio, mutations, queries, schema
- NAO mude o comportamento de dados — so a apresentacao
- Reutilize componentes UI existentes; crie novos so quando o briefing pediu
- Se precisar atualizar tokens em `tailwind.config.ts` ou `globals.css`, faca
- Mantenha compatibilidade com as outras telas que usam os mesmos componentes

Apresente a lista de arquivos modificados/criados ao usuario e continue.

---

## ETAPA 5: QA - Validacao Visual e Tecnica

Dispare um Agent com o papel de QA (use as instrucoes de `.claude/agents/qa.md`):

Prompt para o QA:
> Valide o redesign feito para: **$ARGUMENTS**
>
> ESPECIFICACAO APROVADA:
> [COLE A ESPECIFICACAO APROVADA DA ETAPA 2]
>
> Leia todos os arquivos que foram modificados. Verifique:
> 1. Aderencia visual a especificacao (cores, espacamentos, componentes usados)
> 2. Estados cobertos (vazio, loading, erro, sucesso, hover, focus, mobile, desktop)
> 3. Acessibilidade (contraste, aria-labels, foco, touch targets)
> 4. Sem regressao em outras telas que usam os mesmos componentes
> 5. Rode `npx tsc --noEmit` para verificar erros de TypeScript
>
> Se houver bugs visuais ou tecnicos, liste-os.

Se o QA encontrar problemas, corrija-os antes de prosseguir.

---

## ETAPA 6: TECH LEAD - Aprovacao Final

Dispare um Agent com o papel de Tech Lead (use as instrucoes de `.claude/agents/techlead.md`):

Prompt para o Tech Lead:
> Faca a revisao final tecnica do redesign de: **$ARGUMENTS**
> Leia todos os arquivos modificados e avalie qualidade de codigo, performance e aderencia aos padroes do projeto. NAO revise design (isso ja foi feito pelo UX Tech Lead) — foque em codigo.

### Se APROVADO:
Informe o usuario que o redesign esta pronto e pergunte se deseja fazer commit.

### Se REPROVADO:
Liste os problemas, corrija-os, e passe novamente pelo QA e Tech Lead ate aprovacao.

---

## Formato Final

Ao terminar todo o fluxo, apresente um resumo:

```
# Resumo do Redesign

## Tela/Componente: [nome]
## Status: APROVADO / EM CORRECAO

### Fluxo Executado
1. UX TECH LEAD - Briefing ✓
2. UX DESIGNER - Especificacao ✓
3. UX TECH LEAD - Review ✓ ([N] iteracoes)
4. DEV - Implementacao ✓
5. QA - Validacao ✓
6. TECH LEAD - Aprovacao ✓

### Arquivos Alterados
- [lista]

### Mudancas Visuais Principais
- [bullets do que mudou de fato visualmente]

### Proximo passo
[Commitar / Aplicar a proxima tela / etc]
```
