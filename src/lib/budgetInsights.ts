/**
 * Resumo e alertas dos orçamentos: cálculos puros sobre as linhas já apuradas por
 * useBudgetTracking (que usa lib/budgets). Sem imports em runtime, para rodar nos testes do Node.
 */

export type LineStatus = 'normal' | 'attention' | 'alert' | 'critical' | 'reached' | 'over';

/** Um orçamento de topo: categoria inteira, ou subcategoria que tem limite sem a categoria ter */
export interface BudgetLine {
  key: string;
  category: string;
  subcategory: string | null;
  label: string;
  limit: number;
  spent: number;
  rawPct: number;
  status: LineStatus;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BudgetTotals {
  /** Soma dos limites definidos */
  totalLimit: number;
  /** Gasto só nas categorias que têm orçamento */
  budgetedSpent: number;
  /** Soma do que cada orçamento passou do próprio limite (uma categoria folgada não compensa outra estourada) */
  exceeded: number;
  /** Soma do que ainda sobra em cada orçamento que não estourou */
  available: number;
  /** Orçamentos ultrapassados (gasto acima do limite) */
  overCount: number;
  /** Orçamentos que bateram exatamente o limite */
  reachedCount: number;
  budgetCount: number;
  /** Gasto em categorias sem orçamento: gasto total do mês menos o gasto orçado */
  unbudgetedSpent: number;
  /** Consumo geral: gasto orçado ÷ soma dos limites (null sem orçamentos) */
  consumptionPct: number | null;
}

/**
 * Totais do mês. `totalSpending` é todo o gasto que consome orçamento no mês (orçado ou não);
 * o consumo geral considera só o gasto orçado, e o resto aparece como gasto sem orçamento.
 */
export function summarizeBudgetLines(lines: Pick<BudgetLine, 'limit' | 'spent'>[], totalSpending: number): BudgetTotals {
  const totalLimit = round2(lines.reduce((s, l) => s + l.limit, 0));
  const budgetedSpent = round2(lines.reduce((s, l) => s + l.spent, 0));
  const cents = (n: number) => Math.round(n * 100);
  return {
    totalLimit,
    budgetedSpent,
    exceeded: round2(lines.reduce((s, l) => s + Math.max(0, l.spent - l.limit), 0)),
    available: round2(lines.reduce((s, l) => s + Math.max(0, l.limit - l.spent), 0)),
    overCount: lines.filter((l) => cents(l.spent) > cents(l.limit)).length,
    reachedCount: lines.filter((l) => cents(l.spent) === cents(l.limit) && l.limit > 0).length,
    budgetCount: lines.length,
    unbudgetedSpent: round2(Math.max(0, totalSpending - budgetedSpent)),
    consumptionPct: totalLimit > 0 ? (budgetedSpent / totalLimit) * 100 : null,
  };
}

// ─── Alertas ────────────────────────────────────────────────────────────────────────────

export type AlertKind = 'over' | 'limit' | 'pace' | 'growth' | 'unbudgeted';

export interface BudgetAlert {
  id: string;
  kind: AlertKind;
  /** Chave do orçamento (linha) ou da categoria sem orçamento */
  key: string;
  category: string;
  subcategory: string | null;
  label: string;
  spent: number;
  /** null quando não há orçamento */
  limit: number | null;
  pct: number | null;
  /** Reais além do limite (positivo) ou, nos alertas de crescimento, acima da média; negativo = folga */
  diff: number;
  /** Média dos meses anteriores, quando o alerta é de crescimento */
  baseline: number | null;
  /** Fração do mês decorrida (%), nos alertas de ritmo */
  elapsedPct: number | null;
  /** Ordenação: maior = mais relevante */
  score: number;
  hasBudget: boolean;
}

export interface UnbudgetedItem {
  category: string;
  spent: number;
  count: number;
}

export interface AlertInput {
  lines: BudgetLine[];
  unbudgeted: UnbudgetedItem[];
  /** Gasto total do mês que consome orçamento */
  totalSpending: number;
  /** Média dos meses anteriores por chave de linha ou categoria sem orçamento */
  previousAvg: Map<string, { avg: number; months: number }>;
  /** Fração do mês já decorrida (0–1) só para o mês em andamento; null nos demais */
  elapsed: number | null;
}

/** Só alertas relevantes entram; "atenção" (51–75%) fica de fora de propósito */
export const GROWTH_FACTOR = 1.5;
export const GROWTH_MIN_DIFF = 100;
export const PACE_MIN_PCT = 40;
export const PACE_GAP = 0.25;
export const UNBUDGETED_MIN_SHARE = 0.1;

export function buildBudgetAlerts({ lines, unbudgeted, totalSpending, previousAvg, elapsed }: AlertInput): BudgetAlert[] {
  const best = new Map<string, BudgetAlert>();
  const offer = (alert: BudgetAlert) => {
    const current = best.get(alert.key);
    if (!current || alert.score > current.score) best.set(alert.key, alert);
  };

  const growthOf = (key: string, spent: number) => {
    const prev = previousAvg.get(key);
    if (!prev || prev.months < 2 || prev.avg <= 0) return null;
    const diff = round2(spent - prev.avg);
    if (spent < prev.avg * GROWTH_FACTOR || diff < GROWTH_MIN_DIFF) return null;
    return { avg: prev.avg, diff, score: 400 + Math.min(100, (spent / prev.avg - 1) * 20) };
  };

  for (const l of lines) {
    const base = {
      key: l.key, category: l.category, subcategory: l.subcategory, label: l.label,
      spent: l.spent, limit: l.limit, pct: l.rawPct, diff: round2(l.spent - l.limit), baseline: null, elapsedPct: null, hasBudget: true,
    };
    if (l.status === 'over') {
      offer({ ...base, id: `over:${l.key}`, kind: 'over', score: 1000 + l.rawPct });
    } else if (l.status === 'reached' || l.status === 'critical' || l.status === 'alert') {
      offer({ ...base, id: `limit:${l.key}`, kind: 'limit', score: (l.status === 'reached' ? 900 : 700) + l.rawPct });
    }
    if (elapsed !== null && l.status !== 'over' && l.rawPct >= PACE_MIN_PCT && l.rawPct / 100 - elapsed >= PACE_GAP) {
      offer({ ...base, id: `pace:${l.key}`, kind: 'pace', elapsedPct: elapsed * 100, score: 500 + (l.rawPct - elapsed * 100) });
    }
    const growth = growthOf(l.key, l.spent);
    if (growth) offer({ ...base, id: `growth:${l.key}`, kind: 'growth', diff: growth.diff, baseline: growth.avg, score: growth.score });
  }

  for (const u of unbudgeted) {
    const base = {
      key: u.category, category: u.category, subcategory: null, label: u.category,
      spent: u.spent, limit: null, pct: null, baseline: null, elapsedPct: null, hasBudget: false,
    };
    const growth = growthOf(u.category, u.spent);
    if (growth) offer({ ...base, id: `growth:${u.category}`, kind: 'growth', diff: growth.diff, baseline: growth.avg, score: growth.score });
    const share = totalSpending > 0 ? u.spent / totalSpending : 0;
    if (share >= UNBUDGETED_MIN_SHARE) {
      offer({ ...base, id: `unbudgeted:${u.category}`, kind: 'unbudgeted', diff: 0, score: 300 + share * 100 });
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score);
}

// ─── Série histórica ────────────────────────────────────────────────────────────────────

export interface HistoryMonth {
  monthKey: string;
  /** Mês com algum lançamento: sem ele, não há informação (≠ gasto zero) */
  hasData: boolean;
  spentByKey: Record<string, number>;
  /** Só chaves com orçamento ativo no mês */
  limitByKey: Record<string, number>;
}

export interface HistoryPoint {
  monthKey: string;
  /** null: mês sem informação */
  spent: number | null;
  /** null: sem orçamento ativo no mês */
  limit: number | null;
  /** null: sem orçamento ou sem informação */
  pct: number | null;
}

/** Série de uma ou mais chaves somadas. O limite só existe se alguma das chaves tinha orçamento no mês */
export function historySeries(months: HistoryMonth[], keys: string[]): HistoryPoint[] {
  return months.map((m) => {
    const spent = m.hasData ? round2(keys.reduce((s, k) => s + (m.spentByKey[k] ?? 0), 0)) : null;
    const limits = keys.filter((k) => m.limitByKey[k] !== undefined);
    const limit = limits.length > 0 ? round2(limits.reduce((s, k) => s + m.limitByKey[k], 0)) : null;
    // % só compara o gasto das chaves que tinham limite naquele mês
    const spentOfLimited = m.hasData && limit !== null ? limits.reduce((s, k) => s + (m.spentByKey[k] ?? 0), 0) : null;
    return {
      monthKey: m.monthKey,
      spent,
      limit,
      pct: spentOfLimited !== null && limit !== null && limit > 0 ? (spentOfLimited / limit) * 100 : null,
    };
  });
}
