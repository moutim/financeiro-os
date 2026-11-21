import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ContributionPlan } from './types.ts';
import {
  effectivePlans, analyzeGoal, buildLedger, buildSeries, contributionCalendar, contributionsByPerson, goalInsights, plannedForMonth,
  projectGoal, requiredMonthly, runScenario, simulateGoal, summarizeGoals, summarizePending, DEFAULT_SCENARIOS,
  type GoalInput, type MovementLike,
} from './goalPlanning.ts';

const NOW = '2026-11';
let seq = 0;
const tx = (p: Partial<MovementLike> & Pick<MovementLike, 'amount' | 'monthKey'>): MovementLike => ({ id: `t${++seq}`, name: 'Aporte', ...p });
const goal = (p: Partial<GoalInput> = {}): GoalInput => ({ id: 'g1', name: 'Reserva', current: 0, target: 10000, monthlyPrediction: 0, ...p });
const plan = (p: Partial<ContributionPlan> & Pick<ContributionPlan, 'person' | 'amount' | 'fromMonth'>): ContributionPlan =>
  ({ id: `p${++seq}`, goalId: 'g1', kind: 'recorrente', toMonth: null, ...p });
const solo = { collaborative: false };
const shared = { collaborative: true, myName: 'Vitor Silva' };

describe('meta individual', () => {
  it('saldo = saldo inicial + aportes, sem somar o histórico duas vezes', () => {
    const { totals, entries } = buildLedger(1000, [tx({ amount: 500, monthKey: '2026-09' }), tx({ amount: 700, monthKey: '2026-10' })], solo);
    assert.equal(totals.balance, 2200);
    assert.equal(totals.initial, 1000);
    assert.equal(totals.contributed, 1200);
    assert.deepEqual(entries.map((e) => e.balanceAfter), [1500, 2200]);
  });

  it('o saldo após cada movimentação acompanha a ordem das datas', () => {
    const { entries } = buildLedger(0, [tx({ amount: 200, monthKey: '2026-10', date: '2026-10-20' }), tx({ amount: 100, monthKey: '2026-10', date: '2026-10-05' })], solo);
    assert.deepEqual(entries.map((e) => e.tx.amount), [100, 200]);
    assert.equal(entries[1].balanceAfter, 300);
  });
});

describe('meta compartilhada', () => {
  const txs = [
    tx({ amount: 2500, monthKey: '2026-10', author: null }),                       // meu lançamento (sem autor)
    tx({ amount: 3500, monthKey: '2026-10', author: 'Camile Souza', parentId: 'SHARED' }),
    tx({ amount: 1000, monthKey: '2026-11', parentId: 'SHARED' }),                 // cópia antiga, sem autor
  ];
  it('separa a origem de cada aporte e calcula a participação', () => {
    const persons = contributionsByPerson(buildLedger(0, txs, shared).entries);
    assert.deepEqual(persons.map((p) => p.person), ['Camile', 'Você', 'Convidado']);
    assert.equal(persons[0].contributed, 3500);
    assert.equal(Math.round(persons.reduce((s, p) => s + p.share, 0) * 100), 100);
    assert.equal(Math.round(persons[1].share * 1000), 357); // 2500 de 7000
  });
  it('meta de uma pessoa só não separa por autor', () => {
    const persons = contributionsByPerson(buildLedger(0, txs, solo).entries);
    assert.equal(persons.length, 1);
    assert.equal(persons[0].person, 'Você');
  });
  it('diferencia aporte recorrente (fixo) de eventual', () => {
    const p = contributionsByPerson(buildLedger(0, [tx({ amount: 300, monthKey: '2026-10', recurrency: 'Fixo' }), tx({ amount: 100, monthKey: '2026-10' })], solo).entries)[0];
    assert.equal(p.recurring, 300);
    assert.equal(p.eventual, 100);
  });
});

