'use client';

import { useState } from 'react';
import { CalendarRange, ChartLine } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import FinancialEvolutionChart from '@/components/charts/FinancialEvolutionChart';
import { ChartEmptyState } from '@/components/charts/FinanceChartParts';
import {
  HISTORY_WINDOWS, buildMonthBreakdowns, buildMonthTickLabel, getHistoryMonths, type MonthWindow,
} from '@/lib/financialAnalysis';
import type { Income, Transaction } from '@/lib/types';

const WINDOW_STORAGE_KEY = 'financeiro_evolution_window';

function readSavedWindow(): MonthWindow {
  try {
    const saved = localStorage.getItem(WINDOW_STORAGE_KEY);
    if (HISTORY_WINDOWS.some((w) => w.id === saved)) return saved as MonthWindow;
  } catch {
    // localStorage indisponível (SSR ou modo privado)
  }
  return '6';
}

interface FinancialEvolutionSectionProps {
  transactions: Transaction[];
  incomes: Income[];
  availableMonths: string[];
  selectedMonth: string;
}

/** Renda, gastos e saldo dos últimos meses até o mês selecionado (exibida nos dois modos) */
export default function FinancialEvolutionSection({ transactions, incomes, availableMonths, selectedMonth }: FinancialEvolutionSectionProps) {
  // A página só renderiza depois de carregar os dados no cliente: ler o localStorage aqui não afeta a hidratação
  const [period, setPeriod] = useState<MonthWindow>(readSavedWindow);

  const handleWindowChange = (value: MonthWindow) => {
    setPeriod(value);
    try {
      localStorage.setItem(WINDOW_STORAGE_KEY, value);
    } catch {
      // ignora: a escolha continua valendo nesta sessão
    }
  };

  const months = getHistoryMonths(availableMonths, selectedMonth, period);
  const breakdowns = buildMonthBreakdowns(months, transactions, incomes);
  const monthsWithData = breakdowns.filter((b) => b.hasData).length;

  return (
    <SectionCard
      icon={ChartLine}
      title="Evolução Financeira"
      description="Renda, gastos e saldo mês a mês até o mês selecionado"
      actions={
        <ToolbarSelect
          icon={CalendarRange}
          value={period}
          onChange={(e) => handleWindowChange(e.target.value as MonthWindow)}
          aria-label="Período da evolução"
          title="Período da evolução"
        >
          {HISTORY_WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
        </ToolbarSelect>
      }
    >
      {monthsWithData < 2 ? (
        <ChartEmptyState
          icon={ChartLine}
          title="Ainda não há meses suficientes"
          text="Com pelo menos dois meses de receitas ou gastos lançados no período, a evolução aparece aqui."
        />
      ) : (
        <FinancialEvolutionChart breakdowns={breakdowns} tickLabel={buildMonthTickLabel(months)} />
      )}
    </SectionCard>
  );
}
