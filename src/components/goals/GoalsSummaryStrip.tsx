'use client';

import { formatCurrency } from '@/lib/currency';
import type { GoalsSummary } from '@/lib/goalPlanning';

/** Resumo discreto: quatro números em uma linha, sem competir com as caixinhas */
export default function GoalsSummaryStrip({ summary: s }: { summary: GoalsSummary }) {
  return (
    <dl className="gb-summary" aria-label="Resumo das metas">
      <div><dt>Guardado</dt><dd>{formatCurrency(s.accumulated)}</dd></div>
      <div><dt>Objetivo total</dt><dd>{formatCurrency(s.targetTotal)}</dd></div>
      <div><dt>Metas ativas</dt><dd>{s.activeCount}<small>{s.completedCount > 0 ? ` · ${s.completedCount} concluída${s.completedCount > 1 ? 's' : ''}` : ''}{s.pausedCount > 0 ? ` · ${s.pausedCount} pausada${s.pausedCount > 1 ? 's' : ''}` : ''}</small></dd></div>
      <div><dt>Aporte mensal planejado</dt><dd>{formatCurrency(s.plannedThisMonth)}</dd></div>
    </dl>
  );
}
