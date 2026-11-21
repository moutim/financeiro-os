import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from './types.ts';
import { buildBudgetAlerts, historySeries, summarizeBudgetLines, type BudgetLine, type HistoryMonth, type LineStatus } from './budgetInsights.ts';
import { analyzeSpending } from './spendingAnalysis.ts';

const status = (spent: number, limit: number): LineStatus => {
  if (spent > limit) return 'over';
  if (spent === limit) return 'reached';
  const p = (spent / limit) * 100;
  return p > 90 ? 'critical' : p > 75 ? 'alert' : p > 50 ? 'attention' : 'normal';
};
const line = (category: string, limit: number, spent: number): BudgetLine => ({
  key: category, category, subcategory: null, label: category, limit, spent, rawPct: (spent / limit) * 100, status: status(spent, limit),
});

describe('resumo dos orçamentos', () => {
  it('excedido soma só o que passou de cada limite; folga de uma categoria não compensa outra', () => {
    const lines = [line('Alimentação', 1000, 1300), line('Saúde', 500, 100)];
    const t = summarizeBudgetLines(lines, 1400);
    assert.equal(t.exceeded, 300);
    assert.equal(t.available, 400);
    assert.equal(t.overCount, 1);
    // a conta global (1500 − 1400 = +100 "disponível") esconderia o estouro
    assert.equal(t.totalLimit - t.budgetedSpent, 100);
  });

  it('separa gasto orçado do não orçado e calcula o consumo só sobre o orçado', () => {
    const t = summarizeBudgetLines([line('Alimentação', 1000, 500)], 800);
    assert.equal(t.budgetedSpent, 500);
    assert.equal(t.unbudgetedSpent, 300);
    assert.equal(t.consumptionPct, 50);
  });

  it('sem orçamentos não há consumo geral', () => {
    const t = summarizeBudgetLines([], 250);
    assert.equal(t.consumptionPct, null);
    assert.equal(t.unbudgetedSpent, 250);
  });

  it('limite atingido não conta como ultrapassado', () => {
    const t = summarizeBudgetLines([line('Lazer', 200, 200)], 200);
    assert.equal(t.overCount, 0);
    assert.equal(t.reachedCount, 1);
  });
});

describe('alertas', () => {
  const none = new Map<string, { avg: number; months: number }>();

  it('ordena por relevância: estourado, depois perto do limite; ignora "atenção"', () => {
    const lines = [line('A', 100, 70), line('B', 100, 95), line('C', 100, 130), line('D', 100, 85)];
    const alerts = buildBudgetAlerts({ lines, unbudgeted: [], totalSpending: 380, previousAvg: none, elapsed: null });
    assert.deepEqual(alerts.map((a) => a.key), ['C', 'B', 'D']);
    assert.equal(alerts[0].kind, 'over');
    assert.equal(alerts[0].diff, 30);
    assert.equal(alerts[1].kind, 'limit');
  });

  it('um alerta por categoria: o mais grave vence', () => {
    const prev = new Map([['C', { avg: 50, months: 3 }]]);
    const alerts = buildBudgetAlerts({ lines: [line('C', 100, 130)], unbudgeted: [], totalSpending: 130, previousAvg: prev, elapsed: null });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, 'over');
  });

  it('ritmo acima do esperado só no mês em andamento', () => {
    const lines = [line('Lazer', 100, 60)];
    const base = { lines, unbudgeted: [], totalSpending: 60, previousAvg: none };
    assert.equal(buildBudgetAlerts({ ...base, elapsed: 0.2 })[0].kind, 'pace');
    assert.equal(buildBudgetAlerts({ ...base, elapsed: 0.5 }).length, 0);
    assert.equal(buildBudgetAlerts({ ...base, elapsed: null }).length, 0);
  });

  it('crescimento anormal exige histórico e diferença relevante', () => {
    const l = [line('Mercado', 2000, 900)];
    const grow = (avg: number, months: number) => buildBudgetAlerts({ lines: l, unbudgeted: [], totalSpending: 900, previousAvg: new Map([['Mercado', { avg, months }]]), elapsed: null });
    assert.equal(grow(500, 3)[0].kind, 'growth');
    assert.equal(grow(500, 3)[0].diff, 400);
    assert.equal(grow(500, 1).length, 0);   // pouco histórico
    assert.equal(grow(800, 3).length, 0);   // alta pequena
    assert.equal(grow(40, 3)[0].baseline, 40);
  });

  it('categoria sem orçamento só alerta quando pesa no total', () => {
    const unbudgeted = [{ category: 'Viagens', spent: 300, count: 2 }, { category: 'Pets', spent: 20, count: 1 }];
    const alerts = buildBudgetAlerts({ lines: [], unbudgeted, totalSpending: 1000, previousAvg: none, elapsed: null });
    assert.deepEqual(alerts.map((a) => a.key), ['Viagens']);
    assert.equal(alerts[0].hasBudget, false);
    assert.equal(alerts[0].limit, null);
  });
});

