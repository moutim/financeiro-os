/**
 * Análise de despesas por categoria e subcategoria: agrega transações já normalizadas
 * (ver useCategorySpending). Sem imports em runtime, para rodar nos testes do Node.
 */
import type { Transaction } from './types.ts';

export interface MicroStat {
  name: string;
  total: number;
  count: number;
  /** Valor médio por transação */
  ticket: number;
  /** Participação na categoria (0–1) */
  shareOfMacro: number;
  /** Participação no total de despesas (0–1) */
  shareOfTotal: number;
}

export interface MacroStat {
  category: string;
  total: number;
  count: number;
  ticket: number;
  /** Participação no total de despesas (0–1) */
  share: number;
  micros: MicroStat[];
}

export interface SpendingAnalysis {
  total: number;
  count: number;
  ticket: number;
  macros: MacroStat[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const NO_SUBCATEGORY = 'Geral';

export function analyzeSpending(transactions: Transaction[]): SpendingAnalysis {
  const macros = new Map<string, { total: number; count: number; micros: Map<string, { total: number; count: number }> }>();
  let total = 0;

  for (const t of transactions) {
    const category = t.category || 'Outros';
    const entry = macros.get(category) ?? { total: 0, count: 0, micros: new Map() };
    entry.total += t.amount;
    entry.count += 1;
    const explicit = t.subcategory?.trim();
    const sub = explicit && explicit !== category ? explicit : NO_SUBCATEGORY;
    const micro = entry.micros.get(sub) ?? { total: 0, count: 0 };
    micro.total += t.amount;
    micro.count += 1;
    entry.micros.set(sub, micro);
    macros.set(category, entry);
    total += t.amount;
  }

  const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
  const list: MacroStat[] = [...macros.entries()]
    .map(([category, m]) => ({
      category,
      total: round2(m.total),
      count: m.count,
      ticket: m.count > 0 ? round2(m.total / m.count) : 0,
      share: share(m.total, total),
      micros: [...m.micros.entries()]
        .map(([name, v]): MicroStat => ({
          name,
          total: round2(v.total),
          count: v.count,
          ticket: v.count > 0 ? round2(v.total / v.count) : 0,
          shareOfMacro: share(v.total, m.total),
          shareOfTotal: share(v.total, total),
        }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  return { total: round2(total), count: transactions.length, ticket: transactions.length > 0 ? round2(total / transactions.length) : 0, macros: list };
}
