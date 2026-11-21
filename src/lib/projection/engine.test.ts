import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Income, Transaction } from '../types.ts';
import {
  buildMonthlyProjection,
  classifyCommitment,
  compareScenario,
  extractInstallmentPlans,
  firstInstallmentMonth,
  releaseSchedule,
  simulationTransactions,
  summarizeHistory,
  summarizeProjection,
  type ProjectionInput,
} from './engine.ts';
import { generateInsights } from './insights.ts';

// ─── Fábricas ───────────────────────────────────────────────────────────────────────────

let seq = 0;
const tx = (p: Partial<Transaction> & Pick<Transaction, 'name' | 'amount' | 'monthKey'>): Transaction => ({
  id: `t${++seq}`,
  category: 'Compras e bens',
  transactionType: 'expense',
  isPaid: false,
  ...p,
});
const salary = (monthKey: string, amount: number): Income => ({ id: `i${++seq}`, name: 'Salário', amount, monthKey, isRecurring: true });

/** Compra parcelada como o app grava: uma linha por mês, "k/n" */
const installmentPurchase = (name: string, total: number, n: number, firstMonth: string, extra: Partial<Transaction> = {}, paid = 0): Transaction[] => {
  const rest = Math.floor((total / n) * 100) / 100;
  const first = Math.round((total - rest * (n - 1)) * 100) / 100;
  return Array.from({ length: n }, (_, i) => tx({
    name, amount: i === 0 ? first : rest, installments: `${i + 1}/${n}`,
    monthKey: shift(firstMonth, i), isPaid: i < paid, ...extra,
  }));
};
const shift = (mk: string, add: number) => {
  const [y, m] = mk.split('-').map(Number);
  const t = y * 12 + m - 1 + add;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

const NOW = '2026-11';
const input = (transactions: Transaction[], incomes: Income[], start = '2026-11', end = '2027-04'): ProjectionInput => ({
  transactions, incomes, currentMonthKey: NOW, startMonthKey: start, endMonthKey: end,
});
const month = (list: ReturnType<typeof buildMonthlyProjection>, key: string) => list.find((m) => m.monthKey === key)!;

// ─── 1. Compra parcelada em vários meses ────────────────────────────────────────────────

describe('compra parcelada', () => {
  it('distribui R$ 1.200 em 12x de R$ 100, sem jogar o total no primeiro mês', () => {
    const txs = installmentPurchase('Notebook', 1200, 12, '2026-11');
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)], '2026-11', '2027-10'));
    assert.equal(months.length, 12);
    for (const m of months) assert.equal(m.installments, 100);
    assert.equal(month(months, '2026-11').committed, 100);
    assert.equal(month(months, '2027-10').committed, 100);
  });

  it('a primeira parcela absorve a sobra dos centavos e a soma fecha o total', () => {
    const txs = installmentPurchase('TV', 599.9, 6, '2026-11');
    const plan = extractInstallmentPlans(txs)[0];
    assert.equal(plan.rows[0].amount, 100);
    assert.equal(plan.installmentAmount, 99.98);
    assert.equal(plan.totalValue, 599.9);
  });
});

// ─── 2. Parcelas já pagas ───────────────────────────────────────────────────────────────

describe('parcelas pagas e futuras', () => {
  it('separa pagas das restantes e calcula o valor ainda comprometido', () => {
    // 3/10 em 2026-11: parcelas 1 e 2 (set e out) pagas
    const txs = installmentPurchase('Móveis', 1000, 10, '2026-09', {}, 2);
    const plan = extractInstallmentPlans(txs)[0];
    assert.equal(plan.paidCount, 2);
    assert.equal(plan.remainingCount, 8);
    assert.equal(plan.remainingValue, 800);
    assert.equal(plan.firstMonth, '2026-09');
    assert.equal(plan.lastMonth, '2027-06');
  });

  it('meses passados são realizados e entram no histórico, sem estimativa', () => {
    const txs = installmentPurchase('Móveis', 1000, 10, '2026-09', {}, 2);
    const incomes = [salary('2026-09', 4000), salary('2026-10', 4000), salary('2026-11', 4000)];
    const months = buildMonthlyProjection(input(txs, incomes, '2026-09', '2026-12'));
    assert.equal(month(months, '2026-09').phase, 'past');
    assert.equal(month(months, '2026-09').basis, 'realized');
    assert.equal(month(months, '2026-11').phase, 'current');
    assert.equal(summarizeHistory(months).points.length, 2);
    assert.equal(summarizeHistory(months).sufficient, false);
  });
});