describe('série histórica', () => {
  const months: HistoryMonth[] = [
    { monthKey: '2026-08', hasData: false, spentByKey: {}, limitByKey: {} },
    { monthKey: '2026-09', hasData: true, spentByKey: { A: 100, B: 50 }, limitByKey: {} },
    { monthKey: '2026-10', hasData: true, spentByKey: { A: 120, B: 60 }, limitByKey: { A: 200 } },
    { monthKey: '2026-11', hasData: true, spentByKey: { A: 90 }, limitByKey: { A: 200, B: 100 } },
  ];

  it('distingue mês sem informação, gasto sem orçamento e gasto orçado', () => {
    const s = historySeries(months, ['A']);
    assert.deepEqual(s[0], { monthKey: '2026-08', spent: null, limit: null, pct: null });
    assert.deepEqual(s[1], { monthKey: '2026-09', spent: 100, limit: null, pct: null });
    assert.equal(s[2].pct, 60);
  });

  it('soma várias categorias; o % compara só o gasto de quem tinha limite', () => {
    const s = historySeries(months, ['A', 'B']);
    assert.equal(s[2].spent, 180);
    assert.equal(s[2].limit, 200);
    assert.equal(s[2].pct, 60);          // 120 de A contra 200; B não tinha limite
    assert.equal(s[3].limit, 300);
    assert.equal(s[3].spent, 90);
  });
});

describe('análise de despesas', () => {
  const tx = (name: string, amount: number, category: string, subcategory?: string): Transaction => ({
    id: name, name, amount, category, subcategory: subcategory ?? null, monthKey: '2026-11', transactionType: 'expense',
  });
  const result = analyzeSpending([
    tx('a', 100, 'Alimentação', 'Delivery'), tx('b', 50, 'Alimentação', 'Delivery'),
    tx('c', 250, 'Alimentação', 'Mercado'), tx('d', 100, 'Transporte'),
  ]);

  it('totais, ticket médio e participação', () => {
    assert.equal(result.total, 500);
    assert.equal(result.count, 4);
    assert.equal(result.ticket, 125);
    const food = result.macros[0];
    assert.equal(food.category, 'Alimentação');
    assert.equal(food.total, 400);
    assert.equal(food.share, 0.8);
    assert.equal(food.ticket, 133.33);
  });

  it('subcategorias com contagem, ticket e participação na categoria; sem subcategoria vira Geral', () => {
    const [mercado, delivery] = result.macros[0].micros;
    assert.equal(mercado.name, 'Mercado');
    assert.equal(delivery.name, 'Delivery');
    assert.equal(delivery.count, 2);
    assert.equal(delivery.ticket, 75);
    assert.equal(delivery.shareOfMacro, 0.375);
    assert.equal(delivery.shareOfTotal, 0.3);
    assert.equal(result.macros[1].micros[0].name, 'Geral');
  });

  it('sem transações devolve zeros', () => {
    const empty = analyzeSpending([]);
    assert.equal(empty.total, 0);
    assert.equal(empty.ticket, 0);
    assert.deepEqual(empty.macros, []);
  });
});
