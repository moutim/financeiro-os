import type { CreditCard, Transaction } from '@/lib/types';
import { hasRepeatingInstallments, isFixedTransaction } from '@/lib/fixedTransactions';
import { toCanonicalMonthKey } from '@/lib/currency';

/**
 * Mês de fatura vigente: o da data de hoje. A fatura de cada transação é o MesKey
 * escolhido no lançamento (os dias de fechamento/vencimento do cartão não entram na conta).
 */
export const billingMonthOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * Compra parcelada (2 parcelas ou mais). Reconhece também as linhas antigas em que a
 * planilha transformou "1/4" em data (2026-04-01) ou a parcela ficou no fim do nome,
 * do mesmo jeito que a lista de transações exibe.
 */
export function isInstallmentPurchase(t: Transaction): boolean {
  if (hasRepeatingInstallments(t.installments, t.subTransactions ?? [])) return true;
  const asDate = (t.installments || t.name).match(/\d{4}-(\d{2})-(\d{2})/);
  if (asDate) return Number(asDate[1]) > 1; // "2026-04-01" = parcela 1 de 4
  const inName = t.name.match(/(\d+)\/(\d+)\)?$/);
  return !!inName && Number(inName[2]) > 1;
}

/**
 * Se uma transação do cartão ocupa o limite quando `billingMonth` é o mês vigente.
 *
 * - Paga: nunca ocupa.
 * - Compra comum e compra parcelada: em aberto, ocupam (a parcelada reserva a compra inteira).
 * - Conta fixa (assinatura, mensalidade), que é copiada como um lançamento por mês:
 *   a ocorrência do mês vigente e as anteriores em aberto ocupam; as dos meses seguintes
 *   ainda não passaram no cartão e não reservam limite antecipado.
 *
 * Parcela marcada como fixa por engano (planilhas antigas) segue a regra de parcela.
 */
export function occupiesCreditLimit(t: Transaction, billingMonth: string): boolean {
  if (t.isPaid) return false;
  if (isInstallmentPurchase(t) || !isFixedTransaction(t)) return true;
  return toCanonicalMonthKey(t.monthKey) <= billingMonth;
}

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
  now = new Date(),
): CardWithRealData[] {
  const currentBillingMonth = billingMonthOf(now);
  return cards.map((card) => {
    const cardTransactions = transactions.filter(
      (t) => t.cardId === card.id && (!t.parentId || t.parentId === 'SHARED'),
    );

    // Crédito Utilizado: tudo em aberto, sem as ocorrências futuras de contas fixas (ver occupiesCreditLimit)
    const unpaidInvoicesAmount = cardTransactions
      .filter((t) => occupiesCreditLimit(t, currentBillingMonth))
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

/** Limite Disponível = Limite Total − Crédito Utilizado (nunca negativo) */
export const availableCredit = (card: Pick<CardWithRealData, 'limit' | 'realUsed'>) => Math.max(0, card.limit - card.realUsed);

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
        return availableCredit(b) - availableCredit(a);
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

export function generateCreditProjection(cards: CardWithRealData[], now = new Date()): CreditProjectionPoint[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentMonthKey = billingMonthOf(now);
  const totalLimit = cards.reduce((acc, card) => acc + card.limit, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const projYear = currentYear + Math.floor((currentMonth + i) / 12);
    const projMonth = (currentMonth + i) % 12;
    const projMonthKey = `${projYear}-${String(projMonth + 1).padStart(2, '0')}`;

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

      // Consumo real pelas transações ainda não pagas a partir do mês projetado, com a mesma
      // regra do Crédito Utilizado tomando o mês projetado como vigente (conta fixa só até ele)
      const projectedRealUsed = card.cardTransactions
        .filter((t) => (t.monthKey >= projMonthKey || t.monthKey < currentMonthKey) && occupiesCreditLimit(t, projMonthKey))
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
