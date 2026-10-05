'use client';

import { useMemo } from 'react';
import { useFinanceStore } from '@/lib/store';
import { groupByCategory, isSpending, splitBySubCategory, useCategoryTaxonomy } from '@/lib/taxonomy';
import type { Transaction } from '@/lib/types';

export interface MonthlyCategoryTotals {
  monthKey: string;
  byCat: Record<string, number>;
}

/**
 * Gastos do mês selecionado já no formato de categoria do modo atual,
 * mais a evolução por categoria em todos os meses disponíveis. Transações com
 * sub-transações de outras categorias entram divididas (ver splitBySubCategory).
 */
export function useCategorySpending() {
  const taxonomy = useCategoryTaxonomy();
  const { selectedMonth, availableMonths, transactions: allTransactions } = useFinanceStore();

  return useMemo(() => {
    const spendingOf = (monthKey: string): Transaction[] =>
      allTransactions
        .filter((t) => t.monthKey === monthKey)
        .flatMap(splitBySubCategory)
        .map(taxonomy.normalize)
        .filter(isSpending);

    const transactions = spendingOf(selectedMonth);
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    const monthly: MonthlyCategoryTotals[] = availableMonths.map((monthKey) => ({
      monthKey,
      byCat: Object.fromEntries(
        groupByCategory(spendingOf(monthKey)).map((g) => [g.category, g.total]),
      ),
    }));

    return { taxonomy, selectedMonth, transactions, total, monthly };
  }, [taxonomy, selectedMonth, availableMonths, allTransactions]);
}