// ─── 3. Encerramento de parcelas ────────────────────────────────────────────────────────

describe('encerramento de parcelas', () => {
  it('libera o valor no mês seguinte ao da última parcela', () => {
    // parcela de 300 que termina em fev/27
    const txs = installmentPurchase('Sofá', 1200, 4, '2026-11', {}, 0)
      .map((t) => ({ ...t, amount: 300 }));
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)], '2026-11', '2027-04'));
    assert.equal(month(months, '2027-02').installments, 300);
    assert.equal(month(months, '2027-03').installments, 0);
    assert.equal(month(months, '2027-03').committed, month(months, '2027-02').committed - 300);

    const plans = extractInstallmentPlans(txs);
    const events = releaseSchedule(plans, '2026-11', '2027-06');
    assert.equal(events.length, 1);
    assert.equal(events[0].monthKey, '2027-03');
    assert.equal(events[0].monthlyRelease, 300);
  });

  it('resume compras encerradas e valor liberado no período', () => {
    const txs = [
      ...installmentPurchase('A', 600, 3, '2026-11').map((t) => ({ ...t, amount: 200 })),
      ...installmentPurchase('B', 900, 3, '2026-11').map((t) => ({ ...t, amount: 300 })),
    ];
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)]));
    const stats = summarizeProjection(months, extractInstallmentPlans(txs), NOW);
    assert.equal(stats.endingPlans, 2);
    assert.equal(stats.monthlyReleased, 500);
  });
});

// ─── 4. Compra à vista ──────────────────────────────────────────────────────────────────

describe('compra à vista', () => {
  it('entra integralmente no mês e não é distribuída', () => {
    const txs = [tx({ name: 'Fogão', amount: 1500, monthKey: '2026-12' })];
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)]));
    assert.equal(month(months, '2026-12').other, 1500);
    assert.equal(month(months, '2027-01').other, 0);
    assert.equal(month(months, '2026-12').installments, 0);
  });
});

// ─── 5 e 6. Faturas e cartões ───────────────────────────────────────────────────────────

describe('faturas', () => {
  it('a fatura é só o agrupamento por cartão: compras abertas e fechadas somam uma vez', () => {
    const txs = [
      tx({ name: 'Mercado', amount: 400, monthKey: '2026-11', cardId: 'nu', isPaid: true }),  // fatura fechada/paga
      tx({ name: 'Farmácia', amount: 100, monthKey: '2026-11', cardId: 'nu' }),                // fatura aberta
      ...installmentPurchase('Tênis', 300, 3, '2026-11', { cardId: 'nu' }),
    ];
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)]));
    assert.equal(month(months, '2026-11').committed, 400 + 100 + 100);
    assert.equal(month(months, '2026-12').committed, 100);
  });

  it('sugere o mês da 1ª parcela pelo fechamento e vencimento de cada cartão', () => {
    const p = (day: number) => ({ year: 2026, month: 11, day });
    // fecha dia 10, vence dia 17: antes do fechamento, mesma fatura; depois, a seguinte
    const a = { closeDay: 10, dueDay: 17 };
    assert.equal(firstInstallmentMonth(p(5), a), '2026-11');
    assert.equal(firstInstallmentMonth(p(10), a), '2026-11');
    assert.equal(firstInstallmentMonth(p(11), a), '2026-12');
    // fecha dia 25, vence dia 5 (mês seguinte)
    const b = { closeDay: 25, dueDay: 5 };
    assert.equal(firstInstallmentMonth(p(20), b), '2026-12');
    assert.equal(firstInstallmentMonth(p(26), b), '2027-01');
    // virada de ano e cartão sem datas
    assert.equal(firstInstallmentMonth({ year: 2026, month: 12, day: 28 }, b), '2027-02');
    assert.equal(firstInstallmentMonth(p(20), null), '2026-11');
  });

  it('parcelas de cartões diferentes com o mesmo nome são compras diferentes', () => {
    const txs = [
      ...installmentPurchase('Presente', 300, 3, '2026-11', { cardId: 'a' }),
      ...installmentPurchase('Presente', 300, 3, '2026-11', { cardId: 'b' }),
    ];
    assert.equal(extractInstallmentPlans(txs).length, 2);
  });
});

