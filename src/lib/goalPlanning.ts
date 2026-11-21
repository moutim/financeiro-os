/**
 * Motor de planejamento das metas: saldo, projeção de alcance, plano de aportes por pessoa,
 * cenários e insights. Funções puras, sem React nem store; os testes rodam direto no Node.
 *
 * Regras que o motor preserva (são as do app, não novas):
 *  - Saldo da meta = saldo inicial (`current`) + movimentações lançadas (transações de
 *    Investimentos com `goalId`). O histórico nunca é somado de novo ao saldo.
 *  - Movimentações: aporte (soma), resgate (valor negativo, subtrai) e rendimento (soma, mas
 *    não conta como contribuição de ninguém).
 *  - Pendências (a pagar / a receber) NÃO entram no saldo: só viram saldo quando a
 *    movimentação é lançada como transação.
 *  - Projeção: parte do saldo real, começa no mês seguinte ao atual e só usa o que está
 *    planejado (plano por pessoa, ou o aporte mensal da meta). Sem taxa configurada, não há
 *    rendimento: nenhuma taxa é presumida.
 */
import type { ContributionPlan, InvestmentOperation, Pending } from './types.ts';
import { addMonthsToKey, monthDiff, monthRange } from './projection/engine.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Movimentações e saldo ──────────────────────────────────────────────────────────────

export type MovementKind = 'aporte' | 'resgate' | 'rendimento';

/** Subconjunto de Transaction que o motor lê */
export interface MovementLike {
  id: string;
  name: string;
  amount: number;
  monthKey: string;
  date?: string | null;
  recurrency?: string | null;
  subcategory?: string | null;
  author?: string | null;
  parentId?: string | null;
  operation?: InvestmentOperation | null;
}

export function movementKind(t: Pick<MovementLike, 'amount' | 'operation'>): MovementKind {
  if (t.operation === 'Rendimento') return 'rendimento';
  if (t.operation === 'Resgate' || t.amount < 0) return 'resgate';
  return 'aporte';
}

/** Efeito da movimentação no saldo: resgate sempre subtrai, mesmo se o valor veio positivo */
export function signedAmount(t: Pick<MovementLike, 'amount' | 'operation'>): number {
  const kind = movementKind(t);
  return kind === 'resgate' ? -Math.abs(t.amount) : t.amount;
}

export interface PersonContext {
  /** Nome de quem está usando o app, para reconhecer os próprios lançamentos */
  myName?: string | null;
  /** Meta com mais de uma pessoa (compartilhada, ou com aportes de convidados) */
  collaborative: boolean;
}

/**
 * Quem fez o movimento. Sem autor gravado, o lançamento da minha planilha é meu; cópia de
 * convidado anterior à coluna Autor fica como "Convidado". Metas de uma pessoa só: "Você".
 */
export function contributorOf(t: Pick<MovementLike, 'author' | 'parentId'>, ctx: PersonContext): string {
  if (!ctx.collaborative) return 'Você';
  const author = t.author || (t.parentId === 'SHARED' ? 'Convidado' : ctx.myName);
  if (!author || author === ctx.myName) return 'Você';
  // só o primeiro nome; autor gravado como e-mail mostra a parte antes do @
  return author.trim().split(/\s+/)[0].split('@')[0] || author;
}

export interface LedgerEntry<T extends MovementLike = MovementLike> {
  tx: T;
  kind: MovementKind;
  /** Efeito no saldo */
  signed: number;
  person: string;
  balanceAfter: number;
}

export interface LedgerTotals {
  initial: number;
  /** Soma dos aportes */
  contributed: number;
  /** Soma dos rendimentos */
  yield: number;
  /** Soma dos resgates (positivo) */
  withdrawn: number;
  /** initial + contributed + yield − withdrawn */
  balance: number;
}

const sortKey = (t: MovementLike) => `${t.date && t.date.length >= 10 ? t.date.slice(0, 10) : `${t.monthKey}-01`}|${t.id}`;

export function buildLedger<T extends MovementLike>(initial: number, txs: T[], ctx: PersonContext): { entries: LedgerEntry<T>[]; totals: LedgerTotals } {
  const sorted = [...txs].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  let balance = initial;
  const totals: LedgerTotals = { initial, contributed: 0, yield: 0, withdrawn: 0, balance: initial };
  const entries = sorted.map((tx): LedgerEntry<T> => {
    const kind = movementKind(tx);
    const signed = signedAmount(tx);
    balance = round2(balance + signed);
    if (kind === 'aporte') totals.contributed = round2(totals.contributed + signed);
    else if (kind === 'rendimento') totals.yield = round2(totals.yield + signed);
    else totals.withdrawn = round2(totals.withdrawn + Math.abs(signed));
    return { tx, kind, signed, person: contributorOf(tx, ctx), balanceAfter: balance };
  });
  totals.balance = balance;
  return { entries, totals };
}