describe('alteração dos aportes mensais', () => {
  const plans = [
    plan({ person: 'Vitor', amount: 2500, fromMonth: '2026-06' }),
    plan({ person: 'Camile', amount: 3500, fromMonth: '2026-06' }),
    plan({ person: 'Vitor', amount: 3000, fromMonth: '2027-01' }),   // nova versão do Vitor
  ];
  it('soma por pessoa e preserva a origem', () => {
    const m = plannedForMonth(plans, '2026-11');
    assert.equal(m.total, 6000);
    assert.deepEqual(m.byPerson, { Vitor: 2500, Camile: 3500 });
  });
  it('a versão mais recente vale a partir do mês em que começa', () => {
    assert.equal(plannedForMonth(plans, '2026-12').total, 6000);
    assert.equal(plannedForMonth(plans, '2027-01').total, 6500);
    assert.equal(plannedForMonth(plans, '2027-06').byPerson.Vitor, 3000);
  });
  it('respeita data de término e não assume aportes iguais para sempre', () => {
    const ended = [plan({ person: 'Vitor', amount: 500, fromMonth: '2026-01', toMonth: '2026-12' })];
    assert.equal(plannedForMonth(ended, '2026-12').total, 500);
    assert.equal(plannedForMonth(ended, '2027-01').total, 0);
  });
  it('sem plano por pessoa usa o aporte mensal da meta', () => {
    const m = plannedForMonth([], '2026-12', 800);
    assert.equal(m.total, 800);
    assert.equal(m.fromFallback, true);
    assert.equal(plannedForMonth([], '2026-12', 0).total, 0);
  });
});

describe('aportes extraordinários', () => {
  const plans = [plan({ person: 'Camile', amount: 1000, fromMonth: '2027-03' }), plan({ person: 'Camile', amount: 5000, fromMonth: '2027-03', toMonth: '2027-03', kind: 'extraordinario' })];
  it('entram só no mês previsto, separados do recorrente', () => {
    const m = plannedForMonth(plans, '2027-03');
    assert.equal(m.recurring, 1000);
    assert.equal(m.extra, 5000);
    assert.equal(plannedForMonth(plans, '2027-04').extra, 0);
  });
  it('antecipam a conclusão na projeção', () => {
    const base = goal({ target: 8000 });
    const without = analyzeGoal(base, [], [plans[0]], solo, NOW).projection.reachedMonth;
    const withExtra = analyzeGoal(base, [], plans, solo, NOW).projection.reachedMonth;
    assert.ok(withExtra! < without!);
  });
});

describe('resgates', () => {
  it('subtraem do saldo, mesmo com valor positivo, e não contam como aporte', () => {
    const { totals } = buildLedger(0, [
      tx({ amount: 1000, monthKey: '2026-09' }),
      tx({ amount: 300, monthKey: '2026-10', operation: 'Resgate' }),
      tx({ amount: -100, monthKey: '2026-10' }),
    ], solo);
    assert.equal(totals.contributed, 1000);
    assert.equal(totals.withdrawn, 400);
    assert.equal(totals.balance, 600);
  });
  it('contam no total por pessoa como retirada', () => {
    const p = contributionsByPerson(buildLedger(0, [tx({ amount: 1000, monthKey: '2026-09' }), tx({ amount: 300, monthKey: '2026-10', operation: 'Resgate' })], solo).entries)[0];
    assert.equal(p.net, 700);
    assert.equal(p.withdrawn, 300);
  });
});

describe('rendimentos', () => {
  it('somam ao saldo mas não são contribuição de ninguém', () => {
    const { entries, totals } = buildLedger(0, [tx({ amount: 1000, monthKey: '2026-09' }), tx({ amount: 12.5, monthKey: '2026-10', operation: 'Rendimento' })], solo);
    assert.equal(totals.balance, 1012.5);
    assert.equal(totals.yield, 12.5);
    assert.equal(totals.contributed, 1000);
    assert.equal(contributionsByPerson(entries)[0].contributed, 1000);
  });
  it('projeção com taxa: rendimento sobre o saldo anterior, depois o aporte', () => {
    const r = projectGoal({ balance: 1000, target: 5000, fromMonth: '2026-12', contributionFor: () => 100, monthlyRate: 0.01, horizonMonths: 2 });
    assert.deepEqual(r.points.map((p) => [p.yield, p.balance]), [[10, 1110], [11.1, 1221.1]]);
    assert.equal(r.totalYield, 21.1);
  });
});

