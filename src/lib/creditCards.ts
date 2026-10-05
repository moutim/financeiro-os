import type { CreditCard, Transaction } from '@/lib/types';

/** Cartão enriquecido com o consumo real vindo das transações vinculadas */
export interface CardWithRealData extends CreditCard {
  realUsed: number;
  currentInvoiceAmount: number;
  unpaidCurrentMonth: Transaction[];
  cardTransactions: Transaction[];
}

export function buildCardsWithRealData(
  cards: CreditCard[],
  transactions: Transaction[],
  selectedMonth: string,
): CardWithRealData[] {
  return cards.map((card) => {
    const cardTransactions = transactions.filter(
      (t) => t.cardId === card.id && (!t.parentId || t.parentId === 'SHARED'),
    );

    const unpaidInvoicesAmount = cardTransactions
      .filter((t) => !t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0);

    const currentInvoiceAmount = cardTransactions
      .filter((t) => t.monthKey === selectedMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const unpaidCurrentMonth = cardTransactions.filter((t) => t.monthKey === selectedMonth && !t.isPaid);

    return {
      ...card,
      realUsed: card.used + unpaidInvoicesAmount,
      currentInvoiceAmount,
      unpaidCurrentMonth,
      cardTransactions,
    };
  });
}

// ─── Ordenação (modo detalhado) ──────────────────────────────────────────────

export type CardSortOption = 'priority' | 'limit-desc' | 'available-desc' | 'used-desc' | 'limit-asc' | 'name-asc';

export const CARD_SORT_OPTIONS: { id: CardSortOption; label: string }[] = [
  { id: 'priority', label: 'Prioridade' },
  { id: 'limit-desc', label: 'Maior limite' },
  { id: 'available-desc', label: 'Maior disponível' },
  { id: 'used-desc', label: 'Mais utilizado' },
  { id: 'limit-asc', label: 'Menor limite' },
  { id: 'name-asc', label: 'Nome (A–Z)' },
];

const available = (card: CardWithRealData) => Math.max(0, card.limit - card.realUsed);

export function sortCards(cards: CardWithRealData[], option: CardSortOption): CardWithRealData[] {
  return [...cards].sort((a, b) => {
    switch (option) {
      case 'priority': {
        const diff = (a.priority ?? 999) - (b.priority ?? 999);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      case 'limit-desc':
        return b.limit - a.limit;
      case 'limit-asc':
        return a.limit - b.limit;
      case 'available-desc':
        return available(b) - available(a);
      case 'used-desc':
        return b.realUsed - a.realUsed;
      case 'name-asc':
        return a.name.localeCompare(b.name);
    }
  });
}

// ─── Projeção de liberação de crédito (próximos 7 meses) ─────────────────────

export interface CreditProjectionPoint {
  month: string;
  utilizado: number;
  disponivel: number;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const toMonthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

/** "2027-04" → "Abr/27" */
const monthKeyLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  return `${MONTH_NAMES[Number(month) - 1]}/${year.slice(2)}`;
};

export function generateCreditProjection(cards: CardWithRealData[], now = new Date()): CreditProjectionPoint[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentMonthKey = toMonthKey(currentYear, currentMonth);
  const totalLimit = cards.reduce((acc, card) => acc + card.limit, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const projYear = currentYear + Math.floor((currentMonth + i) / 12);
    const projMonth = (currentMonth + i) % 12;
    const projMonthKey = toMonthKey(projYear, projMonth);

    let monthUsed = 0;
    for (const card of cards) {
      if (card.limit === 0 && card.realUsed === 0) continue;

      // Parte "manual" do limite usado: cai linearmente até o mês de quitação informado
      let projectedManualUsed: number;
      if (!card.freedMonthKey) {
        projectedManualUsed = Math.max(0, card.used - (card.used * 0.15 * i));
      } else {
        const [freeYear, freeMonth] = card.freedMonthKey.split('-').map(Number);
        const totalMonthsToFree = (freeYear - currentYear) * 12 + (freeMonth - 1 - currentMonth);
        projectedManualUsed = totalMonthsToFree <= 0
          ? (i === 0 ? card.used : 0)
          : Math.max(0, card.used - (card.used / totalMonthsToFree) * i);
      }

      // Consumo real pelas transações ainda não pagas a partir do mês projetado
      const projectedRealUsed = card.cardTransactions
        .filter((t) => !t.isPaid && (t.monthKey >= projMonthKey || t.monthKey < currentMonthKey))
        .reduce((sum, t) => sum + t.amount, 0);

      monthUsed += projectedManualUsed + projectedRealUsed;
    }

    return {
      month: MONTH_NAMES[projMonth],
      utilizado: monthUsed,
      disponivel: Math.max(0, totalLimit - monthUsed),
    };
  });
}

export interface RemainingInvoices {
  /** Soma das faturas ainda não pagas dos meses seguintes ao atual, em todos os cartões */
  total: number;
  /** Período somado: do próximo mês ("Nov/26") até a última fatura em aberto ("Abr/27") */
  from: string;
  until: string | null;
}

export function summarizeRemainingInvoices(cards: CardWithRealData[], now = new Date()): RemainingInvoices {
  const currentMonthKey = toMonthKey(now.getFullYear(), now.getMonth());
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const future = cards
    .flatMap((card) => card.cardTransactions)
    .filter((t) => !t.isPaid && t.monthKey > currentMonthKey);
  const lastMonthKey = future.reduce<string | null>((last, t) => (!last || t.monthKey > last ? t.monthKey : last), null);

  return {
    total: future.reduce((sum, t) => sum + t.amount, 0),
    from: monthKeyLabel(toMonthKey(nextMonth.getFullYear(), nextMonth.getMonth())),
    until: lastMonthKey && monthKeyLabel(lastMonthKey),
  };
}
