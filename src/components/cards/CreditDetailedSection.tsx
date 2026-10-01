'use client';

import CreditAnalytics from '@/components/cards/CreditAnalytics';
import type { CardWithRealData } from '@/lib/creditCards';
import type { Transaction } from '@/lib/types';

interface CreditDetailedSectionProps {
  cards: CardWithRealData[];
  transactions: Transaction[];
  selectedMonth: string;
  salary: number;
}

/**
 * Análise de crédito do modo detalhado: impacto na renda, peso de cada cartão
 * e faturas por categoria (cada um em seu card, com o título dentro).
 */
export default function CreditDetailedSection({
  cards,
  transactions,
  selectedMonth,
  salary,
}: CreditDetailedSectionProps) {
  if (cards.length === 0) return null;

  return (
    <CreditAnalytics
      cards={cards}
      salary={salary}
      transactions={transactions}
      selectedMonth={selectedMonth}
    />
  );
}
