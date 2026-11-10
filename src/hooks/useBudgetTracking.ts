'use client';

import { useMemo } from 'react';
import { useFinanceStore, CURRENT_MONTH_KEY } from '@/lib/store';
import { EXPENSE_MACROS } from '@/lib/detailedCategories';
import {
  budgetKey,
  budgetStatus,
  budgetsForMonth,
  displayPct,
  spendingByBudgetKey,
  spendingByMacro,
  STATUS_SEVERITY,
  type BudgetStatus,
} from '@/lib/budgets';
import type { CategoryBudget } from '@/lib/types';

export interface BudgetRow {
  key: string;
  category: string;
  /** Preenchida quando o limite é de uma subcategoria */
  subcategory: string | null;
  /** Nome para exibir: "Alimentação" ou "Delivery" */
  label: string;
  limit: number;
  spent: number;
  remaining: number;
  /** Percentual exibido (ver displayPct) */
  pct: number;
  /** Percentual exato, para a barra */
  rawPct: number;
  count: number;
  status: BudgetStatus;
  /** Limites de subcategorias dentro desta categoria (só em linhas de categoria) */
  micros: BudgetRow[];
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
const round = (n: number) => Math.round(n * 100) / 100;
const macroOrder = (category: string) => {
  const idx = (EXPENSE_MACROS as readonly string[]).indexOf(category);
  return idx === -1 ? EXPENSE_MACROS.length : idx;
};

/** Nome do orçamento na mensagem: "Alimentação" ou "Delivery (Alimentação)" */
export const budgetMessageLabel = (row: Pick<BudgetRow, 'category' | 'subcategory'>) =>
  row.subcategory ? `${row.subcategory} (${row.category})` : row.category;

/**
 * Acompanhamento dos orçamentos no mês selecionado, calculado das transações:
 * qualquer inclusão, edição ou exclusão de transação recalcula tudo.
 *
 * Limite de subcategoria numa categoria que também tem limite fica dentro dela
 * (é um sub-limite, o gasto já está no total da categoria). Sem limite na categoria,
 * a subcategoria vira um card próprio. O consolidado soma só os cards de topo, então
 * nenhum gasto entra duas vezes.
 */
export function useBudgetTracking() {
  const { budgets, transactions, selectedMonth, availableMonths } = useFinanceStore();

  return useMemo(() => {
    const spending = spendingByBudgetKey(transactions, selectedMonth);
    const limits = budgetsForMonth(budgets, selectedMonth);

    const toRow = (key: string, b: CategoryBudget): BudgetRow => {
      const s = spending.get(key);
      const spent = round(s?.total ?? 0);
      return {
        key,
        category: b.category,
        subcategory: b.subcategory ?? null,
        label: b.subcategory || b.category,
        limit: b.limit,
        spent,
        remaining: round(b.limit - spent),
        pct: displayPct(spent, b.limit),
        rawPct: b.limit > 0 ? (spent / b.limit) * 100 : 0,
        count: s?.count ?? 0,
        status: budgetStatus(spent, b.limit),
        micros: [],
      };
    };

    const allRows = [...limits.entries()].map(([key, b]) => toRow(key, b));
    const macroRows = new Map(allRows.filter((r) => !r.subcategory).map((r) => [r.category, r]));
    const standaloneMicros: BudgetRow[] = [];
    for (const row of allRows) {
      if (!row.subcategory) continue;
      const parent = macroRows.get(row.category);
      if (parent) parent.micros.push(row);
      else standaloneMicros.push(row);
    }
    for (const row of macroRows.values()) row.micros.sort((a, b) => b.rawPct - a.rawPct);

    // Cards de topo: categorias e subcategorias soltas, de quem consome mais para menos
    const rows = [...macroRows.values(), ...standaloneMicros].sort((a, b) => b.rawPct - a.rawPct);

    const macroSpending = spendingByMacro(transactions, selectedMonth);
    const unbudgeted: UnbudgetedRow[] = [...macroSpending.entries()]
      .filter(([category, s]) => !macroRows.has(category) && s.total > 0)
      .map(([category, s]) => ({ category, spent: round(s.total), count: s.count }))
      .sort((a, b) => b.spent - a.spent);

    // Consolidado: só os cards de topo (sub-limites já estão no total da categoria)
    const totalLimit = rows.reduce((sum, r) => sum + r.limit, 0);
    const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);
    const overview = {
      totalLimit,
      totalSpent,
      remaining: round(totalLimit - totalSpent),
      pct: displayPct(totalSpent, totalLimit),
      rawPct: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0,
      status: budgetStatus(totalSpent, totalLimit),
      overCount: rows.filter((r) => r.status === 'over' || r.status === 'reached').length,
      macroCount: macroRows.size,
      microCount: allRows.length - macroRows.size,
    };

    const alerts = allRows
      .filter((r) => STATUS_SEVERITY[r.status] >= STATUS_SEVERITY.alert)
      .sort((a, b) => STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] || b.rawPct - a.rawPct);

    // Histórico: últimos meses até o selecionado, com o limite que valia em cada um
    const historyMonths = availableMonths.filter((m) => m <= selectedMonth).slice(-HISTORY_MONTHS);
    const historyByMonth = historyMonths.map((monthKey) => ({
      monthKey,
      limits: budgetsForMonth(budgets, monthKey),
      spending: spendingByBudgetKey(transactions, monthKey),
    }));
    const historyKeys = new Map<string, CategoryBudget>();
    for (const { limits: l } of historyByMonth) for (const [key, b] of l) if (!historyKeys.has(key)) historyKeys.set(key, b);
    const history = [...historyKeys.entries()]
      .sort(([, a], [, b]) =>
        macroOrder(a.category) - macroOrder(b.category)
        || a.category.localeCompare(b.category)
        || (a.subcategory ? 1 : 0) - (b.subcategory ? 1 : 0)
        || (a.subcategory ?? '').localeCompare(b.subcategory ?? ''))
      .map(([key, b]) => ({
        key,
        category: b.category,
        subcategory: b.subcategory ?? null,
        cells: historyByMonth.map(({ monthKey, limits: l, spending: s }): BudgetHistoryCell | null => {
          const budget = l.get(key);
          if (!budget) return null;
          const spent = s.get(key)?.total ?? 0;
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
      /** Chaves (ver budgetKey) com orçamento ativo neste mês */
      takenKeys: new Set(limits.keys()),
      /** Macros que ainda não têm orçamento da categoria inteira neste mês */
      availableCategories: EXPENSE_MACROS.filter((c) => !limits.has(c)),
      spending,
    };
  }, [budgets, transactions, selectedMonth, availableMonths]);
}

/** Média de gasto nos meses anteriores ao selecionado (sugestão de limite) */
export function useCategoryAverage(category: string, subcategory: string | null, months = 3): number {
  const { transactions, selectedMonth, availableMonths } = useFinanceStore();
  return useMemo(() => {
    if (!category) return 0;
    const previous = availableMonths.filter((m) => m < selectedMonth).slice(-months);
    if (previous.length === 0) return 0;
    const key = budgetKey(category, subcategory);
    const total = previous.reduce((sum, m) => sum + (spendingByBudgetKey(transactions, m).get(key)?.total ?? 0), 0);
    return round(total / previous.length);
  }, [category, subcategory, months, transactions, selectedMonth, availableMonths]);
}
