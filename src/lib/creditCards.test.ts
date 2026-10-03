import { describe, expect, it } from 'vitest';
import { addMonths } from '@/lib/currency';
import {
  availableCredit,
  billingMonthOf,
  buildCardsWithRealData,
  generateCreditProjection,
  occupiesCreditLimit,
} from '@/lib/creditCards';
import type { CreditCard, Transaction } from '@/lib/types';

/*
 * Regras do Crédito Utilizado. Nada é fixo: as datas de referência são relativas a hoje
 * (inclusive uma virada dezembro → janeiro), os valores são sorteados e o esperado é
 * sempre calculado a partir dos lançamentos gerados.
 */

const today = new Date();
const monthsUntilDecember = 11 - today.getMonth();
const referenceDates = [0, 1, 6, monthsUntilDecember, monthsUntilDecember + 1, 13]
  .map((offset) => new Date(today.getFullYear(), today.getMonth() + offset, 1 + Math.floor(Math.random() * 28)));

const randomAmount = () => Math.round((5 + Math.random() * 2000) * 100) / 100;
const sum = (txs: Transaction[]) => txs.reduce((total, t) => total + t.amount, 0);

let sequence = 0;
function makeCard(): CreditCard {
  const limit = randomAmount() * 20;
  return { id: `card-${sequence++}`, name: 'Cartão de teste', limit, used: randomAmount(), color: '#000000', colorLight: '#ffffff', brand: 'Visa' };
}
function purchase(card: CreditCard, monthKey: string, overrides: Partial<Transaction> = {}): Transaction {
  return { id: `tx-${sequence++}`, name: 'Compra', amount: randomAmount(), category: 'Compras', monthKey, cardId: card.id, isPaid: false, ...overrides };
}
const recurring = (card: CreditCard, monthKey: string, amount: number, overrides: Partial<Transaction> = {}) =>
  purchase(card, monthKey, { name: 'Assinatura', amount, recurrency: 'Fixo', ...overrides });
const installment = (card: CreditCard, monthKey: string, number: number, total: number, amount: number, overrides: Partial<Transaction> = {}) =>
  purchase(card, monthKey, { name: 'Compra parcelada', amount, installments: `${number}/${total}`, ...overrides });

function creditUsed(card: CreditCard, transactions: Transaction[], now: Date) {
  return buildCardsWithRealData([card], transactions, billingMonthOf(now), now)[0];
}