// ─── Plano de aportes ───────────────────────────────────────────────────────────────────

export interface PlannedMonth {
  /** Total planejado por pessoa (recorrente + extraordinário) */
  byPerson: Record<string, number>;
  recurring: number;
  extra: number;
  total: number;
  /** Veio do aporte mensal da meta (não há plano por pessoa) */
  fromFallback: boolean;
}

export const FALLBACK_PERSON = 'Planejado';

/**
 * Planejado para um mês. Recorrente: por pessoa, vale a versão mais recente (maior `fromMonth`)
 * entre as que cobrem o mês. Extraordinário: soma os que caem no mês. Meta sem nenhum plano
 * recorrente usa o aporte mensal da própria meta (`fallbackMonthly`); com plano, o que não é
 * coberto é zero (o plano acabou).
 */
export function plannedForMonth(plans: ContributionPlan[], month: string, fallbackMonthly = 0): PlannedMonth {
  const recurringPlans = plans.filter((p) => p.kind === 'recorrente');
  const byPerson: Record<string, number> = {};
  let recurring = 0;
  let fromFallback = false;

  if (recurringPlans.length === 0) {
    if (fallbackMonthly > 0) {
      byPerson[FALLBACK_PERSON] = fallbackMonthly;
      recurring = fallbackMonthly;
      fromFallback = true;
    }
  } else {
    const winners = new Map<string, ContributionPlan>();
    for (const p of recurringPlans) {
      if (p.fromMonth > month || (p.toMonth && p.toMonth < month)) continue;
      const current = winners.get(p.person);
      if (!current || p.fromMonth > current.fromMonth || (p.fromMonth === current.fromMonth && p.id > current.id)) winners.set(p.person, p);
    }
    for (const [person, p] of winners) {
      byPerson[person] = round2((byPerson[person] ?? 0) + p.amount);
      recurring = round2(recurring + p.amount);
    }
  }

  let extra = 0;
  for (const p of plans) {
    if (p.kind !== 'extraordinario') continue;
    const last = p.toMonth || p.fromMonth;
    if (month < p.fromMonth || month > last) continue;
    byPerson[p.person] = round2((byPerson[p.person] ?? 0) + p.amount);
    extra = round2(extra + p.amount);
  }

  return { byPerson, recurring, extra, total: round2(recurring + extra), fromFallback };
}

// ─── Projeção ───────────────────────────────────────────────────────────────────────────

/** Teto de meses simulados quando a projeção vai "até atingir a meta" */
export const MAX_PROJECTION_MONTHS = 600;

export interface ProjectionPoint {
  monthKey: string;
  contribution: number;
  yield: number;
  balance: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  /** Primeiro mês em que o saldo atinge a meta; null se não atinge no período simulado */
  reachedMonth: string | null;
  monthsToReach: number | null;
  /** A meta já estava atingida antes de projetar */
  alreadyReached: boolean;
  /** Projeção até atingir a meta e ela não é atingida (sem aportes planejados, ou além do teto) */
  unreachable: boolean;
  /** Aportes futuros previstos no período (até atingir, ou no horizonte) */
  totalContributions: number;
  totalYield: number;
  endBalance: number;
}

export interface ProjectionOptions {
  balance: number;
  target: number;
  /** Primeiro mês projetado (o mês seguinte ao atual) */
  fromMonth: string;
  /** Aporte previsto em cada mês */
  contributionFor: (month: string) => number;
  /** Rendimento mensal como fração (0,008 = 0,8% ao mês). 0 = sem rendimento */
  monthlyRate?: number;
  /** Meses a projetar; null = até atingir a meta */
  horizonMonths: number | null;
}