describe('projeção sem rendimentos', () => {
  it('sem taxa configurada não há rendimento algum', () => {
    const a = analyzeGoal(goal({ current: 1000, target: 3000, monthlyPrediction: 500 }), [], [], solo, NOW);
    assert.equal(a.rate, 0);
    assert.equal(a.projection.totalYield, 0);
    assert.equal(a.projection.reachedMonth, '2027-03');   // 1000 + 500 em dez, jan, fev e mar = 3000
  });
  it('sem aportes planejados a meta não tem previsão', () => {
    const a = analyzeGoal(goal({ current: 1000 }), [], [], solo, NOW);
    assert.equal(a.projection.unreachable, true);
    assert.equal(a.status, 'no-forecast');
  });
});

describe('alteração do prazo', () => {
  const base = analyzeGoal(goal({ current: 2000, target: 8000, monthlyPrediction: 500, deadline: '2027-06' }), [], [], solo, NOW);
  it('calcula o aporte mensal necessário para o prazo', () => {
    assert.equal(base.monthsLeft, 7);
    assert.equal(base.requiredForDeadline, 857.14);
    assert.equal(requiredMonthly({ balance: 2000, target: 8000, months: 12 }), 500);
  });
  it('indica atraso quando a projeção passa do prazo', () => {
    assert.equal(base.projection.reachedMonth, '2027-11');
    assert.equal(base.monthsLate, 5);
    assert.equal(base.status, 'behind');
  });
  it('mudar o prazo no simulador muda o diagnóstico sem alterar a meta', () => {
    const sim = simulateGoal(base, NOW, { deadline: '2027-12' });
    assert.equal(sim.monthsLate, -1);
    assert.equal(base.goal.deadline, '2027-06');
  });
  it('prazo vencido', () => {
    assert.equal(analyzeGoal(goal({ target: 5000, monthlyPrediction: 100, deadline: '2026-08' }), [], [], solo, NOW).status, 'overdue');
  });
  it('rendimento reduz o aporte necessário', () => {
    assert.ok(requiredMonthly({ balance: 2000, target: 8000, months: 12, monthlyRate: 0.01 }) < 500);
  });
});

describe('conclusão de uma meta', () => {
  const done = analyzeGoal(goal({ current: 9000, target: 10000 }), [tx({ amount: 1500, monthKey: '2026-10' })], [], solo, NOW);
  it('fica concluída ao atingir o valor-alvo e o percentual não passa de 100', () => {
    assert.equal(done.status, 'completed');
    assert.equal(done.pct, 100);
    assert.equal(done.remaining, 0);
    assert.equal(done.projection.alreadyReached, true);
    assert.equal(done.projection.points.length, 0);
  });
  it('o resumo separa ativas de concluídas', () => {
    const active = analyzeGoal(goal({ id: 'g2', current: 1000, target: 5000, monthlyPrediction: 500 }), [], [], solo, NOW);
    const s = summarizeGoals([done, active]);
    assert.equal(s.completedCount, 1);
    assert.equal(s.activeCount, 1);
    assert.equal(s.accumulated, 11500);
    assert.equal(s.plannedThisMonth, 500);              // só metas ativas
    assert.equal(Math.round(s.pct), 73);                // (10000 + 1000) / 15000, sem o excedente da concluída
  });
  it('insight de conquista na conclusão', () => {
    assert.equal(goalInsights(done, NOW)[0].title, 'Meta concluída');
  });
});

