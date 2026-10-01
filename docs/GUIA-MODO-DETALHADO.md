# Guia: como adicionar funcionalidades ao Modo Detalhado

O app tem dois modos de uso (Configurações → Modo de Uso). O **simples** é o padrão; o **detalhado** acrescenta análises, Macro › Micro e campos extras. Este guia mostra as peças prontas para estender o modo detalhado sem tocar no simples.

## As 4 peças

| Peça | Arquivo | Para quê |
|---|---|---|
| Estado do modo | `src/lib/appConfigStore.ts` | `useIsDetailedMode()` / `useAppMode()` |
| Alternância de UI | `src/components/mode/ModeSwitch.tsx` | `<DetailedOnly>`, `<ModeSwitch>`, `withModeVariants()` |
| Categorias por modo | `src/lib/taxonomy.ts` | `useCategoryTaxonomy()`, `groupByCategory()`, `isSpending()` |
| Dados de gasto prontos | `src/hooks/useCategorySpending.ts` | gastos do mês + evolução mensal já no formato do modo |

## Escolha o menor ponto de extensão

**1. Acrescentar um bloco que só existe no detalhado** → `<DetailedOnly>`

```tsx
<DetailedOnly>
  <span>{pct}% do salário</span>
</DetailedOnly>
```

Exemplos: badge de prioridade e alerta de limite em `src/app/cartoes/page.tsx`, campo de prioridade em `CardFormModal.tsx`.

**2. Trocar um bloco inteiro** → `<ModeSwitch>`

```tsx
<ModeSwitch
  simple={<MonthSummaryList transactions={txs} />}
  detailed={<SpendingTree transactions={txs} />}
/>
```

Exemplo: card de resumo em `src/app/dashboard/page.tsx`.

**3. Trocar um componente inteiro com as mesmas props** → `withModeVariants()`

```tsx
const TransactionForm = withModeVariants(TransactionFormSimple, TransactionFormDetailed);
```

Exemplos: `TransactionForm.tsx` e `TransactionEditModal.tsx`. Convenção de nomes: `XxxSimple.tsx` / `XxxDetailed.tsx` na mesma pasta.

**Componente pesado (gráficos, muitas linhas)?** Carregue sob demanda, para não pesar no modo simples:

```tsx
const CreditDetailedSection = dynamic(() => import('@/components/cards/CreditDetailedSection'));
```

## Categorias: nunca compare `t.category` direto

A planilha guarda a categoria do jeito que foi lançada: legada (`Comida`) pelo simples, ou macro + micro (`Alimentação` › `Delivery`) pelo detalhado. Para exibir, sempre normalize:

```tsx
const taxonomy = useCategoryTaxonomy();
const view = taxonomy.normalize(tx);        // categoria no formato do modo atual
const cfg = taxonomy.getConfig(view.category); // cor, ícone, rótulo
```

- `normalize` é **só para exibição**. Para editar ou salvar, use a transação original.
- Para listas de gastos, filtre com `isSpending` (exclui receitas e transferências) e agrupe com `groupByCategory`.
- Uma tela nova de análise geralmente começa com `useCategorySpending()`, como em `CategoriesDetailedView.tsx`.

## Leia o modo sempre pelos hooks

Use `useIsDetailedMode()`, `<DetailedOnly>` etc. Não use `useAppConfigStore.getState()` em componentes: o hook devolve o modo padrão no servidor e na 1ª renderização, o que evita erro de hidratação quando o usuário tem o modo detalhado salvo.

## Novo campo salvo na planilha

1. Adicione o campo em `src/lib/types.ts` (opcional, `?:`).
2. Acrescente a coluna **no fim** em `SHEET_HEADERS` (`src/lib/sheets.ts`) e em `rowToX`/`xToRow` (`src/lib/parsers.ts`). Nunca reordene colunas existentes: planilhas antigas dependem dos índices.
3. Mostre ou edite o campo dentro de `<DetailedOnly>` (ou na variante `Detailed`).

## Checklist

- [ ] O modo simples continua idêntico, com o modo detalhado desligado
- [ ] Transações antigas (categorias legadas) aparecem corretamente no detalhado
- [ ] Transações do detalhado aparecem no simples (mapeadas para a categoria simples)
- [ ] Componentes pesados usam `dynamic()`
- [ ] `npx tsc --noEmit` e `npx eslint` sem erros novos