/** Cada mês: rendimento sobre o saldo anterior, depois o aporte do mês. Para ao atingir a meta quando o horizonte é "até atingir" */
export function projectGoal(opts: ProjectionOptions): ProjectionResult {
  const rate = Math.max(0, opts.monthlyRate ?? 0);
  const alreadyReached = opts.target > 0 && opts.balance >= opts.target;
  const limit = opts.horizonMonths ?? MAX_PROJECTION_MONTHS;
  const points: ProjectionPoint[] = [];
  let balance = opts.balance;
  let reachedMonth: string | null = null;
  let totalContributions = 0;
  let totalYield = 0;

  if (!alreadyReached || opts.horizonMonths !== null) {
    for (let i = 0; i < limit; i++) {
      const monthKey = addMonthsToKey(opts.fromMonth, i);
      const gain = balance > 0 ? round2(balance * rate) : 0;
      const contribution = Math.max(0, round2(opts.contributionFor(monthKey)));
      balance = round2(balance + gain + contribution);
      totalContributions = round2(totalContributions + contribution);
      totalYield = round2(totalYield + gain);
      points.push({ monthKey, contribution, yield: gain, balance });
      if (!alreadyReached && reachedMonth === null && opts.target > 0 && balance >= opts.target) {
        reachedMonth = monthKey;
        if (opts.horizonMonths === null) break;
      }
    }
  }

  return {
    points,
    reachedMonth,
    monthsToReach: reachedMonth ? monthDiff(addMonthsToKey(opts.fromMonth, -1), reachedMonth) : null,
    alreadyReached,
    unreachable: opts.horizonMonths === null && !alreadyReached && reachedMonth === null,
    totalContributions,
    totalYield,
    endBalance: balance,
  };
}

/** Aporte mensal constante para chegar à meta em `months` meses (aporte no fim do mês; rendimento sobre o saldo anterior) */
export function requiredMonthly(opts: { balance: number; target: number; months: number; monthlyRate?: number }): number {
  const { balance, target } = opts;
  const months = Math.floor(opts.months);
  if (target <= balance || months < 1) return 0;
  const rate = Math.max(0, opts.monthlyRate ?? 0);
  if (rate === 0) return round2((target - balance) / months);
  const growth = Math.pow(1 + rate, months);
  const payment = ((target - balance * growth) * rate) / (growth - 1);
  return Math.max(0, round2(payment));
}

/** Meses de aporte que restam até o prazo (contando o mês do prazo, sem o atual) */
export function monthsUntilDeadline(currentMonth: string, deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  return Math.max(0, monthDiff(currentMonth, deadline));
}

// ─── Evolução: real × planejado × projetado ─────────────────────────────────────────────

export interface SeriesPoint {
  monthKey: string;
  /** Saldo real no fim do mês (só até o mês atual) */
  real: number | null;
  /** O que o plano previa acumular até o mês (só no histórico) */
  planned: number | null;
  /** Saldo projetado (a partir do mês atual, ligado ao último saldo real) */
  projected: number | null;
}

/** Saldo real ao fim de cada mês, do primeiro lançamento até `upToMonth` */
export function monthlyBalances(entries: LedgerEntry[], initial: number, upToMonth: string): { monthKey: string; balance: number }[] {
  if (entries.length === 0) return [{ monthKey: upToMonth, balance: initial }];
  const first = entries[0].tx.monthKey;
  const start = first > upToMonth ? upToMonth : first;
  let i = 0;
  let balance = initial;
  return monthRange(start, upToMonth).map((monthKey) => {
    while (i < entries.length && entries[i].tx.monthKey <= monthKey) { balance = entries[i].balanceAfter; i++; }
    return { monthKey, balance };
  });
}

/** Série do gráfico: histórico real (com o plano como referência) e projeção ligada ao saldo de hoje */
export function buildSeries(opts: {
  entries: LedgerEntry[];
  initial: number;
  plans: ContributionPlan[];
  fallbackMonthly: number;
  currentMonth: string;
  projection: ProjectionResult | null;
}): SeriesPoint[] {
  const real = monthlyBalances(opts.entries, opts.initial, opts.currentMonth);
  let plannedAcc = opts.initial;
  const hasPlan = opts.plans.length > 0 || opts.fallbackMonthly > 0;
  const series: SeriesPoint[] = real.map(({ monthKey, balance }, idx) => {
    plannedAcc = round2(plannedAcc + plannedForMonth(opts.plans, monthKey, opts.fallbackMonthly).total);
    return {
      monthKey,
      real: balance,
      planned: hasPlan ? plannedAcc : null,
      projected: idx === real.length - 1 && opts.projection ? balance : null,
    };
  });
  for (const p of opts.projection?.points ?? []) {
    series.push({ monthKey: p.monthKey, real: null, planned: null, projected: p.balance });
  }
  return series;
}