describe('pendências', () => {
  const pending = [
    { amount: -500, status: 'open' as const, dueDate: '2026-10-01' },
    { amount: 1200, status: 'open' as const, dueDate: '2026-12-01' },
    { amount: 300, status: 'done' as const, dueDate: null },
    { amount: -80, status: null, dueDate: null },
  ];
  it('a pagar e a receber somam só o que está em aberto', () => {
    const s = summarizePending(pending, '2026-11-21');
    assert.equal(s.toPay, 580);
    assert.equal(s.toReceive, 1200);
    assert.equal(s.doneCount, 1);
    assert.equal(s.overdueCount, 1);
  });
  it('não entram no saldo da meta: só a movimentação lançada muda o saldo', () => {
    const before = analyzeGoal(goal({ current: 1000 }), [], [], solo, NOW).totals.balance;
    summarizePending(pending, '2026-11-21');
    assert.equal(before, 1000);
    const after = analyzeGoal(goal({ current: 1000 }), [tx({ amount: 1200, monthKey: '2026-11' })], [], solo, NOW).totals.balance;
    assert.equal(after, 2200);
  });
});

describe('simulação e cenários', () => {
  const base = analyzeGoal(goal({ current: 1000, target: 4000, monthlyPrediction: 500 }), [], [], solo, NOW);
  it('simular não altera a análise original', () => {
    const before = base.projection.reachedMonth;
    simulateGoal(base, NOW, { monthly: 1500, extraAmount: 1000, extraMonth: '2026-12' });
    assert.equal(base.projection.reachedMonth, before);
  });
  it('mais aporte e aporte extraordinário antecipam a conclusão', () => {
    const faster = simulateGoal(base, NOW, { monthly: 1000 });
    assert.ok(faster.projection.reachedMonth! < base.projection.reachedMonth!);
    const extra = simulateGoal(base, NOW, { extraAmount: 2000, extraMonth: '2026-12' });
    assert.ok(extra.projection.reachedMonth! < base.projection.reachedMonth!);
  });
  it('data de início adia os aportes', () => {
    const late = simulateGoal(base, NOW, { startMonth: '2027-03' });
    assert.ok(late.projection.reachedMonth! > base.projection.reachedMonth!);
    assert.equal(late.projection.points[0].contribution, 0);
  });
  it('cenários usam premissas visíveis: conservador atrasa e otimista antecipa', () => {
    const [cur, cons, opt] = DEFAULT_SCENARIOS.map((s) => runScenario(base, NOW, s).reachedMonth!);
    assert.ok(cons > cur && opt < cur);
    assert.equal(DEFAULT_SCENARIOS[1].contributionFactor, 0.8);
  });
  it('taxa de rendimento do cenário só vale quando informada', () => {
    const noRate = runScenario(base, NOW, DEFAULT_SCENARIOS[0]).totalYield;
    const withRate = runScenario(base, NOW, { ...DEFAULT_SCENARIOS[0], monthlyRate: 1 }).totalYield;
    assert.equal(noRate, 0);
    assert.ok(withRate > 0);
  });
});

describe('dupla contagem', () => {
  it('saldo inicial + movimentos: o histórico não é somado de novo ao total já registrado', () => {
    const txs = [tx({ amount: 500, monthKey: '2026-10' }), tx({ amount: 500, monthKey: '2026-11' })];
    const a = analyzeGoal(goal({ current: 2000 }), txs, [], solo, NOW);
    assert.equal(a.totals.balance, 3000);
    assert.equal(a.totals.initial + a.totals.contributed + a.totals.yield - a.totals.withdrawn, a.totals.balance);
  });
  it('a série real termina exatamente no saldo e a projeção parte dele', () => {
    const a = analyzeGoal(goal({ current: 100, target: 1000, monthlyPrediction: 200 }), [tx({ amount: 50, monthKey: '2026-10' })], [], solo, NOW);
    const series = buildSeries({ entries: a.entries, initial: 100, plans: [], fallbackMonthly: 200, currentMonth: NOW, projection: a.projection });
    const lastReal = [...series].reverse().find((p) => p.real !== null)!;
    assert.equal(lastReal.real, a.totals.balance);
    assert.equal(lastReal.projected, a.totals.balance);
    assert.equal(series[series.length - 1].monthKey, a.projection.reachedMonth);
  });
});

