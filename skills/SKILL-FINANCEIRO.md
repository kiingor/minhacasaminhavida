# SKILL: Financeiro

## Regras de negócio
- Valores em centavos. Conversão `R$ 1.234,56` ↔ `123456` em `lib/formatters.ts`.
- Tipos de lançamento: `fixa` (recorrente mensal), `parcelada` (com `totalParcelas`/`parcelaAtual`), `avulsa` (única).
- **Parcelas**: NÃO criar N registros. Manter um único registro com `totalParcelas` e gerar virtualmente os meses no dashboard. (Evita lixo no banco.)
- **Recorrentes fixas**: idem — gera virtualmente para o mês exibido.
- **Cartão de crédito**: agrupa despesas pelo campo `cartao`; mostra fatura total no dashboard sem duplicar lançamentos.
- **Pago**: `pago: boolean` + `dataPagamento`. Botão "marcar como pago" preenche `dataPagamento = today`.

## Receitas
- `pessoaId` = quem da casa recebe (obrigatório).
- `pagadorNome` = de quem vem (texto livre, ex: "Empresa X", "Cliente Y").

## Metas
- `valorAtual` é soma dos `aportesMeta`. Atualizar via mutation atômica ao criar aporte.
- Progress = `valorAtual / valorAlvo`.

## Formatters
```ts
formatBRL(centavos: number): string  // "R$ 1.234,56"
parseBRL(s: string): number           // string → centavos
formatDate(iso: string): string       // "dd/MM/yyyy"
```

## Validação (Zod)
- valor > 0
- dataVencimento válida
- categoria pertence à família