// ─── Contribuições por pessoa ───────────────────────────────────────────────────────────

export interface PersonStat {
  person: string;
  contributed: number;
  withdrawn: number;
  /** contributed − withdrawn */
  net: number;
  /** Participação nos aportes (0–1) */
  share: number;
  count: number;
  /** Aportes marcados como fixos (recorrência "Fixo") */
  recurring: number;
  /** Aportes marcados como extraordinários (recorrência "Pontual") */
  extraordinary: number;
  /** Os demais aportes */
  eventual: number;
  byMonth: Record<string, number>;
}

/** Rendimentos não são de ninguém: ficam fora desta conta */
export function contributionsByPerson(entries: LedgerEntry[]): PersonStat[] {
  const map = new Map<string, PersonStat>();
  for (const e of entries) {
    if (e.kind === 'rendimento') continue;
    const stat = map.get(e.person) ?? { person: e.person, contributed: 0, withdrawn: 0, net: 0, share: 0, count: 0, recurring: 0, extraordinary: 0, eventual: 0, byMonth: {} };
    if (e.kind === 'aporte') {
      stat.contributed = round2(stat.contributed + e.signed);
      stat.count += 1;
      if (e.tx.recurrency === 'Fixo') stat.recurring = round2(stat.recurring + e.signed);
      else if (e.tx.recurrency === 'Pontual') stat.extraordinary = round2(stat.extraordinary + e.signed);
      else stat.eventual = round2(stat.eventual + e.signed);
      stat.byMonth[e.tx.monthKey] = round2((stat.byMonth[e.tx.monthKey] ?? 0) + e.signed);
    } else {
      stat.withdrawn = round2(stat.withdrawn + Math.abs(e.signed));
    }
    stat.net = round2(stat.contributed - stat.withdrawn);
    map.set(e.person, stat);
  }
  const all = [...map.values()];
  const total = all.reduce((s, p) => s + p.contributed, 0);
  for (const p of all) p.share = total > 0 ? p.contributed / total : 0;
  return all.sort((a, b) => b.contributed - a.contributed);
}

// ─── Análise de uma meta ────────────────────────────────────────────────────────────────

export type GoalStatus = 'completed' | 'paused' | 'on-track' | 'behind' | 'overdue' | 'no-forecast';

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  completed: 'Concluída',
  paused: 'Pausada',
  'on-track': 'No prazo',
  behind: 'Atrasada',
  overdue: 'Prazo vencido',
  'no-forecast': 'Sem previsão',
};

export interface GoalInput {
  id: string;
  name: string;
  current: number;
  target: number;
  monthlyPrediction: number;
  deadline?: string | null;
  /** % ao mês, como digitado (0,8 = 0,8%) */
  monthlyRate?: number | null;
  /** Meta pausada: não entra no planejado nem tem previsão de conclusão */
  paused?: boolean;
  /** Primeiro mês do aporte mensal planejado da meta ("YYYY-MM") */
  planStartMonth?: string | null;
}

export interface GoalAnalysis<T extends MovementLike = MovementLike> {
  goal: GoalInput;
  entries: LedgerEntry<T>[];
  totals: LedgerTotals;
  pct: number;
  remaining: number;
  /** Fração mensal efetiva (0 sem taxa configurada) */
  rate: number;
  plans: ContributionPlan[];
  plannedThisMonth: PlannedMonth;
  /** Projeção até atingir a meta, com o plano atual */
  projection: ProjectionResult;
  /** Aporte mensal necessário para cumprir o prazo; null sem prazo ou prazo vencido */
  requiredForDeadline: number | null;
  monthsLeft: number | null;
  /** Meses de atraso da projeção em relação ao prazo (>0 = atrasa); null sem prazo ou sem previsão */
  monthsLate: number | null;
  status: GoalStatus;
  persons: PersonStat[];
  /** Aportes e planos futuros previstos (mês seguinte ao atual em diante, até atingir a meta) */
  plannedFuture: number;
}

export const nextMonth = (month: string) => addMonthsToKey(month, 1);

export const FALLBACK_PLAN_PREFIX = 'fallback:';

/**
 * Meta sem plano recorrente por pessoa usa o aporte mensal dela como um plano único, que começa
 * em `planStartMonth` (ou já vale). Assim a data de início vale para todas as contas do motor.
 */
