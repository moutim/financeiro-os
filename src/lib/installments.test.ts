import { describe, expect, it } from 'vitest';
import { addMonths, parseInstallmentInput } from '@/lib/currency';
import { installmentAmount, planInstallments, sameInstallments } from '@/lib/installments';
import type { Transaction } from '@/lib/types';

const today = new Date();
const baseMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const purchase = { name: 'Notebook', cardId: 'card-1' };

const existingInstallment = (number: number, total: number, monthKey: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id: `t-${number}-${monthKey}`, name: purchase.name, amount: 100, category: 'Compras', monthKey,
  installments: `${number}/${total}`, cardId: purchase.cardId, isPaid: false, ...overrides,
});

describe('parseInstallmentInput', () => {
  it('aceita "6/6", "6-6" e "6 de 6" como a mesma parcela', () => {
    for (const input of ['6/6', '6-6', '6 de 6', ' 6 / 6 ']) {
      expect(parseInstallmentInput(input)).toEqual({ current: 6, total: 6 });
    }
  });

  it('"12" é a 1ª de 12 e data de planilha não vira parcela', () => {
    expect(parseInstallmentInput('12')).toEqual({ current: 1, total: 12 });
    expect(parseInstallmentInput('2026-04-01')).toBeNull();
  });
});

describe('planInstallments', () => {
  it('última parcela (6/6): fica no mês do lançamento e todas as anteriores vão para trás', () => {
    const plan = planInstallments({ current: 6, total: 6 }, baseMonth, purchase, []);
    expect(plan.current).toEqual({ number: 6, total: 6, monthKey: baseMonth });
    expect(plan.missing.map((s) => [s.number, s.monthKey])).toEqual(
      [1, 2, 3, 4, 5].map((n) => [n, addMonths(baseMonth, n - 6)]),
    );
  });

  it('parcela do meio (3/6): as seguintes vão para frente e as anteriores para trás', () => {
    const plan = planInstallments({ current: 3, total: 6 }, baseMonth, purchase, []);
    expect(plan.current.monthKey).toBe(baseMonth);
    expect(plan.missing.filter((s) => s.number > 3).map((s) => s.monthKey)).toEqual([1, 2, 3].map((k) => addMonths(baseMonth, k)));
    expect(plan.missing.filter((s) => s.number < 3).map((s) => s.monthKey)).toEqual([-2, -1].map((k) => addMonths(baseMonth, k)));
  });

  it('não repete parcelas que já foram lançadas (mesmo nome, cartão, número e mês)', () => {
    const existing = [
      existingInstallment(1, 6, addMonths(baseMonth, -5)),
      existingInstallment(2, 6, addMonths(baseMonth, -4)),
      // mesmo número em outro cartão não conta como já lançada
      existingInstallment(3, 6, addMonths(baseMonth, -3), { cardId: 'outro-cartao' }),
    ];
    const plan = planInstallments({ current: 6, total: 6 }, baseMonth, purchase, existing);
    expect(plan.missing.map((s) => s.number)).toEqual([3, 4, 5]);
  });

  it('"12" cria da 1ª à 12ª a partir do mês do lançamento', () => {
    const plan = planInstallments({ current: 1, total: 12 }, baseMonth, purchase, []);
    expect(plan.current.monthKey).toBe(baseMonth);
    expect(plan.missing.map((s) => s.monthKey)).toEqual(Array.from({ length: 11 }, (_, i) => addMonths(baseMonth, i + 1)));
  });
});

describe('sameInstallments e installmentAmount', () => {
  it('reconhece a mesma parcela em formatos diferentes', () => {
    expect(sameInstallments('6/6', '6-6')).toBe(true);
    expect(sameInstallments('3/6', '1/6')).toBe(false);
    expect(sameInstallments('', null)).toBe(true);
  });

  it('divide o total entre as parcelas sem perder centavos', () => {
    const total = Math.round((50 + Math.random() * 5000) * 100) / 100;
    const count = 2 + Math.floor(Math.random() * 11);
    const parts = Array.from({ length: count }, (_, i) => installmentAmount(total, count, i + 1));
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 2);
  });
});
