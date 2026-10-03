import type { Income, Transaction } from '@/lib/types';
import { addMonths, monthKeyToLabel, monthKeyToShortLabel, sortMonthKeys, toCanonicalMonthKey } from '@/lib/currency';

/**
 * Contas mês a mês da Evolução financeira e do Comprometimento futuro (aba Cartões),
 * feitas sobre os dados que o app já carrega, sem gravar nada novo na planilha.
 * As somas seguem as dos cards do dashboard (getMonthSummary): "gastos" é tudo o que
 * saiu no mês, aportes inclusive, e o saldo é renda − gastos (a "Sobra do mês").
 */

// ─── Janelas de meses ────────────────────────────────────────────────────────

export type MonthWindow = '3' | '6' | '12' | 'all';

export const HISTORY_WINDOWS: { id: MonthWindow; label: string }[] = [
  { id: '3', label: 'Últimos 3 meses' },
  { id: '6', label: 'Últimos 6 meses' },
  { id: '12', label: 'Últimos 12 meses' },
  { id: 'all', label: 'Todo o histórico' },
];

export const FUTURE_WINDOWS: { id: MonthWindow; label: string }[] = [
  { id: '3', label: 'Próximos 3 meses' },
  { id: '6', label: 'Próximos 6 meses' },
  { id: '12', label: 'Próximos 12 meses' },
  { id: 'all', label: 'Até o último lançamento' },
];

/** "Até o último lançamento" vai no máximo até aqui */
const MAX_FUTURE_MONTHS = 24;
/** Mesmo sem nada lançado adiante, mostra pelo menos estes meses */
const MIN_FUTURE_MONTHS = 3;

const monthIndex = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return year * 12 + (month - 1);
};

/** Meses até o selecionado (inclusive), sem começar antes do primeiro mês com lançamentos */
export function getHistoryMonths(availableMonths: string[], endMonth: string, window: MonthWindow): string[] {
  const end = toCanonicalMonthKey(endMonth);
  const first = sortMonthKeys(availableMonths.map(toCanonicalMonthKey))[0];
  const start = first && first < end ? first : end;
  const limit = window === 'all' ? Infinity : Number(window);

  const months: string[] = [];
  for (let m = end; m >= start && months.length < limit; m = addMonths(m, -1)) months.unshift(m);
  return months;
}

/** Meses a partir de `startMonth`: a quantidade escolhida ou até o último mês com lançamento */
export function getFutureMonths(startMonth: string, window: MonthWindow, transactions: Transaction[]): string[] {
  const start = toCanonicalMonthKey(startMonth);
  let count = Number(window);
  if (window === 'all') {
    const last = transactions.reduce((max, t) => {
      const m = toCanonicalMonthKey(t.monthKey);
      return /^\d{4}-\d{2}$/.test(m) && m > max ? m : max;
    }, start);
    count = Math.min(Math.max(monthIndex(last) - monthIndex(start) + 1, MIN_FUTURE_MONTHS), MAX_FUTURE_MONTHS);
  }
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

// ─── Rótulos ─────────────────────────────────────────────────────────────────

/**
 * Rótulos do eixo X: "Out", "Nov"… Quando os meses atravessam anos, só janeiro leva
 * o ano ("Dez", "Jan 27", "Fev"): marca a virada sem alargar os outros rótulos no celular.
 */
export function buildMonthTickLabel(months: string[]): (monthKey: string) => string {
  const multiYear = months.length > 0 && months[0].slice(0, 4) !== months[months.length - 1].slice(0, 4);
  return (monthKey) => {
    const short = monthKeyToShortLabel(monthKey);
    const label = short.charAt(0).toUpperCase() + short.slice(1);
    return multiYear && monthKey.endsWith('-01') ? `${label} ${monthKey.slice(2, 4)}` : label;
  };
}

/** "Outubro de 2026" (cabeçalho do tooltip) */
export function monthFullLabel(monthKey: string): string {
  const label = monthKeyToLabel(monthKey);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "outubro": nome do mês no meio de uma frase */
export function monthName(monthKey: string): string {
  return monthKeyToLabel(monthKey).split(' ')[0];
}

// ─── Resumo de cada mês ──────────────────────────────────────────────────────

export interface MonthBreakdown {
  monthKey: string;
  /** Todas as receitas do mês (mesma soma da "Renda do mês") */
  income: number;
  /** Tudo o que saiu no mês, aportes inclusive (mesma soma do "Total de gastos") */
  expenses: number;
  /** Renda − gastos (mesma conta da "Sobra do mês") */
  balance: number;
  /** Gasto por cartão (cardId → valor) */
  byCard: Record<string, number>;
  cardTotal: number;
  /** Saídas fora do cartão */
  otherExpenses: number;
  /** Teve algum lançamento (receita ou saída) */
  hasData: boolean;
}

export function buildMonthBreakdowns(months: string[], transactions: Transaction[], incomes: Income[]): MonthBreakdown[] {
  const rows = new Map<string, MonthBreakdown>(months.map((monthKey) => [monthKey, {
    monthKey, income: 0, expenses: 0, balance: 0, byCard: {}, cardTotal: 0, otherExpenses: 0, hasData: false,
  }]));

  for (const t of transactions) {
    const row = rows.get(toCanonicalMonthKey(t.monthKey));
    if (!row) continue;
    row.hasData = true;
    row.expenses += t.amount;
    if (t.cardId) {
      row.byCard[t.cardId] = (row.byCard[t.cardId] ?? 0) + t.amount;
      row.cardTotal += t.amount;
    } else {
      row.otherExpenses += t.amount;
    }
  }

  for (const income of incomes) {
    const row = rows.get(toCanonicalMonthKey(income.monthKey));
    if (!row) continue;
    row.hasData = true;
    row.income += income.amount;
  }

  return months.map((monthKey) => {
    const row = rows.get(monthKey)!;
    row.balance = row.income - row.expenses;
    return row;
  });
}

/** Fração da renda já comprometida (null sem renda registrada no mês) */
export function commitmentRatio(month: Pick<MonthBreakdown, 'income' | 'expenses'>): number | null {
  return month.income > 0 ? month.expenses / month.income : null;
}