export function effectivePlans(plans: ContributionPlan[], goal: Pick<GoalInput, 'id' | 'monthlyPrediction' | 'planStartMonth'>): ContributionPlan[] {
  if (plans.some((p) => p.kind === 'recorrente') || !(goal.monthlyPrediction > 0)) return plans;
  return [...plans, {
    id: `${FALLBACK_PLAN_PREFIX}${goal.id}`, goalId: goal.id, person: FALLBACK_PERSON, amount: goal.monthlyPrediction,
    fromMonth: goal.planStartMonth || '0000-01', toMonth: null, kind: 'recorrente',
  }];
}
export const percentToRate = (percent: number | null | undefined) => (percent && percent > 0 ? percent / 100 : 0);

/** Projeção "padrão" de uma meta: plano atual, sem alterações */
export function planContribution(plans: ContributionPlan[], fallbackMonthly: number) {
  return (month: string) => plannedForMonth(plans, month, fallbackMonthly).total;
}

export function analyzeGoal<T extends MovementLike>(
  inputGoal: GoalInput,
  txs: T[],
  realPlans: ContributionPlan[],
  ctx: PersonContext,
  currentMonth: string,
): GoalAnalysis<T> {
  // o aporte mensal da meta vira plano; daqui para frente só `plans` (que inclui esse plano) importa
  const plans = effectivePlans(realPlans, inputGoal);
  const goal: GoalInput = { ...inputGoal, monthlyPrediction: 0 };
  const { entries, totals } = buildLedger(goal.current, txs, ctx);
  const rate = percentToRate(goal.monthlyRate);
  const contributionFor = planContribution(plans, goal.monthlyPrediction);
  const projection = projectGoal({ balance: totals.balance, target: goal.target, fromMonth: nextMonth(currentMonth), contributionFor, monthlyRate: rate, horizonMonths: null });
  const completed = goal.target > 0 && totals.balance >= goal.target;
  const paused = !!goal.paused && !completed;
  const monthsLeft = monthsUntilDeadline(currentMonth, goal.deadline);
  const requiredForDeadline = !completed && monthsLeft !== null && monthsLeft >= 1
    ? requiredMonthly({ balance: totals.balance, target: goal.target, months: monthsLeft, monthlyRate: rate })
    : null;
  const monthsLate = goal.deadline && projection.reachedMonth ? monthDiff(goal.deadline, projection.reachedMonth) : null;

  let status: GoalStatus;
  if (completed) status = 'completed';
  else if (paused) status = 'paused';
  else if (goal.deadline && goal.deadline < currentMonth) status = 'overdue';
  else if (monthsLate !== null && monthsLate > 0) status = 'behind';
  else if (projection.unreachable) status = 'no-forecast';
  else status = 'on-track';

  return {
    goal, entries, totals,
    pct: goal.target > 0 ? Math.min(100, (totals.balance / goal.target) * 100) : 0,
    remaining: round2(Math.max(0, goal.target - totals.balance)),
    rate, plans,
    plannedThisMonth: plannedForMonth(plans, currentMonth, goal.monthlyPrediction),
    projection, requiredForDeadline, monthsLeft, monthsLate, status,
    persons: contributionsByPerson(entries),
    plannedFuture: projection.totalContributions,
  };
}

// ─── Simulação e cenários ───────────────────────────────────────────────────────────────

/** Alterações temporárias do simulador; nada disso é gravado */
export interface SimulationOverrides {
  /** Aporte mensal total (substitui o recorrente do plano) */
  monthly?: number | null;
  /** Primeiro mês com aporte; antes dele, nenhum aporte */
  startMonth?: string | null;
  extraAmount?: number | null;
  extraMonth?: string | null;
  deadline?: string | null;
  /** % ao mês */
  monthlyRate?: number | null;
}

export interface SimulationResult {
  projection: ProjectionResult;
  deadline: string | null;
  monthsLate: number | null;
  requiredForDeadline: number | null;
}