// ─── 7. Recorrentes ─────────────────────────────────────────────────────────────────────

describe('despesas fixas e recorrência', () => {
  const fixed = [tx({ name: 'Aluguel', amount: 1500, monthKey: '2026-11', recurrency: 'Fixo', category: 'Moradia' })];

  it('meses futuros sem fixas herdam as do último mês e ficam marcados como estimativa', () => {
    const months = buildMonthlyProjection(input(fixed, [salary('2026-11', 5000)]));
    const dec = month(months, '2026-12');
    assert.equal(dec.fixed, 1500);
    assert.equal(dec.basis, 'estimated');
    assert.ok(dec.items.every((i) => i.source === 'recurrence'));
    assert.equal(month(months, '2026-11').basis, 'known');
  });

  it('não duplica: mês futuro que já tem a fixa lançada usa só a lançada', () => {
    const txs = [...fixed, tx({ name: 'Aluguel', amount: 1600, monthKey: '2026-12', recurrency: 'Fixo', category: 'Moradia' })];
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)]));
    assert.equal(month(months, '2026-12').fixed, 1600);
    // e a nova referência passa a valer a partir dali
    assert.equal(month(months, '2027-01').fixed, 1600);
  });

  it('parcela marcada como fixa não é tratada como fixa', () => {
    const txs = installmentPurchase('Curso', 600, 3, '2026-11', { recurrency: 'Fixo' });
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 5000)]));
    assert.equal(month(months, '2026-12').installments, 200);
    assert.equal(month(months, '2026-12').fixed, 0);
  });

  it('passado nunca é estimado', () => {
    const months = buildMonthlyProjection(input(fixed, [salary('2026-10', 5000), salary('2026-11', 5000)], '2026-09', '2026-11'));
    assert.equal(month(months, '2026-09').fixed, 0);
    assert.equal(month(months, '2026-09').hasEstimate, false);
  });
});

// ─── 8. Alteração de salário ────────────────────────────────────────────────────────────

describe('salário', () => {
  it('usa o salário lançado em cada mês e propaga o último para os seguintes', () => {
    const incomes = [salary('2026-11', 5000), salary('2027-01', 6000)];
    const months = buildMonthlyProjection(input([], incomes));
    assert.equal(month(months, '2026-12').income, 5000);
    assert.equal(month(months, '2026-12').incomeSource, 'recurrence');
    assert.equal(month(months, '2027-01').income, 6000);
    assert.equal(month(months, '2027-01').incomeSource, 'recorded');
    assert.equal(month(months, '2027-03').income, 6000);
  });

  it('PLR e rendas extras não entram como salário', () => {
    const incomes: Income[] = [salary('2026-11', 5000), { id: 'plr', name: 'PLR', amount: 8000, monthKey: '2026-11', isRecurring: false }];
    const m = month(buildMonthlyProjection(input([], incomes)), '2026-11');
    assert.equal(m.income, 5000);
    assert.equal(m.extraIncome, 8000);
    assert.equal(month(buildMonthlyProjection(input([], incomes)), '2026-12').income, 5000);
  });

  it('sem salário: percentuais e renda livre não são inventados', () => {
    const m = month(buildMonthlyProjection(input([tx({ name: 'X', amount: 100, monthKey: '2026-11' })], [])), '2026-11');
    assert.equal(m.basis, 'insufficient');
    assert.equal(m.committedPct, null);
    assert.equal(m.free, null);
  });
});

// ─── 9. Simulação ───────────────────────────────────────────────────────────────────────

