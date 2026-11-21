/**
 * Motor de projeção financeira.
 *
 * Camada pura (sem React, sem store): recebe transações, rendas e cartões já carregados e
 * devolve, mês a mês, quanto da renda está comprometido. Não grava nada.
 *
 * Como os dados são modelados no app (e por isso como o motor os lê):
 *  - Cada parcela de uma compra parcelada é uma linha própria no mês dela, com a marcação
 *    "k/n". As parcelas futuras, portanto, já existem como transações: o motor só as lê,
 *    não as recria (recriar contaria duas vezes).
 *  - A fatura de um cartão é o agrupamento das transações do cartão no mês. O valor da
 *    fatura nunca é somado de novo às transações que a compõem.
 *  - Salário e despesas fixas só existem nos meses já iniciados ("Iniciar mês"). Para meses
 *    futuros sem lançamentos, o motor usa o último mês anterior que tenha esses lançamentos
 *    como referência e marca o resultado como estimativa (basis = 'estimated').
 *  - Gastos variáveis e à vista só entram quando já foram lançados: nada é inventado.
 *
 * Os imports de tipos usam o alias do projeto, mas são apagados em execução; o arquivo não
 * importa nada em runtime para poder ser testado direto pelo Node (ver engine.test.ts).
 */
import type { CreditCard, Income, Transaction } from '@/lib/types';

// ─── Utilidades de mês (cópias mínimas de lib/currency, que depende do alias) ─────────────

export function addMonthsToKey(monthKey: string, add: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + add;
  return `${Math.floor(total / 12)}-${String(((total % 12) + 12) % 12 + 1).padStart(2, '0')}`;
}

/** Quantos meses de `from` até `to` (negativo se `to` for anterior) */
export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addMonthsToKey(k, 1)) out.push(k);
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Mesma regra de lib/currency.splitInstallments: a 1ª parcela absorve a sobra do centavo */
export function splitTotal(total: number, count: number): { first: number; rest: number } {
  if (count <= 1) return { first: total, rest: total };
  const rest = Math.floor((total / count) * 100) / 100;
  return { first: round2(total - rest * (count - 1)), rest };
}