export function simulateGoal(base: GoalAnalysis, currentMonth: string, o: SimulationOverrides, horizonMonths: number | null = null): SimulationResult {
  const contributionFor = (month: string) => {
    if (o.startMonth && month < o.startMonth) return 0;
    const planned = plannedForMonth(base.plans, month, base.goal.monthlyPrediction);
    const regular = o.monthly != null ? o.monthly : planned.recurring;
    const simExtra = o.extraAmount && o.extraMonth === month ? o.extraAmount : 0;
    return regular + planned.extra + simExtra;
  };
  const rate = o.monthlyRate != null ? percentToRate(o.monthlyRate) : base.rate;
  const projection = projectGoal({ balance: base.totals.balance, target: base.goal.target, fromMonth: nextMonth(currentMonth), contributionFor, monthlyRate: rate, horizonMonths });
  const deadline = o.deadline !== undefined ? o.deadline : base.goal.deadline ?? null;
  const monthsLeft = monthsUntilDeadline(currentMonth, deadline);
  return {
    projection,
    deadline,
    monthsLate: deadline && projection.reachedMonth ? monthDiff(deadline, projection.reachedMonth) : null,
    requiredForDeadline: monthsLeft !== null && monthsLeft >= 1 && base.totals.balance < base.goal.target
      ? requiredMonthly({ balance: base.totals.balance, target: base.goal.target, months: monthsLeft, monthlyRate: rate })
      : null,
  };
}

export interface ScenarioSpec {
  id: 'current' | 'conservative' | 'optimistic';
  label: string;
  /** Multiplica os aportes planejados (1 = como está) */
  contributionFactor: number;
  /** % ao mês; null = a taxa da meta (ou nenhuma, se a meta não tem) */
  monthlyRate: number | null;
}

/** Premissas visíveis e editáveis na tela: nada fica escondido */
export const DEFAULT_SCENARIOS: ScenarioSpec[] = [
  { id: 'current', label: 'Planejamento atual', contributionFactor: 1, monthlyRate: null },
  { id: 'conservative', label: 'Conservador', contributionFactor: 0.8, monthlyRate: null },
  { id: 'optimistic', label: 'Otimista', contributionFactor: 1.2, monthlyRate: null },
];

export function runScenario(base: GoalAnalysis, currentMonth: string, spec: ScenarioSpec, horizonMonths: number | null = null): ProjectionResult {
  const rate = spec.monthlyRate != null ? percentToRate(spec.monthlyRate) : base.rate;
  return projectGoal({
    balance: base.totals.balance,
    target: base.goal.target,
    fromMonth: nextMonth(currentMonth),
    contributionFor: (m) => plannedForMonth(base.plans, m, base.goal.monthlyPrediction).total * spec.contributionFactor,
    monthlyRate: rate,
    horizonMonths,
  });
}

// ─── Próximo aporte previsto ────────────────────────────────────────────────────────────

export interface NextContribution {
  monthKey: string;
  /** Quanto ainda falta aportar no mês (no mês atual, já descontado o que foi aportado) */
  amount: number;
}

/**
 * Primeiro mês, do atual em diante, em que ainda há aporte planejado a fazer. No mês atual vale só
 * o que falta do planejado; sem plano nos próximos 24 meses, devolve null.
 */
export function nextPlannedContribution(plans: ContributionPlan[], currentMonth: string, realizedThisMonth: number): NextContribution | null {
  for (let i = 0; i < 24; i++) {
    const monthKey = addMonthsToKey(currentMonth, i);
    const planned = plannedForMonth(plans, monthKey).total;
    const remaining = round2(i === 0 ? planned - Math.max(0, realizedThisMonth) : planned);
    if (remaining > 0.005) return { monthKey, amount: remaining };
  }
  return null;
}

// ─── Calendário de aportes ──────────────────────────────────────────────────────────────

export interface CalendarMonth {
  monthKey: string;
  total: number;
  recurring: number;
  extra: number;
  byGoal: { goalId: string; total: number; extra: number; byPerson: Record<string, number> }[];
  /** O total do mês difere do aporte padrão (primeiro mês do calendário) */
  differs: boolean;
}

/** Aportes planejados dos próximos meses, só das metas ainda não concluídas */
export function contributionCalendar(
  goals: { id: string; monthlyPrediction: number }[],
  plansByGoal: Map<string, ContributionPlan[]>,
  fromMonth: string,
  months: number,
): CalendarMonth[] {
  const rows = monthRange(fromMonth, addMonthsToKey(fromMonth, months - 1)).map((monthKey): CalendarMonth => {
    const byGoal: CalendarMonth['byGoal'] = [];
    let recurring = 0;
    let extra = 0;
    for (const g of goals) {
      const m = plannedForMonth(plansByGoal.get(g.id) ?? [], monthKey, g.monthlyPrediction);
      if (m.total <= 0) continue;
      byGoal.push({ goalId: g.id, total: m.total, extra: m.extra, byPerson: m.byPerson });
      recurring = round2(recurring + m.recurring);
      extra = round2(extra + m.extra);
    }
    return { monthKey, total: round2(recurring + extra), recurring, extra, byGoal, differs: false };
  });
  const standard = rows[0]?.recurring ?? 0;
  for (const r of rows) r.differs = r.extra > 0 || (rows[0] !== r && r.recurring !== standard);
  return rows;
}