describe.each(referenceDates.map((date) => [billingMonthOf(date), date] as const))('mês vigente %s', (currentMonth, now) => {
  it('1. inclui compra comum em aberto', () => {
    const card = makeCard();
    const tx = purchase(card, currentMonth);
    expect(creditUsed(card, [tx], now).realUsed).toBeCloseTo(card.used + tx.amount, 2);
  });

  it('2. mantém a regra das parcelas: todas as parcelas em aberto ocupam o limite, de qualquer mês', () => {
    const card = makeCard();
    const total = 3 + Math.floor(Math.random() * 10);
    const current = 1 + Math.floor(Math.random() * total);
    const value = randomAmount();
    const installments = Array.from({ length: total }, (_, i) =>
      installment(card, addMonths(currentMonth, i + 1 - current), i + 1, total, value, { isPaid: i + 1 < current && Math.random() < 0.5 }));
    const unpaid = installments.filter((t) => !t.isPaid);
    expect(creditUsed(card, installments, now).realUsed).toBeCloseTo(card.used + sum(unpaid), 2);
  });

  it('3. inclui a ocorrência do mês vigente de uma conta fixa', () => {
    const card = makeCard();
    const tx = recurring(card, currentMonth, randomAmount());
    expect(occupiesCreditLimit(tx, currentMonth)).toBe(true);
    expect(creditUsed(card, [tx], now).realUsed).toBeCloseTo(card.used + tx.amount, 2);
  });

  it('4. não inclui a ocorrência futura de uma conta fixa', () => {
    const card = makeCard();
    const tx = recurring(card, addMonths(currentMonth, 1 + Math.floor(Math.random() * 12)), randomAmount());
    expect(occupiesCreditLimit(tx, currentMonth)).toBe(false);
    expect(creditUsed(card, [tx], now).realUsed).toBeCloseTo(card.used, 2);
  });

  it('5. não inclui nenhuma das várias ocorrências futuras, só a do mês vigente', () => {
    const card = makeCard();
    const value = randomAmount();
    const futureCount = 2 + Math.floor(Math.random() * 18);
    const series = Array.from({ length: futureCount + 1 }, (_, i) => recurring(card, addMonths(currentMonth, i), value));
    expect(creditUsed(card, series, now).realUsed).toBeCloseTo(card.used + value, 2);
  });

  it('6. na virada do mês, a ocorrência do novo mês passa a contar', () => {
    const card = makeCard();
    const value = randomAmount();
    const series = Array.from({ length: 6 }, (_, i) => recurring(card, addMonths(currentMonth, i), value));
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // fatura do mês anterior paga: só a nova ocorrência ocupa o limite
    const previousPaid = series.map((t) => (t.monthKey === currentMonth ? { ...t, isPaid: true } : t));
    expect(creditUsed(card, previousPaid, nextMonthDate).realUsed).toBeCloseTo(card.used + value, 2);

    // fatura anterior ainda em aberto: segue a regra de pago/não pago e continua contando
    expect(creditUsed(card, series, nextMonthDate).realUsed).toBeCloseTo(card.used + 2 * value, 2);
  });

  it('7. recalcula o Limite Disponível como Limite Total − Crédito Utilizado', () => {
    const card = makeCard();
    const value = randomAmount();
    const regular = purchase(card, currentMonth);
    const series = Array.from({ length: 12 }, (_, i) => recurring(card, addMonths(currentMonth, i), value));
    const result = creditUsed(card, [regular, ...series], now);
    const expectedUsed = card.used + regular.amount + value;
    expect(result.realUsed).toBeCloseTo(expectedUsed, 2);
    expect(availableCredit(result)).toBeCloseTo(Math.max(0, card.limit - expectedUsed), 2);
  });

  it('8. a Fatura do Mês continua incluindo a conta fixa do mês (e cada mês mostra a sua)', () => {
    const card = makeCard();
    const value = randomAmount();
    const regular = purchase(card, currentMonth);
    const series = Array.from({ length: 4 }, (_, i) => recurring(card, addMonths(currentMonth, i), value));
    const transactions = [regular, ...series];

    const current = buildCardsWithRealData([card], transactions, currentMonth, now)[0];
    expect(current.currentInvoiceAmount).toBeCloseTo(regular.amount + value, 2);

    const futureMonth = addMonths(currentMonth, 2);
    const future = buildCardsWithRealData([card], transactions, futureMonth, now)[0];
    expect(future.currentInvoiceAmount).toBeCloseTo(value, 2);
    // e o Crédito Utilizado não depende do mês escolhido na tela
    expect(future.realUsed).toBeCloseTo(current.realUsed, 2);
  });

  it('distingue parcela marcada como fixa (segue a regra de parcela) de conta fixa', () => {
    const card = makeCard();
    const futureInstallment = installment(card, addMonths(currentMonth, 2), 3, 4, randomAmount(), { recurrency: 'Fixo' });
    expect(occupiesCreditLimit(futureInstallment, currentMonth)).toBe(true);
  });

  it('projeção: em cada mês projetado conta só a ocorrência fixa daquele mês', () => {
    const card = { ...makeCard(), used: 0 };
    const value = randomAmount();
    const series = Array.from({ length: 7 }, (_, i) => recurring(card, addMonths(currentMonth, i), value));
    const [withData] = buildCardsWithRealData([card], series, currentMonth, now);
    for (const point of generateCreditProjection([withData], now)) {
      expect(point.utilizado).toBeCloseTo(value, 2);
    }
  });
});