/** "3/12" → { k: 3, n: 12 }. Só parcelamentos de verdade (n > 1) */
export function parseInstallmentLabel(label: string | null | undefined): { k: number; n: number } | null {
  const match = (label ?? '').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const k = parseInt(match[1], 10);
  const n = parseInt(match[2], 10);
  return n > 1 && k >= 1 && k <= n ? { k, n } : null;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────────────────

export type CommitmentKind = 'installments' | 'fixed' | 'other';
export type MonthPhase = 'past' | 'current' | 'future';
/**
 * Confiança do mês:
 *  realized     — mês passado, com lançamentos reais
 *  known        — compromissos já lançados (mês atual ou futuro sem estimativas)
 *  estimated    — inclui valor trazido por recorrência (salário e/ou fixas de um mês de referência)
 *  insufficient — sem salário para comparar: percentuais e renda livre não são calculados
 */
export type MonthBasis = 'realized' | 'known' | 'estimated' | 'insufficient';
export type ItemSource = 'recorded' | 'recurrence' | 'simulation';

export interface CommitmentItem {
  id: string;
  name: string;
  amount: number;
  kind: CommitmentKind;
  cardId: string | null;
  category: string;
  /** "3/12" quando é parcela */
  installment: string | null;
  isPaid: boolean;
  source: ItemSource;
}

export interface MonthProjection {
  monthKey: string;
  phase: MonthPhase;
  basis: MonthBasis;
  /** Salário líquido do mês (rendas recorrentes). PLR, bônus e extras ficam em extraIncome */
  income: number;
  incomeSource: 'recorded' | 'recurrence' | 'none';
  extraIncome: number;
  installments: number;
  fixed: number;
  other: number;
  committed: number;
  /** % da renda comprometida; null sem salário de referência */
  committedPct: number | null;
  /** renda − comprometido; null sem salário de referência */
  free: number | null;
  freePct: number | null;
  hasEstimate: boolean;
  items: CommitmentItem[];
}

// ─── Classificação das transações ────────────────────────────────────────────────────────

/** Espelha lib/fixedTransactions.isFixedTransaction (inclui a categoria legada "Fixos") */
function isFixed(t: Pick<Transaction, 'category' | 'recurrency'>): boolean {
  return t.recurrency === 'Fixo' || t.category === 'Fixos';
}

/** Aportes (investimentos e metas) são poupança, não compromisso; transferências e receitas não são gasto */
function countsAsCommitment(t: Transaction): boolean {
  if (t.parentId) return false;
  if (t.transactionType === 'income' || t.transactionType === 'transfer' || t.category === 'Transferências') return false;
  if (t.transactionType === 'investment' || t.category === 'Investimentos') return false;
  if (t.goalId) return false;
  return true;
}

/**
 * Itens de uma transação. Sub-transações parceladas viram itens de parcela; o resto da
 * transação fica como fixa ou outra. Soma dos itens = valor da transação.
 */
export function expandTransaction(t: Transaction): CommitmentItem[] {
  const base = {
    cardId: t.cardId ?? null,
    isPaid: !!t.isPaid,
    source: 'recorded' as ItemSource,
  };
  const subs = t.subTransactions ?? [];
  const items: CommitmentItem[] = [];
  let remainder = t.amount;

  subs.forEach((s, idx) => {
    const inst = parseInstallmentLabel(s.installments);
    if (!inst) return;
    remainder = round2(remainder - s.amount);
    items.push({
      ...base,
      id: `${t.id}#${idx}`,
      name: s.name,
      amount: s.amount,
      kind: 'installments',
      category: s.category || t.category,
      installment: `${inst.k}/${inst.n}`,
      isPaid: s.isPaid ?? base.isPaid,
    });
  });

  const own = parseInstallmentLabel(t.installments);
  if (items.length === 0 || Math.abs(remainder) > 0.005) {
    items.push({
      ...base,
      id: t.id,
      name: t.name,
      amount: items.length === 0 ? t.amount : remainder,
      kind: own ? 'installments' : isFixed(t) ? 'fixed' : 'other',
      category: t.category,
      installment: own ? `${own.k}/${own.n}` : null,
    });
  }
  return items;
}

// ─── Projeção mês a mês ──────────────────────────────────────────────────────────────────

export interface ProjectionInput {
  transactions: Transaction[];
  incomes: Income[];
  /** "YYYY-MM" do mês atual */
  currentMonthKey: string;
  startMonthKey: string;
  endMonthKey: string;
}

const recurringIncome = (i: Income) => !!i.isRecurring && !i.parentId;

export function buildMonthlyProjection(input: ProjectionInput): MonthProjection[] {
  const { transactions, incomes, currentMonthKey, startMonthKey, endMonthKey } = input;

  const itemsByMonth = new Map<string, CommitmentItem[]>();
  for (const t of transactions) {
    if (!countsAsCommitment(t)) continue;
    const list = itemsByMonth.get(t.monthKey) ?? [];
    list.push(...expandTransaction(t));
    itemsByMonth.set(t.monthKey, list);
  }

  const salaryByMonth = new Map<string, number>();
  const extraByMonth = new Map<string, number>();
  for (const i of incomes) {
    if (i.parentId) continue;
    const map = recurringIncome(i) ? salaryByMonth : extraByMonth;
    map.set(i.monthKey, round2((map.get(i.monthKey) ?? 0) + i.amount));
  }

  const salaryMonths = [...salaryByMonth.keys()].sort();
  /** Último mês com salário lançado até `monthKey` (referência para meses futuros sem lançamento) */
  const referenceSalaryMonth = (monthKey: string) =>
    [...salaryMonths].reverse().find((m) => m <= monthKey) ?? null;

  const fixedMonths = [...itemsByMonth.entries()]
    .filter(([, items]) => items.some((i) => i.kind === 'fixed'))
    .map(([m]) => m)
    .sort();
  const referenceFixedMonth = (monthKey: string) =>
    [...fixedMonths].reverse().find((m) => m <= monthKey) ?? null;

  return monthRange(startMonthKey, endMonthKey).map((monthKey): MonthProjection => {
    const phase: MonthPhase = monthKey < currentMonthKey ? 'past' : monthKey === currentMonthKey ? 'current' : 'future';
    const recorded = itemsByMonth.get(monthKey) ?? [];
    const items = [...recorded];
    let hasEstimate = false;

    // Fixas: só meses futuros sem nenhuma fixa lançada herdam as do mês de referência
    if (phase === 'future' && !recorded.some((i) => i.kind === 'fixed')) {
      const ref = referenceFixedMonth(monthKey);
      if (ref) {
        for (const item of itemsByMonth.get(ref) ?? []) {
          if (item.kind !== 'fixed') continue;
          items.push({ ...item, id: `${item.id}@${monthKey}`, isPaid: false, source: 'recurrence' });
          hasEstimate = true;
        }
      }
    }

    // Salário: o lançado no mês; no futuro, o do último mês com salário
    let income = salaryByMonth.get(monthKey) ?? 0;
    let incomeSource: MonthProjection['incomeSource'] = income > 0 ? 'recorded' : 'none';
    if (income === 0 && phase === 'future') {
      const ref = referenceSalaryMonth(monthKey);
      if (ref) {
        income = salaryByMonth.get(ref) ?? 0;
        incomeSource = income > 0 ? 'recurrence' : 'none';
        if (incomeSource === 'recurrence') hasEstimate = true;
      }
    }

    const sum = (kind: CommitmentKind) =>
      round2(items.filter((i) => i.kind === kind).reduce((s, i) => s + i.amount, 0));
    const installments = sum('installments');
    const fixed = sum('fixed');
    const other = sum('other');
    const committed = round2(installments + fixed + other);
    const hasIncome = income > 0;

    const basis: MonthBasis = !hasIncome
      ? 'insufficient'
      : phase === 'past' ? 'realized' : hasEstimate ? 'estimated' : 'known';

    return {
      monthKey, phase, basis,
      income, incomeSource,
      extraIncome: extraByMonth.get(monthKey) ?? 0,
      installments, fixed, other, committed,
      committedPct: hasIncome ? (committed / income) * 100 : null,
      free: hasIncome ? round2(income - committed) : null,
      freePct: hasIncome ? ((income - committed) / income) * 100 : null,
      hasEstimate,
      items: items.sort((a, b) => b.amount - a.amount),
    };
  });
}

// ─── Parcelamentos (linha do tempo) ─────────────────────────────────────────────────────

export interface InstallmentRow {
  monthKey: string;
  k: number;
  amount: number;
  isPaid: boolean;
}

export interface InstallmentPlan {
  id: string;
  name: string;
  cardId: string | null;
  category: string;
  total: number;
  rows: InstallmentRow[];
  firstMonth: string;
  lastMonth: string;
  /** Valor da parcela regular (a última lançada; a 1ª pode absorver centavos) */
  installmentAmount: number;
  totalValue: number;
  paidCount: number;
  paidValue: number;
  remainingCount: number;
  remainingValue: number;
  /** Faltam parcelas a pagar */
  active: boolean;
  /** Primeiro mês sem esta parcela (quando o valor mensal é liberado) */
  releaseMonth: string;
  /** Há menos parcelas lançadas do que o total da compra */
  incomplete: boolean;
}

/**
 * Agrupa as parcelas lançadas em compras. Cada parcela é uma linha sem ID em comum, então a
 * compra é reconhecida por nome + cartão + total de parcelas (mesmo critério que o app usa
 * para editar e excluir parcelas).
 */
export function extractInstallmentPlans(transactions: Transaction[]): InstallmentPlan[] {
  const groups = new Map<string, { name: string; cardId: string | null; category: string; total: number; rows: InstallmentRow[] }>();

  for (const t of transactions) {
    if (!countsAsCommitment(t)) continue;
    for (const item of expandTransaction(t)) {
      if (item.kind !== 'installments' || !item.installment) continue;
      const [k, n] = item.installment.split('/').map(Number);
      const key = `${item.name.trim().toLowerCase()}|${item.cardId ?? ''}|${n}`;
      const group = groups.get(key) ?? { name: item.name, cardId: item.cardId, category: item.category, total: n, rows: [] };
      group.rows.push({ monthKey: t.monthKey, k, amount: item.amount, isPaid: item.isPaid });
      groups.set(key, group);
    }
  }

  return [...groups.entries()].map(([key, g]): InstallmentPlan => {
    const rows = g.rows.sort((a, b) => a.monthKey.localeCompare(b.monthKey) || a.k - b.k);
    const last = rows[rows.length - 1];
    const paid = rows.filter((r) => r.isPaid);
    const remaining = rows.filter((r) => !r.isPaid);
    const sum = (list: InstallmentRow[]) => round2(list.reduce((s, r) => s + r.amount, 0));
    return {
      id: key,
      name: g.name,
      cardId: g.cardId,
      category: g.category,
      total: g.total,
      rows,
      firstMonth: rows[0].monthKey,
      lastMonth: last.monthKey,
      installmentAmount: last.amount,
      totalValue: sum(rows),
      paidCount: paid.length,
      paidValue: sum(paid),
      remainingCount: remaining.length,
      remainingValue: sum(remaining),
      active: remaining.length > 0,
      releaseMonth: addMonthsToKey(last.monthKey, 1),
      incomplete: rows.length < g.total,
    };
  });
}

export interface ReleaseEvent {
  /** Primeiro mês com o valor já liberado */
  monthKey: string;
  plans: InstallmentPlan[];
  /** Valor mensal liberado: parcela regular de cada compra encerrada */
  monthlyRelease: number;
}

/** Parcelamentos que terminam em cada mês do período (liberam renda no mês seguinte) */
export function releaseSchedule(plans: InstallmentPlan[], fromMonth: string, toMonth: string): ReleaseEvent[] {
  const events: ReleaseEvent[] = [];
  for (const monthKey of monthRange(fromMonth, toMonth)) {
    const ending = plans.filter((p) => p.active && p.lastMonth === addMonthsToKey(monthKey, -1));
    if (ending.length === 0) continue;
    events.push({
      monthKey,
      plans: ending,
      monthlyRelease: round2(ending.reduce((s, p) => s + p.installmentAmount, 0)),
    });
  }
  return events;
}

// ─── Simulação de nova compra ────────────────────────────────────────────────────────────

export interface PurchaseSimulation {
  name: string;
  total: number;
  installments: number;
  cardId: string | null;
  /** Mês da 1ª parcela */
  firstMonthKey: string;
}

export const SIMULATION_ID_PREFIX = 'sim-';

/** Parcelas hipotéticas, no mesmo formato das lançadas. Nunca são gravadas */
export function simulationTransactions(sim: PurchaseSimulation): Transaction[] {
  const n = Math.max(1, Math.floor(sim.installments));
  const { first, rest } = splitTotal(sim.total, n);
  return Array.from({ length: n }, (_, i): Transaction => ({
    id: `${SIMULATION_ID_PREFIX}${i + 1}`,
    name: sim.name || 'Nova compra',
    amount: i === 0 ? first : rest,
    category: 'Simulação',
    transactionType: 'expense',
    paymentMethod: sim.cardId ? 'Crédito' : null,
    monthKey: addMonthsToKey(sim.firstMonthKey, i),
    installments: n > 1 ? `${i + 1}/${n}` : null,
    cardId: sim.cardId,
    isPaid: false,
  }));
}

/**
 * Mês da 1ª parcela pela regra do cartão: compra depois do fechamento cai na fatura seguinte;
 * se o vencimento é antes do fechamento (ex.: fecha dia 25, vence dia 5), a fatura vence no
 * mês depois do fechamento. Sem datas no cartão, vale o mês da compra. É só uma sugestão: o
 * usuário pode ajustar o mês.
 */
export function firstInstallmentMonth(
  purchase: { year: number; month: number; day: number },
  card?: Pick<CreditCard, 'closeDay' | 'dueDay'> | null,
): string {
  const purchaseKey = `${purchase.year}-${String(purchase.month).padStart(2, '0')}`;
  const closeDay = card?.closeDay ?? null;
  if (!closeDay) return purchaseKey;
  const closingMonth = purchase.day > closeDay ? addMonthsToKey(purchaseKey, 1) : purchaseKey;
  const dueDay = card?.dueDay ?? null;
  return dueDay && dueDay <= closeDay ? addMonthsToKey(closingMonth, 1) : closingMonth;
}

export interface ScenarioMonth {
  monthKey: string;
  base: MonthProjection;
  withPurchase: MonthProjection;
  /** Renda livre perdida no mês (positivo = perde) */
  freeLost: number;
  /** Pontos percentuais de comprometimento acrescentados */
  extraPct: number | null;
}

export interface ScenarioSummary {
  installmentAmount: number;
  monthsImpacted: number;
  lastMonthKey: string;
  /** Pontos percentuais adicionais no mês da 1ª parcela */
  extraPctFirstMonth: number | null;
  freeBefore: number;
  freeAfter: number;
  months: ScenarioMonth[];
}

/** Compara o cenário atual com o cenário em que a compra foi feita. Meses sem salário de referência ficam sem percentuais */
export function compareScenario(
  input: ProjectionInput,
  sim: PurchaseSimulation,
): ScenarioSummary {
  const simTxs = simulationTransactions(sim);
  const lastMonthKey = simTxs[simTxs.length - 1].monthKey;
  const endMonthKey = lastMonthKey > input.endMonthKey ? lastMonthKey : input.endMonthKey;
  const widened = { ...input, endMonthKey };
  const base = buildMonthlyProjection(widened);
  const withPurchase = buildMonthlyProjection({ ...widened, transactions: [...input.transactions, ...simTxs] });

  const months = base.map((b, idx): ScenarioMonth => {
    const w = withPurchase[idx];
    return {
      monthKey: b.monthKey,
      base: b,
      withPurchase: w,
      freeLost: round2(w.committed - b.committed),
      extraPct: b.committedPct !== null && w.committedPct !== null ? w.committedPct - b.committedPct : null,
    };
  });

  const impacted = months.filter((m) => m.freeLost !== 0);
  const sumFree = (list: ScenarioMonth[], pick: (m: ScenarioMonth) => MonthProjection) =>
    round2(list.reduce((s, m) => s + (pick(m).free ?? 0), 0));
  const window = months.filter((m) => m.monthKey >= simTxs[0].monthKey && m.monthKey <= lastMonthKey);
  const firstImpacted = months.find((m) => m.monthKey === simTxs[0].monthKey);

  return {
    installmentAmount: simTxs[simTxs.length - 1].amount,
    monthsImpacted: impacted.length,
    lastMonthKey,
    extraPctFirstMonth: firstImpacted?.extraPct ?? null,
    freeBefore: sumFree(window, (m) => m.base),
    freeAfter: sumFree(window, (m) => m.withPurchase),
    months,
  };
}

// ─── Faixas de comprometimento ──────────────────────────────────────────────────────────

/** Limites (em % da renda) onde cada faixa começa. Configuráveis: não são regra universal de saúde financeira */
export interface CommitmentBands {
  moderate: number;
  high: number;
  critical: number;
}

export const DEFAULT_BANDS: CommitmentBands = { moderate: 30, high: 50, critical: 70 };

export type BandLevel = 'low' | 'moderate' | 'high' | 'critical';

export function classifyCommitment(pct: number, bands: CommitmentBands = DEFAULT_BANDS): BandLevel {
  if (pct >= bands.critical) return 'critical';
  if (pct >= bands.high) return 'high';
  if (pct >= bands.moderate) return 'moderate';
  return 'low';
}

// ─── Histórico ──────────────────────────────────────────────────────────────────────────

export interface HistoryAverages {
  last3: number | null;
  last6: number | null;
  last12: number | null;
}

export interface HistorySummary {
  /** Meses encerrados (anteriores ao atual) com salário lançado */
  points: MonthProjection[];
  averages: HistoryAverages;
  /** Há ao menos 3 meses reais: abaixo disso o histórico é insuficiente para tendência */
  sufficient: boolean;
}

export function summarizeHistory(months: MonthProjection[]): HistorySummary {
  const points = months.filter((m) => m.phase === 'past' && m.basis === 'realized');
  const avg = (n: number) => {
    const slice = points.slice(-n);
    return slice.length === 0 ? null : slice.reduce((s, m) => s + (m.committedPct ?? 0), 0) / slice.length;
  };
  return {
    points,
    averages: { last3: avg(3), last6: avg(6), last12: avg(12) },
    sufficient: points.length >= 3,
  };
}

// ─── Indicadores da projeção de renda livre ─────────────────────────────────────────────

export interface ProjectionStats {
  highestCommitment: MonthProjection | null;
  lowestCommitment: MonthProjection | null;
  highestFree: MonthProjection | null;
  /** Soma dos compromissos dos meses seguintes ao atual, dentro do período */
  futureCommitted: number;
  endingPlans: number;
  monthlyReleased: number;
}

export function summarizeProjection(
  months: MonthProjection[],
  plans: InstallmentPlan[],
  currentMonthKey: string,
): ProjectionStats {
  const upcoming = months.filter((m) => m.phase !== 'past' && m.committedPct !== null);
  const extreme = (pick: (m: MonthProjection) => number, dir: 1 | -1) =>
    upcoming.reduce<MonthProjection | null>((best, m) => (!best || (pick(m) - pick(best)) * dir > 0 ? m : best), null);

  const last = months[months.length - 1]?.monthKey ?? currentMonthKey;
  const releases = releaseSchedule(plans, addMonthsToKey(currentMonthKey, 1), addMonthsToKey(last, 1));
  return {
    highestCommitment: extreme((m) => m.committedPct ?? 0, 1),
    lowestCommitment: extreme((m) => m.committedPct ?? 0, -1),
    highestFree: extreme((m) => m.free ?? 0, 1),
    futureCommitted: round2(months.filter((m) => m.phase === 'future').reduce((s, m) => s + m.committed, 0)),
    endingPlans: releases.reduce((s, e) => s + e.plans.length, 0),
    monthlyReleased: round2(releases.reduce((s, e) => s + e.monthlyRelease, 0)),
  };
}