// ─── Pendências ─────────────────────────────────────────────────────────────────────────

export interface PendingSummary {
  toReceive: number;
  toPay: number;
  openCount: number;
  doneCount: number;
  /** Abertas com data prevista anterior a hoje */
  overdueCount: number;
}

/** Só pendências em aberto somam; nunca entram no saldo de meta nenhuma */
export function summarizePending(pending: Pick<Pending, 'amount' | 'status' | 'dueDate'>[], today: string): PendingSummary {
  const open = pending.filter((p) => p.status !== 'done');
  return {
    toReceive: round2(open.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0)),
    toPay: round2(open.filter((p) => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0)),
    openCount: open.length,
    doneCount: pending.length - open.length,
    overdueCount: open.filter((p) => p.dueDate && p.dueDate.slice(0, 10) < today).length,
  };
}

// ─── Resumo consolidado ─────────────────────────────────────────────────────────────────

export interface GoalsSummary {
  activeCount: number;
  completedCount: number;
  pausedCount: number;
  /** Saldo acumulado de todas as metas */
  accumulated: number;
  /** Soma dos valores-alvo */
  targetTotal: number;
  /** Percentual consolidado (limitado a 100% por meta, para uma meta concluída não esconder as outras) */
  pct: number;
  contributed: number;
  yield: number;
  withdrawn: number;
  initial: number;
  /** Aporte planejado para o mês atual (todas as metas ativas) */
  plannedThisMonth: number;
  /** Aportes futuros planejados até as metas serem atingidas */
  plannedFuture: number;
}

export function summarizeGoals(analyses: GoalAnalysis[]): GoalsSummary {
  const done = (a: GoalAnalysis) => a.status === 'completed' || a.status === 'paused';
  const sum = (pick: (a: GoalAnalysis) => number, list = analyses) => round2(list.reduce((s, a) => s + pick(a), 0));
  const active = analyses.filter((a) => !done(a));
  const targetTotal = sum((a) => a.goal.target);
  return {
    activeCount: active.length,
    completedCount: analyses.filter((a) => a.status === 'completed').length,
    pausedCount: analyses.filter((a) => a.status === 'paused').length,
    accumulated: sum((a) => a.totals.balance),
    targetTotal,
    pct: targetTotal > 0 ? (sum((a) => Math.min(a.totals.balance, a.goal.target)) / targetTotal) * 100 : 0,
    contributed: sum((a) => a.totals.contributed),
    yield: sum((a) => a.totals.yield),
    withdrawn: sum((a) => a.totals.withdrawn),
    initial: sum((a) => a.totals.initial),
    plannedThisMonth: sum((a) => a.plannedThisMonth.total, active),
    plannedFuture: sum((a) => a.plannedFuture, active.filter((a) => !a.projection.unreachable)),
  };
}

// ─── Insights ───────────────────────────────────────────────────────────────────────────

export type InsightTone = 'positive' | 'risk' | 'info';

export interface GoalInsight {
  id: string;
  goalId: string;
  title: string;
  description: string;
  tone: InsightTone;
  /** Ordem de exibição: maior primeiro */
  weight: number;
}

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const monthLong = (key: string) => `${MONTHS_PT[Number(key.split('-')[1]) - 1]} de ${key.split('-')[0]}`;

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const pct1 = (v: number) => `${v.toFixed(v >= 10 ? 0 : 1).replace('.', ',')}%`;
const MILESTONES = [25, 50, 75, 100];

