'use client';

import { useMemo, useState } from 'react';
import BudgetFormModal, { type BudgetFormTarget } from '@/components/categories/BudgetFormModal';
import BudgetSummaryBar from '@/components/categories/BudgetSummaryBar';
import BudgetAlertsList from '@/components/categories/BudgetAlertsList';
import BudgetTable from '@/components/categories/BudgetTable';
import BudgetHistory from '@/components/categories/BudgetHistory';
import ExpenseAnalysis from '@/components/categories/ExpenseAnalysis';
import CategoryTransactionsModal from '@/components/charts/CategoryTransactionsModal';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel } from '@/lib/currency';
import { getCategoryConfig, getMicrosForMacro } from '@/lib/detailedCategories';
import { budgetKey, budgetTransactions } from '@/lib/budgets';
import type { BudgetAlert } from '@/lib/budgetInsights';
import { useBudgetTracking, type BudgetRow } from '@/hooks/useBudgetTracking';
import type { Transaction } from '@/lib/types';

type ModalState =
  | { mode: 'new'; category?: string | null; scope?: 'macro' | 'micro' }
  | { mode: 'edit'; category: string; subcategory: string | null; limit: number }
  | null;

const editState = (row: BudgetRow): ModalState => ({ mode: 'edit', category: row.category, subcategory: row.subcategory, limit: row.limit });

/**
 * Categorias no modo detalhado, numa única superfície em cinco áreas: resumo do orçamento,
 * alertas, orçamentos por categoria, evolução e análise de despesas. Todos os números vêm
 * de useBudgetTracking (lib/budgets) e de lib/spendingAnalysis; aqui só há a composição.
 */
export default function CategoriesDetailedView() {
  const { setCategoryBudget, deactivateCategoryBudget, deleteCategoryBudgetHistory, setSelectedMonth, transactions } = useFinanceStore();
  const {
    selectedMonth, isPastMonth, rows, unbudgeted, summary, alerts, history, availableCategories, takenKeys, spending,
  } = useBudgetTracking();

  const [modal, setModal] = useState<ModalState>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [txTarget, setTxTarget] = useState<{ row: BudgetRow; transactions: Transaction[] } | null>(null);

  const hasBudgets = rows.length > 0;
  const monthLabel = monthKeyToLabel(selectedMonth);
  const hasFreeMicros = (category: string) => getMicrosForMacro(category).some((m) => !takenKeys.has(budgetKey(category, m)));
  const canDefine = (category: string) => (availableCategories as readonly string[]).includes(category);
  const canAdd = availableCategories.length > 0 || rows.some((r) => hasFreeMicros(r.category));

  // Sem nenhum orçamento, "categoria sem orçamento" seria ruído: os alertas só fazem sentido com limites definidos
  const shownAlerts = hasBudgets ? alerts : [];

  const openAlert = (alert: BudgetAlert) => {
    if (!alert.hasBudget) {
      if (alert.kind === 'unbudgeted' && canDefine(alert.category)) setModal({ mode: 'new', category: alert.category, scope: 'macro' });
      return;
    }
    setExpandedKey(alert.key);
    requestAnimationFrame(() => document.getElementById(`cx-row-${alert.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  // Transações que compõem o gasto do orçamento (mesma regra do cálculo: ver budgetTransactions)
  const showTransactions = (row: BudgetRow) => {
    const list = budgetTransactions(transactions, selectedMonth).filter(
      (t) => (t.category || 'Outros') === row.category && (!row.subcategory || t.subcategory?.trim() === row.subcategory),
    );
    setTxTarget({ row, transactions: list });
  };

  const txTotal = useMemo(() => txTarget?.row.spent ?? 0, [txTarget]);

  return (
    <div className="cx-page card">
      {hasBudgets && <BudgetSummaryBar summary={summary} isPast={isPastMonth} />}

      <BudgetAlertsList alerts={shownAlerts} isPast={isPastMonth} onOpen={openAlert} />

      <BudgetTable
        rows={rows}
        unbudgeted={unbudgeted}
        totalSpending={summary.totalSpending}
        isPast={isPastMonth}
        monthLabel={monthLabel}
        expandedKey={expandedKey}
        onExpand={setExpandedKey}
        canAdd={canAdd}
        hasFreeMicros={hasFreeMicros}
        canDefine={canDefine}
        onNew={() => setModal({ mode: 'new' })}
        onEdit={(row) => setModal(editState(row))}
        onAddMicro={(category) => setModal({ mode: 'new', category, scope: 'micro' })}
        onDefine={(category) => setModal({ mode: 'new', category, scope: 'macro' })}
        onShowTransactions={showTransactions}
      />

      <BudgetHistory history={history} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />

      <ExpenseAnalysis />

      {modal && (
        <BudgetFormModal
          initial={modal.mode === 'edit' ? { category: modal.category, subcategory: modal.subcategory, limit: modal.limit } : null}
          preset={modal.mode === 'new' ? { category: modal.category, scope: modal.scope } : null}
          takenKeys={takenKeys}
          monthKey={selectedMonth}
          spentOf={(key) => spending.get(key)?.total ?? 0}
          onSave={async ({ category, subcategory }: BudgetFormTarget, limit) => {
            await setCategoryBudget(category, subcategory, limit, selectedMonth);
            setModal(null);
          }}
          onDeactivate={async ({ category, subcategory }) => {
            await deactivateCategoryBudget(category, subcategory, selectedMonth);
            setModal(null);
          }}
          onDeleteHistory={async ({ category, subcategory }) => {
            await deleteCategoryBudgetHistory(category, subcategory);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {txTarget && (
        <CategoryTransactionsModal
          category={txTarget.row.label}
          transactions={txTarget.transactions}
          total={txTotal}
          config={getCategoryConfig(txTarget.row.category)}
          onClose={() => setTxTarget(null)}
        />
      )}
    </div>
  );
}
