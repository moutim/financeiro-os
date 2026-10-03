'use client';

import { useState } from 'react';
import { CalendarClock, CalendarRange } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import FutureCommitmentChart from '@/components/charts/FutureCommitmentChart';
import { ChartEmptyState } from '@/components/charts/FinanceChartParts';
import { toCanonicalMonthKey } from '@/lib/currency';
import { CURRENT_MONTH_KEY } from '@/lib/store';
import {
  FUTURE_WINDOWS, buildMonthBreakdowns, buildMonthTickLabel, getFutureMonths, type MonthWindow,
} from '@/lib/financialAnalysis';
import type { CreditCard, Income, Transaction } from '@/lib/types';

const WINDOW_STORAGE_KEY = 'financeiro_commitment_window';

function readSavedWindow(): MonthWindow {
  try {
    const saved = localStorage.getItem(WINDOW_STORAGE_KEY);
    if (FUTURE_WINDOWS.some((w) => w.id === saved)) return saved as MonthWindow;
  } catch {
    // localStorage indisponível (SSR ou modo privado)
  }
  return '6';
}

interface FutureCommitmentSectionProps {
  transactions: Transaction[];
  incomes: Income[];
  cards: CreditCard[];
  selectedMonth: string;
}

/**
 * Quanto da renda dos próximos meses já está comprometido sem nenhuma compra nova
 * (exibida nos dois modos). Parte do mês atual, ou do selecionado se ele estiver adiante.
 */
export default function FutureCommitmentSection({ transactions, incomes, cards, selectedMonth }: FutureCommitmentSectionProps) {
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

  const selected = toCanonicalMonthKey(selectedMonth);
  const start = selected > CURRENT_MONTH_KEY ? selected : CURRENT_MONTH_KEY;
  const months = getFutureMonths(start, period, transactions);
  const breakdowns = buildMonthBreakdowns(months, transactions, incomes);
  const hasCommitments = breakdowns.some((b) => b.expenses > 0);

  // Último mês com compra no cartão a partir do mês de partida, mesmo fora da janela escolhida
  const lastCardMonth = transactions.reduce<string | null>((last, t) => {
    if (!t.cardId) return last;
    const m = toCanonicalMonthKey(t.monthKey);
    return m >= start && (!last || m > last) ? m : last;
  }, null);

  return (
    <SectionCard
      icon={CalendarClock}
      title="Comprometimento Futuro"
      description="O que já está lançado para os próximos meses, sem nenhuma compra nova"
      actions={
        <ToolbarSelect
          icon={CalendarRange}
          value={period}
          onChange={(e) => handleWindowChange(e.target.value as MonthWindow)}
          aria-label="Meses do comprometimento futuro"
          title="Meses do comprometimento futuro"
        >
          {FUTURE_WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
        </ToolbarSelect>
      }
    >
      {!hasCommitments ? (
        <ChartEmptyState
          icon={CalendarClock}
          title="Nada comprometido nos próximos meses"
          text="Compras parceladas e contas lançadas para meses futuros aparecem aqui, junto com a renda já registrada para cada mês."
        />
      ) : (
        <FutureCommitmentChart
          breakdowns={breakdowns}
          cards={cards}
          lastCardMonth={lastCardMonth}
          tickLabel={buildMonthTickLabel(months)}
        />
      )}
    </SectionCard>
  );
}
