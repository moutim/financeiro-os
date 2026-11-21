'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/currency';
import { monthLong, type CalendarMonth } from '@/lib/goalPlanning';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';

const SHORT = 4;

/** Próximos aportes planejados, mês a mês. Meses com aporte extraordinário ou valor diferente ganham destaque */
export default function UpcomingContributions({ calendar, rows }: { calendar: CalendarMonth[]; rows: GoalRow[] }) {
  const [all, setAll] = useState(false);
  const withPlan = calendar.filter((m) => m.total > 0);
  if (withPlan.length === 0) return null;
  const nameOf = (id: string) => rows.find((r) => r.goal.id === id)?.goal.name ?? 'Meta';
  const shown = (all ? calendar : calendar.slice(0, SHORT)).filter((m) => m.total > 0 || !all);

  return (
    <section className="gb-panel" aria-label="Próximos aportes">
      <header className="gb-panel-head">
        <div><h2>Próximos aportes</h2><p>O que está planejado para os próximos meses.</p></div>
      </header>
      <ul className="gb-upcoming">
        {shown.map((m) => (
          <li key={m.monthKey} className={m.differs ? 'is-different' : undefined}>
            <span className="gb-up-month">
              <b>{monthLong(m.monthKey).replace(/ de /, ' ')}</b>
              {m.extra > 0 && <em>+ {formatCurrency(m.extra)} extraordinário</em>}
              {m.extra === 0 && m.differs && <em>valor diferente do padrão</em>}
            </span>
            <span className="gb-up-goals">
              {m.byGoal.map((g) => <span key={g.goalId}>{nameOf(g.goalId)} <b>{formatCurrency(g.total)}</b></span>)}
            </span>
            <b className="gb-up-total">{formatCurrency(m.total)}</b>
          </li>
        ))}
      </ul>
      {calendar.length > SHORT && (
        <button type="button" className="btn-ghost gb-more-btn" onClick={() => setAll((v) => !v)}>{all ? 'Ver menos' : `Ver ${calendar.length} meses`}</button>
      )}
    </section>
  );
}
