'use client';

import { CalendarClock, Check, Pause } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { getGoalIconDef } from '@/lib/goalIcons';
import { nextPlannedContribution } from '@/lib/goalPlanning';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import { GOAL_STATE_LABEL, goalColor, goalState, pct, personColor, shortMonth } from './format';

/**
 * Uma caixinha: o objetivo com sua cor, o quanto já foi guardado, o que falta, o plano e, quando
 * a meta é compartilhada, quanto cada pessoa colocou. Clicar abre o detalhamento.
 */
export default function GoalBox({ row, currentMonth, onOpen }: { row: GoalRow; currentMonth: string; onOpen: () => void }) {
  const { goal, analysis: a } = row;
  const color = goalColor(goal);
  const def = getGoalIconDef(goal.icon, goal.name);
  const Icon = def.icon;
  const state = goalState(a.status);

  const realizedNow = a.entries.filter((e) => e.kind === 'aporte' && e.tx.monthKey === currentMonth).reduce((s, e) => s + e.signed, 0);
  const next = state === 'active' ? nextPlannedContribution(a.plans, currentMonth, realizedNow) : null;
  const monthsToGo = a.projection.monthsToReach;
  const monthly = a.plannedThisMonth.recurring;
  const people = a.persons.map((p) => p.person);
  const showPeople = a.persons.length > 1 || row.ctx.collaborative;
  const late = a.status === 'behind' || a.status === 'overdue';

  return (
    <article
      className={`gb-card is-${state}`}
      style={{ '--gc': color } as React.CSSProperties}
      role="button" tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Abrir ${goal.name}`}
    >
      <header className="gb-head">
        <span className="gb-icon" aria-hidden><Icon size={22} /></span>
        <div className="gb-title">
          <h3 title={goal.notes ?? undefined}>{goal.name}</h3>
          <p>{goal.category || def.label}{goal.deadline ? ` · até ${shortMonth(goal.deadline)}` : ''}</p>
        </div>
        <span className={`gb-chip is-${state}`}>
          {state === 'completed' && <Check size={12} strokeWidth={3} />}
          {state === 'paused' && <Pause size={12} strokeWidth={3} />}
          {GOAL_STATE_LABEL[state]}
        </span>
      </header>

      <div className="gb-money">
        <strong>{formatCurrency(a.totals.balance)}</strong>
        <span>de {formatCurrency(goal.target)}</span>
      </div>

      <div className="gb-bar" role="progressbar" aria-valuenow={Math.round(a.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${goal.name}`}>
        <span style={{ width: `${a.pct}%` }} />
      </div>
      <div className="gb-bar-meta">
        <b>{pct(a.pct, a.pct >= 10 ? 0 : 1)}</b>
        <span>{a.remaining > 0 ? `faltam ${formatCurrency(a.remaining)}` : 'meta atingida'}</span>
      </div>

      {state !== 'completed' && (
        <dl className="gb-plan">
          <div>
            <dt>Aporte mensal</dt>
            <dd>{monthly > 0 ? formatCurrency(monthly) : '—'}</dd>
          </div>
          <div>
            <dt>Previsão</dt>
            <dd style={{ color: late ? 'var(--orange)' : undefined }}>
              {state === 'paused' ? 'pausada' : a.projection.reachedMonth ? shortMonth(a.projection.reachedMonth) : 'sem previsão'}
            </dd>
            <small>
              {state === 'paused' ? '' : monthsToGo ? `em ${monthsToGo} ${monthsToGo === 1 ? 'mês' : 'meses'}` : a.monthsLeft ? `${a.monthsLeft} ${a.monthsLeft === 1 ? 'mês' : 'meses'} até o prazo` : ''}
              {late && a.status === 'behind' ? ' · passa do prazo' : late ? ' · prazo vencido' : ''}
            </small>
          </div>
          <div>
            <dt>Próximo aporte</dt>
            <dd>{next ? formatCurrency(next.amount) : '—'}</dd>
            <small>{next ? (next.monthKey === currentMonth ? 'neste mês' : shortMonth(next.monthKey)) : ''}</small>
          </div>
        </dl>
      )}

      {showPeople && a.persons.length > 0 && (
        <div className="gb-people">
          <div className="gb-split" aria-hidden>
            {a.persons.map((p) => <span key={p.person} style={{ width: `${p.share * 100}%`, background: personColor(people, p.person) }} />)}
          </div>
          <ul>
            {a.persons.map((p) => (
              <li key={p.person}>
                <i style={{ background: personColor(people, p.person) }} aria-hidden />
                <span>{p.person}</span>
                <b>{formatCurrency(p.contributed)}</b>
              </li>
            ))}
          </ul>
          <p>Total em aportes <b>{formatCurrency(a.totals.contributed)}</b></p>
        </div>
      )}

      {state === 'completed' && (
        <p className="gb-done"><CalendarClock size={14} aria-hidden /> Objetivo conquistado</p>
      )}
    </article>
  );
}
