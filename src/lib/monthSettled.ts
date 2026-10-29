'use client';

import { useMemo } from 'react';
import { useFinanceStore } from '@/lib/store';
import type { Transaction } from '@/lib/types';

/** Despesas de um mês: quantas são, quantas já foram pagas e o valor somado */
export interface MonthPaymentStatus {
  count: number;
  paid: number;
  amount: number;
}

export function monthPaymentStatus(transactions: Transaction[]): Map<string, MonthPaymentStatus> {
  const byMonth = new Map<string, MonthPaymentStatus>();
  for (const t of transactions) {
    const status = byMonth.get(t.monthKey) ?? { count: 0, paid: 0, amount: 0 };
    status.count += 1;
    status.amount += t.amount;
    if (t.isPaid) status.paid += 1;
    byMonth.set(t.monthKey, status);
  }
  return byMonth;
}

/** Mês quitado: tem despesas e todas foram pagas (receitas não entram na conta) */
export const isSettled = (status: MonthPaymentStatus | undefined): boolean =>
  !!status && status.count > 0 && status.paid === status.count;

export interface SettledMonth extends MonthPaymentStatus {
  monthKey: string;
}

/**
 * Meses que acabaram de ser quitados por um pagamento: tinham pendência e agora
 * não têm. Excluir ou mover a última pendente não conta (nenhum pagamento novo).
 */
export function newlySettledMonths(before: Transaction[], after: Transaction[]): string[] {
  const prev = monthPaymentStatus(before);
  return [...monthPaymentStatus(after)].flatMap(([monthKey, status]) => {
    const old = prev.get(monthKey);
    return old && !isSettled(old) && isSettled(status) && status.paid > old.paid ? [monthKey] : [];
  });
}

/** Meses quitados, para o seletor de meses e o selo do cabeçalho */
export function useSettledMonths(): Set<string> {
  const transactions = useFinanceStore((state) => state.transactions);
  return useMemo(
    () => new Set([...monthPaymentStatus(transactions)].flatMap(([mk, status]) => (isSettled(status) ? [mk] : []))),
    [transactions],
  );
}