/** Leituras de uma meta, todas calculadas dos dados; previsões saem como previsões, nunca como garantia */
export function goalInsights(a: GoalAnalysis, currentMonth: string): GoalInsight[] {
  const out: GoalInsight[] = [];
  const g = a.goal;
  const add = (i: Omit<GoalInsight, 'goalId'>) => out.push({ ...i, goalId: g.id });

  if (g.target <= 0) return out;

  if (a.status === 'completed') {
    add({ id: `${g.id}:done`, title: 'Meta concluída', tone: 'positive', weight: 100, description: `${g.name} atingiu ${brl(a.totals.balance)} de ${brl(g.target)}.` });
    return out;
  }

  const milestone = [...MILESTONES].reverse().find((m) => a.pct >= m);
  if (milestone) {
    add({ id: `${g.id}:milestone`, title: milestone >= 50 ? 'Conquista' : 'Evolução', tone: 'positive', weight: 40 + milestone / 10,
      description: milestone >= 50 ? `Você já passou de ${milestone}% do valor necessário para ${g.name} (${pct1(a.pct)}).` : `Você já atingiu ${pct1(a.pct)} de ${g.name}.` });
  } else if (a.pct > 0) {
    add({ id: `${g.id}:progress`, title: 'Evolução', tone: 'info', weight: 30, description: `Você já atingiu ${pct1(a.pct)} de ${g.name}: faltam ${brl(a.remaining)}.` });
  }

  if (a.projection.reachedMonth) {
    add({ id: `${g.id}:forecast`, title: 'Projeção', tone: 'info', weight: 70,
      description: `Mantendo o plano atual${a.rate > 0 ? ` e o rendimento de ${String(g.monthlyRate).replace('.', ',')}% ao mês` : ' (sem rendimentos)'}, a previsão é alcançar ${g.name} em ${monthLong(a.projection.reachedMonth)}. É uma estimativa, não uma garantia.` });
  } else if (a.projection.unreachable) {
    add({ id: `${g.id}:noforecast`, title: 'Sem previsão', tone: 'risk', weight: 80,
      description: `Não há aportes planejados para ${g.name}, então não é possível estimar quando ela será atingida.` });
  }

  if (g.deadline) {
    if (a.status === 'overdue') {
      add({ id: `${g.id}:overdue`, title: 'Prazo vencido', tone: 'risk', weight: 95, description: `O prazo de ${g.name} (${monthLong(g.deadline)}) passou e ainda faltam ${brl(a.remaining)}.` });
    } else if (a.monthsLate !== null && a.monthsLate > 0) {
      add({ id: `${g.id}:late`, title: 'Atraso previsto', tone: 'risk', weight: 90,
        description: `No ritmo atual, ${g.name} termina ${a.monthsLate} ${a.monthsLate === 1 ? 'mês' : 'meses'} depois do prazo (${monthLong(g.deadline)})${a.requiredForDeadline ? `. Para cumpri-lo seriam ${brl(a.requiredForDeadline)} por mês` : ''}.` });
    } else if (a.monthsLate !== null && a.monthsLate < 0) {
      add({ id: `${g.id}:early`, title: 'Dentro do prazo', tone: 'positive', weight: 50,
        description: `No ritmo atual, ${g.name} fica pronta ${Math.abs(a.monthsLate)} ${Math.abs(a.monthsLate) === 1 ? 'mês' : 'meses'} antes do prazo.` });
    }
  }

  // Quanto aumentar o aporte para terminar 2 meses antes
  if (a.projection.monthsToReach && a.projection.monthsToReach > 3) {
    const months = a.projection.monthsToReach - 2;
    const need = requiredMonthly({ balance: a.totals.balance, target: g.target, months, monthlyRate: a.rate });
    const planned = plannedForMonth(a.plans, nextMonth(currentMonth), g.monthlyPrediction).total;
    if (need > planned + 0.5) {
      add({ id: `${g.id}:faster`, title: 'Planejamento', tone: 'info', weight: 45,
        description: `Para atingir ${g.name} dois meses antes, seria necessário aumentar o aporte mensal em ${brl(need - planned)} (de ${brl(planned)} para ${brl(need)}).` });
    }
  }

  // Desvio do mês: o realizado até agora contra o planejado
  const plannedNow = a.plannedThisMonth.total;
  if (plannedNow > 0) {
    const realized = round2(a.entries.filter((e) => e.kind === 'aporte' && e.tx.monthKey === currentMonth).reduce((s, e) => s + e.signed, 0));
    if (realized < plannedNow - 0.5) {
      add({ id: `${g.id}:gap`, title: 'Desvio do mês', tone: 'risk', weight: 60,
        description: `Neste mês, o aporte realizado em ${g.name} está ${brl(plannedNow - realized)} abaixo do planejado (${brl(realized)} de ${brl(plannedNow)}).` });
    }
  }

  // Participação de cada pessoa (só com mais de uma)
  if (a.persons.length > 1) {
    const text = a.persons.map((p) => `${p.person} ${pct1(p.share * 100)}`).join(', ');
    add({ id: `${g.id}:persons`, title: 'Contribuições', tone: 'info', weight: 35, description: `Participação nos aportes de ${g.name}: ${text}.` });
  }

  return out.sort((x, y) => y.weight - x.weight);
}
