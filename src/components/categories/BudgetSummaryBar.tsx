'use client';

import InfoTip from '@/components/ui/InfoTip';
import { BudgetBar } from './BudgetBar';
import { BUDGET_STATUS, type BudgetStatus } from '@/lib/budgets';
import { formatCurrency } from '@/lib/currency';
import type { BudgetTotals } from '@/lib/budgetInsights';

export interface BudgetSummary extends BudgetTotals {
  totalSpending: number;
  pct: number | null;
  status: BudgetStatus;
  macroCount: number;
  microCount: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Resumo do orçamento do mês em uma faixa só. O consumo e o excedido consideram apenas o
 * gasto das categorias que têm orçamento; o que está fora dele aparece à parte.
 */
export default function BudgetSummaryBar({ summary, isPast }: { summary: BudgetSummary; isPast: boolean }) {
  const s = summary;
  const controlled = [
    s.macroCount > 0 && plural(s.macroCount, 'categoria', 'categorias'),
    s.microCount > 0 && plural(s.microCount, 'subcategoria', 'subcategorias'),
  ].filter(Boolean).join(' e ');
  const info = BUDGET_STATUS[s.status];

  return (
    <div className="cx-summary">
      <div className="cx-metrics">
        <div className="cx-metric">
          <span className="cx-metric-label">Orçamento total</span>
          <strong className="cx-metric-value">{formatCurrency(s.totalLimit)}</strong>
          <span className="cx-metric-sub">{controlled}</span>
        </div>

        <div className="cx-metric">
          <span className="cx-metric-label">Gasto orçado</span>
          <strong className="cx-metric-value">{formatCurrency(s.budgetedSpent)}</strong>
          <span className="cx-metric-sub">
            {s.unbudgetedSpent > 0 ? `+ ${formatCurrency(s.unbudgetedSpent)} sem orçamento` : 'tudo dentro de categorias com orçamento'}
          </span>
        </div>

        <div className="cx-metric">
          <span className="cx-metric-label">
            Excedido
            <InfoTip text="Soma do que cada orçamento passou do próprio limite. Uma categoria com folga não compensa outra estourada." />
          </span>
          <strong className="cx-metric-value" style={{ color: s.exceeded > 0 ? 'var(--red)' : undefined }}>{formatCurrency(s.exceeded)}</strong>
          <span className="cx-metric-sub">
            {s.exceeded > 0 ? `${formatCurrency(s.available)} ainda livres nos demais` : `${formatCurrency(s.available)} ${isPast ? 'sobraram' : 'disponíveis'}`}
          </span>
        </div>

        <div className="cx-metric">
          <span className="cx-metric-label">Ultrapassados</span>
          <strong className="cx-metric-value" style={{ color: s.overCount > 0 ? 'var(--red)' : undefined }}>
            {s.overCount}<span className="cx-metric-of"> de {s.budgetCount}</span>
          </strong>
          <span className="cx-metric-sub">
            {s.reachedCount > 0 ? `${plural(s.reachedCount, 'no limite exato', 'no limite exato')}` : plural(s.budgetCount, 'orçamento', 'orçamentos')}
          </span>
        </div>

        <div className="cx-metric">
          <span className="cx-metric-label">
            Consumo geral
            <InfoTip text={`Gasto das ${plural(s.budgetCount, 'categoria', 'categorias')} com orçamento dividido pela soma dos limites. Gastos em categorias sem orçamento não entram nesta conta.`} />
          </span>
          <strong className="cx-metric-value" style={{ color: info.color }}>{s.pct ?? 0}%</strong>
          <BudgetBar pct={s.consumptionPct ?? 0} status={s.status} height={5} label="Consumo geral do orçamento" />
        </div>
      </div>
    </div>
  );
}