describe('calendário de aportes', () => {
  it('destaca os meses diferentes do padrão e soma o total mensal', () => {
    const plans = new Map([['g1', [
      plan({ person: 'Vitor', amount: 2500, fromMonth: '2026-11' }), plan({ person: 'Camile', amount: 3500, fromMonth: '2026-11' }),
      plan({ person: 'Camile', amount: 4000, fromMonth: '2027-03', toMonth: '2027-03', kind: 'extraordinario' }),
    ]]]);
    const cal = contributionCalendar([{ id: 'g1', monthlyPrediction: 0 }], plans, '2026-11', 5);
    assert.deepEqual(cal.map((m) => m.total), [6000, 6000, 6000, 6000, 10000]);
    assert.deepEqual(cal.map((m) => m.differs), [false, false, false, false, true]);
    assert.equal(cal[4].extra, 4000);
  });
});

describe('insights', () => {
  it('projeção, desvio do mês e aporte para terminar antes, com números reais', () => {
    const a = analyzeGoal(goal({ current: 1000, target: 10000, monthlyPrediction: 500 }), [tx({ amount: 200, monthKey: NOW })], [], solo, NOW);
    const ins = goalInsights(a, NOW);
    assert.ok(ins.some((i) => i.id === 'g1:forecast' && /estimativa/.test(i.description)));
    assert.ok(ins.find((i) => i.id === 'g1:gap')!.description.includes('300,00'));
    assert.ok(ins.some((i) => i.id === 'g1:faster'));
  });
  it('sem aportes planejados avisa que não há previsão', () => {
    const a = analyzeGoal(goal({ current: 100 }), [], [], solo, NOW);
    assert.ok(goalInsights(a, NOW).some((i) => i.title === 'Sem previsão'));
  });
});

describe('pausa, data de início e aportes extraordinários realizados', () => {
  it('meta pausada não tem previsão nem entra nas metas ativas', () => {
    const paused = analyzeGoal(goal({ current: 1000, target: 5000, monthlyPrediction: 500, paused: true }), [], [], solo, NOW);
    assert.equal(paused.status, 'paused');
    const active = analyzeGoal(goal({ id: 'g2', current: 1000, target: 5000, monthlyPrediction: 500 }), [], [], solo, NOW);
    const s = summarizeGoals([paused, active]);
    assert.equal(s.activeCount, 1);
    assert.equal(s.pausedCount, 1);
    assert.equal(s.plannedThisMonth, 500);
  });
  it('meta concluída nunca aparece como pausada', () => {
    assert.equal(analyzeGoal(goal({ current: 9000, target: 5000, paused: true }), [], [], solo, NOW).status, 'completed');
  });
  it('o aporte mensal da meta só vale a partir da data de início', () => {
    const a = analyzeGoal(goal({ current: 0, target: 3000, monthlyPrediction: 1000, planStartMonth: '2027-02' }), [], [], solo, NOW);
    assert.equal(plannedForMonth(a.plans, '2027-01').total, 0);
    assert.equal(plannedForMonth(a.plans, '2027-02').total, 1000);
    assert.equal(a.projection.reachedMonth, '2027-04');
    assert.equal(a.plannedThisMonth.total, 0);
  });
  it('plano por pessoa dispensa o aporte mensal da meta (sem contar duas vezes)', () => {
    const plans = [plan({ person: 'Vitor', amount: 700, fromMonth: '2026-01' })];
    assert.equal(effectivePlans(plans, { id: 'g1', monthlyPrediction: 5000, planStartMonth: null }).length, 1);
    assert.equal(analyzeGoal(goal({ monthlyPrediction: 5000 }), [], plans, solo, NOW).plannedThisMonth.total, 700);
  });
  it('aporte marcado como pontual conta como extraordinário', () => {
    const p = contributionsByPerson(buildLedger(0, [
      tx({ amount: 300, monthKey: '2026-10', recurrency: 'Fixo' }),
      tx({ amount: 1000, monthKey: '2026-10', recurrency: 'Pontual' }),
      tx({ amount: 50, monthKey: '2026-10' }),
    ], solo).entries)[0];
    assert.deepEqual([p.recurring, p.extraordinary, p.eventual], [300, 1000, 50]);
  });
});
