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
  totalBudgetSpending,
  type BudgetStatus,
} from '@/lib/budgets';
import { buildBudgetAlerts, summarizeBudgetLines, type HistoryMonth } from '@/lib/budgetInsights';
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
  /** Só em linhas de categoria: o que sobra do limite fora dos sub-limites */
  composition: BudgetComposition | null;
}

/**
 * Exemplo: Saúde com limite de R$ 232 e sub-limite de R$ 132 em Atividade física →
 * os R$ 100 restantes ficam para as demais subcategorias, com o gasto delas.
 */
export interface BudgetComposition {
  /** Limite da categoria menos a soma dos sub-limites (≤ 0: sub-limites passam do limite) */
  restLimit: number;
  /** Gasto da categoria fora das subcategorias com sub-limite */
  restSpent: number;
  restPct: number;
  restRawPct: number;
  restStatus: BudgetStatus;
  /** Gasto por subcategoria sem sub-limite, do maior para o menor */
  restItems: { name: string; spent: number }[];
  /** Soma dos sub-limites maior que o limite da categoria */
  overAllocated: boolean;
  microLimitTotal: number;
}

export interface UnbudgetedRow {
  category: string;
  spent: number;
  count: number;
}

/** Meses anteriores usados na média que detecta crescimento anormal */
const GROWTH_BASELINE_MONTHS = 3;
/** Meses carregados para o gráfico de histórico (a tela escolhe quantos mostrar) */
const HISTORY_MONTHS = 12;
const round = (n: number) => Math.round(n * 100) / 100;

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
        composition: null,
      };
    };

    // Gasto de cada subcategoria, agrupado pela categoria (chaves "Macro › Micro")
    const microSpending = new Map<string, Map<string, number>>();
    for (const [key, value] of spending) {
      const sep = key.indexOf(' › ');
      if (sep === -1) continue;
      const macro = key.slice(0, sep);
      if (!microSpending.has(macro)) microSpending.set(macro, new Map());
      microSpending.get(macro)!.set(key.slice(sep + 3), value.total);
    }

    const allRows = [...limits.entries()].map(([key, b]) => toRow(key, b));
    const macroRows = new Map(allRows.filter((r) => !r.subcategory).map((r) => [r.category, r]));
    const standaloneMicros: BudgetRow[] = [];
    for (const row of allRows) {
      if (!row.subcategory) continue;
      const parent = macroRows.get(row.category);
      if (parent) parent.micros.push(row);
      else standaloneMicros.push(row);
    }
    for (const row of macroRows.values()) {
      row.micros.sort((a, b) => b.limit - a.limit || b.spent - a.spent);
      const microLimitTotal = round(row.micros.reduce((sum, m) => sum + m.limit, 0));
      const restLimit = round(row.limit - microLimitTotal);
      const restSpent = round(row.spent - row.micros.reduce((sum, m) => sum + m.spent, 0));
      const budgeted = new Set(row.micros.map((m) => m.subcategory));
      const restItems = [...(microSpending.get(row.category) ?? new Map<string, number>())]
        .filter(([name, spent]) => !budgeted.has(name) && spent > 0)
        .map(([name, spent]) => ({ name, spent: round(spent) }));
      // gasto lançado sem subcategoria também fica no restante
      const withoutSub = round(restSpent - restItems.reduce((sum, i) => sum + i.spent, 0));
      if (withoutSub > 0) restItems.push({ name: 'Sem subcategoria', spent: withoutSub });
      restItems.sort((a, b) => b.spent - a.spent);
      row.composition = {
        restLimit,
        restSpent,
        restPct: displayPct(restSpent, restLimit),
        restRawPct: restLimit > 0 ? (restSpent / restLimit) * 100 : 0,
        restStatus: budgetStatus(restSpent, restLimit),
        restItems,
        overAllocated: restLimit < 0,
        microLimitTotal,
      };
    }

    // Cards de topo: categorias e subcategorias soltas (a ordem é escolhida na tela)
    const rows = [...macroRows.values(), ...standaloneMicros].sort((a, b) => b.limit - a.limit);

    // Sem orçamento: gasto das categorias sem limite, já descontado o que tem limite próprio de subcategoria
    const macroSpending = spendingByMacro(transactions, selectedMonth);
    const standaloneOf = (category: string) => standaloneMicros.filter((r) => r.category === category);
    const unbudgeted: UnbudgetedRow[] = [...macroSpending.entries()]
      .filter(([category]) => !macroRows.has(category))
      .map(([category, s]) => {
        const own = standaloneOf(category);
        return {
          category,
          spent: round(s.total - own.reduce((sum, r) => sum + r.spent, 0)),
          count: s.count - own.reduce((sum, r) => sum + r.count, 0),
        };
      })
      .filter((u) => u.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    // Consolidado: só os cards de topo (sub-limites já estão no total da categoria)
    const totalSpending = totalBudgetSpending(transactions, selectedMonth);
    const totals = summarizeBudgetLines(rows, totalSpending);
    const summary = {
      ...totals,
      totalSpending,
      /** Percentual exibido (nunca mostra 100% antes de bater o limite) */
      pct: totals.consumptionPct === null ? null : displayPct(totals.budgetedSpent, totals.totalLimit),
      status: budgetStatus(totals.budgetedSpent, totals.totalLimit),
      macroCount: macroRows.size,
      microCount: allRows.length - macroRows.size,
    };

    // Média dos meses anteriores, para detectar crescimento anormal
    const previous = availableMonths.filter((m) => m < selectedMonth).slice(-GROWTH_BASELINE_MONTHS);
    const previousSpending = previous.map((m) => spendingByBudgetKey(transactions, m));
    const previousAvg = new Map<string, { avg: number; months: number }>();
    const addAverage = (key: string, valueOf: (spending: Map<string, { total: number }>) => number) => {
      if (previous.length === 0) return;
      previousAvg.set(key, { avg: round(previousSpending.reduce((sum, s) => sum + valueOf(s), 0) / previous.length), months: previous.length });
    };
    for (const row of rows) addAverage(row.key, (s) => s.get(row.key)?.total ?? 0);
    for (const u of unbudgeted) {
      addAverage(u.category, (s) => (s.get(u.category)?.total ?? 0) - standaloneOf(u.category).reduce((sum, r) => sum + (s.get(r.key)?.total ?? 0), 0));
    }

    const today = new Date();
    const elapsed = selectedMonth === CURRENT_MONTH_KEY
      ? today.getDate() / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      : null;
    const alerts = buildBudgetAlerts({ lines: rows, unbudgeted, totalSpending, previousAvg, elapsed });

    // Histórico: gasto real de cada mês e o limite que valia nele (sem limite = sem orçamento naquele mês)
    const monthsWithData = new Set(transactions.map((t) => t.monthKey));
    const history: HistoryMonth[] = availableMonths
      .filter((m) => m <= selectedMonth)
      .slice(-HISTORY_MONTHS)
      .map((monthKey) => ({
        monthKey,
        hasData: monthsWithData.has(monthKey),
        spentByKey: Object.fromEntries([...spendingByBudgetKey(transactions, monthKey)].map(([k, v]) => [k, v.total])),
        limitByKey: Object.fromEntries([...budgetsForMonth(budgets, monthKey)].map(([k, b]) => [k, b.limit])),
      }));

    return {
      selectedMonth,
      isPastMonth: selectedMonth < CURRENT_MONTH_KEY,
      rows,
      unbudgeted,
      summary,
      alerts,
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