describe('simulação de nova compra', () => {
  const base = input(installmentPurchase('Notebook', 1200, 4, '2026-11'), [salary('2026-11', 5000)]);
  const sim = { name: 'Celular', total: 3000, installments: 6, cardId: null, firstMonthKey: '2026-12' };

  it('gera as parcelas sem alterar a lista original', () => {
    const before = base.transactions.length;
    const rows = simulationTransactions(sim);
    assert.equal(rows.length, 6);
    assert.equal(rows.reduce((s, r) => s + r.amount, 0), 3000);
    assert.equal(base.transactions.length, before);
  });

  it('compara cenários: perda de renda livre mês a mês e novo término', () => {
    const result = compareScenario(base, sim);
    assert.equal(result.installmentAmount, 500);
    assert.equal(result.monthsImpacted, 6);
    assert.equal(result.lastMonthKey, '2027-05');
    const dec = result.months.find((m) => m.monthKey === '2026-12')!;
    assert.equal(dec.freeLost, 500);
    assert.equal(dec.extraPct, 10);
    assert.equal(result.months.find((m) => m.monthKey === '2026-11')!.freeLost, 0);
    // horizonte se amplia até o fim da compra simulada
    assert.equal(result.months[result.months.length - 1].monthKey, '2027-05');
    assert.equal(result.freeBefore - result.freeAfter, 3000);
  });
});

// ─── 10. Dupla contagem ─────────────────────────────────────────────────────────────────

describe('prevenção de dupla contagem', () => {
  it('sub-transação parcelada conta uma vez, e o resto da transação fica fora das parcelas', () => {
    const t = tx({
      name: 'Fatura Nubank', amount: 350, monthKey: '2026-11', cardId: 'nu',
      subTransactions: [
        { name: 'Geladeira', amount: 200, installments: '2/10' },
        { name: 'Almoço', amount: 150 },
      ],
    });
    const m = month(buildMonthlyProjection(input([t], [salary('2026-11', 5000)])), '2026-11');
    assert.equal(m.installments, 200);
    assert.equal(m.other, 150);
    assert.equal(m.committed, 350);
  });

  it('investimentos, aportes de meta, transferências e rendas não são compromisso', () => {
    const txs = [
      tx({ name: 'Aporte', amount: 500, monthKey: '2026-11', transactionType: 'investment' }),
      tx({ name: 'Meta', amount: 300, monthKey: '2026-11', goalId: 'g1' }),
      tx({ name: 'Pix', amount: 200, monthKey: '2026-11', transactionType: 'transfer' }),
      tx({ name: 'Mercado', amount: 100, monthKey: '2026-11' }),
    ];
    assert.equal(month(buildMonthlyProjection(input(txs, [salary('2026-11', 5000)])), '2026-11').committed, 100);
  });

  it('o valor da fatura (used do cartão) nunca é somado às transações', () => {
    const txs = [tx({ name: 'Mercado', amount: 100, monthKey: '2026-11', cardId: 'nu' })];
    const m = month(buildMonthlyProjection(input(txs, [salary('2026-11', 5000)])), '2026-11');
    assert.equal(m.committed, 100);
  });
});

// ─── Faixas, estatísticas e insights ────────────────────────────────────────────────────

describe('faixas e insights', () => {
  it('classifica pelas faixas configuráveis', () => {
    assert.equal(classifyCommitment(10), 'low');
    assert.equal(classifyCommitment(30), 'moderate');
    assert.equal(classifyCommitment(55), 'high');
    assert.equal(classifyCommitment(80), 'critical');
    assert.equal(classifyCommitment(40, { moderate: 20, high: 35, critical: 45 }), 'high');
  });

  it('gera insight de liberação e de comprometimento com os números reais', () => {
    const txs = [
      ...installmentPurchase('TV', 3200, 4, '2026-11').map((t) => ({ ...t, amount: 800 })),
      ...installmentPurchase('Celular', 5600, 8, '2026-11').map((t) => ({ ...t, amount: 700 })),
    ];
    const months = buildMonthlyProjection(input(txs, [salary('2026-11', 2000)], '2026-11', '2027-10'));
    const insights = generateInsights({ months, plans: extractInstallmentPlans(txs), cards: [], currentMonthKey: NOW });
    const current = insights.find((i) => i.id === 'current-commitment')!;
    assert.ok(current.description.includes('75,0%'));
    assert.equal(current.relevance, 'alta');
    const release = insights.find((i) => i.id === 'release')!;
    assert.ok(release.metric.includes('800'));
  });

  it('sem dados suficientes não inventa insight de tendência', () => {
    const months = buildMonthlyProjection(input([], [salary('2026-11', 5000)]));
    const insights = generateInsights({ months, plans: [], cards: [], currentMonthKey: NOW });
    assert.equal(insights.some((i) => i.id === 'history-trend'), false);
  });
});
