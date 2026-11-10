'use client';

import { useMemo } from 'react';
import { useFinanceStore, CURRENT_MONTH_KEY } from '@/lib/store';
import { EXPENSE_MACROS } from '@/lib/detailedCategories';
import {
  budgetStatus,
  budgetsForMonth,
  displayPct,
  spendingByMacro,
  STATUS_SEVERITY,
  type BudgetStatus,
} from '@/lib/budgets';

export interface BudgetRow {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  /** Percentual exibido (ver displayPct) */
  pct: number;
  /** Percentual exato, para a barra */
  rawPct: number;
  count: number;
  status: BudgetStatus;
}

export interface UnbudgetedRow {
  category: string;
  spent: number;
  count: number;
}

export interface BudgetHistoryCell {
  monthKey: string;
  limit: number;
  spent: number;
  pct: number;
  status: BudgetStatus;
}

const HISTORY_MONTHS = 6;

/**
 * Acompanhamento dos orçamentos no mês selecionado, calculado das transações:
 * qualquer inclusão, edição ou exclusão de transação recalcula tudo.
 */
export function useBudgetTracking() {
  const { budgets, transactions, selectedMonth, availableMonths } = useFinanceStore();

  return useMemo(() => {
    const spending = spendingByMacro(transactions, selectedMonth);
    const limits = budgetsForMonth(budgets, selectedMonth);

    const rows: BudgetRow[] = [...limits.values()].map((b) => {
      const s = spending.get(b.category);
      const spent = Math.round((s?.total ?? 0) * 100) / 100;
      return {
        category: b.category,
        limit: b.limit,
        spent,
        remaining: Math.round((b.limit - spent) * 100) / 100,
        pct: displayPct(spent, b.limit),
        rawPct: b.limit > 0 ? (spent / b.limit) * 100 : 0,
        count: s?.count ?? 0,
        status: budgetStatus(spent, b.limit),
      };
    }).sort((a, b) => b.rawPct - a.rawPct);

    const unbudgeted: UnbudgetedRow[] = [...spending.entries()]
      .filter(([category, s]) => !limits.has(category) && s.total > 0)
      .map(([category, s]) => ({ category, spent: Math.round(s.total * 100) / 100, count: s.count }))
      .sort((a, b) => b.spent - a.spent);

    // Consolidado: só as categorias com orçamento no mês
    const totalLimit = rows.reduce((sum, r) => sum + r.limit, 0);
    const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);
    const overview = {
      totalLimit,
      totalSpent,
      remaining: Math.round((totalLimit - totalSpent) * 100) / 100,
      pct: displayPct(totalSpent, totalLimit),
      rawPct: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0,
      status: budgetStatus(totalSpent, totalLimit),
      overCount: rows.filter((r) => r.status === 'over' || r.status === 'reached').length,
    };

    const alerts = rows
      .filter((r) => STATUS_SEVERITY[r.status] >= STATUS_SEVERITY.alert)
      .sort((a, b) => STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] || b.rawPct - a.rawPct);

    // Histórico: últimos meses até o selecionado, com o limite que valia em cada um
    const historyMonths = availableMonths.filter((m) => m <= selectedMonth).slice(-HISTORY_MONTHS);
    const historyByMonth = historyMonths.map((monthKey) => ({
      monthKey,
      limits: budgetsForMonth(budgets, monthKey),
      spending: spendingByMacro(transactions, monthKey),
    }));
    const historyCategories = EXPENSE_MACROS.filter((c) => historyByMonth.some((m) => m.limits.has(c)));
    const history = historyCategories.map((category) => ({
      category,
      cells: historyByMonth.map(({ monthKey, limits: l, spending: s }): BudgetHistoryCell | null => {
        const budget = l.get(category);
        if (!budget) return null;
        const spent = s.get(category)?.total ?? 0;
        return { monthKey, limit: budget.limit, spent, pct: displayPct(spent, budget.limit), status: budgetStatus(spent, budget.limit) };
      }),
    }));

    return {
      selectedMonth,
      isPastMonth: selectedMonth < CURRENT_MONTH_KEY,
      rows,
      unbudgeted,
      overview,
      alerts,
      historyMonths,
      history,
      /** Macros que ainda não têm orçamento ativo neste mês */
      availableCategories: EXPENSE_MACROS.filter((c) => !limits.has(c)),
      spending,
    };
  }, [budgets, transactions, selectedMonth, availableMonths]);
}

/** Média de gasto da categoria nos meses anteriores ao selecionado (sugestão de limite) */
export function useCategoryAverage(category: string, months = 3): number {
  const { transactions, selectedMonth, availableMonths } = useFinanceStore();
  return useMemo(() => {
    if (!category) return 0;
    const previous = availableMonths.filter((m) => m < selectedMonth).slice(-months);
    if (previous.length === 0) return 0;
    const total = previous.reduce((sum, m) => sum + (spendingByMacro(transactions, m).get(category)?.total ?? 0), 0);
    return Math.round((total / previous.length) * 100) / 100;
  }, [category, months, transactions, selectedMonth, availableMonths]);
}
