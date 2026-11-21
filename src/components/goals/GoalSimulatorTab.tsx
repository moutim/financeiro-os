'use client';

import { useMemo, useState } from 'react';
import AmountInput from '@/components/transactions/AmountInput';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { monthLong, nextMonth, plannedForMonth, simulateGoal } from '@/lib/goalPlanning';
import { monthDiff } from '@/lib/projection/engine';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import { goalColor } from './format';

const HORIZONS = [6, 12, 18] as const;
const cents = (raw: string) => (parseInt(raw.replace(/\D/g, ''), 10) || 0) / 100;
const toRaw = (v: number) => (v > 0 ? String(Math.round(v * 100)) : '');

/**
 * Simulador simples: mude o aporte mensal e veja o saldo daqui a 6, 12 e 18 meses, a nova data de
 * conclusão e a diferença para o planejamento atual. Nada é salvo sem confirmação.
 */
export default function GoalSimulatorTab({ row, currentMonth }: { row: GoalRow; currentMonth: string }) {
  const { addPlan, updatePlan } = useFinanceStore();
  const { goal, analysis: a, plans } = row;
  const color = goalColor(goal);
  const current = plannedForMonth(a.plans, nextMonth(currentMonth)).recurring;
  const [raw, setRaw] = useState(toRaw(current));
  const [saving, setSaving] = useState(false);
  const monthly = cents(raw);
  const changed = Math.abs(monthly - current) > 0.004;

  const base = useMemo(() => HORIZONS.map((h) => simulateGoal(a, currentMonth, {}, h).projection.endBalance), [a, currentMonth]);
  const sim = useMemo(() => HORIZONS.map((h) => simulateGoal(a, currentMonth, { monthly }, h).projection.endBalance), [a, currentMonth, monthly]);
  const baseDone = a.projection.reachedMonth;
  const simDone = useMemo(() => simulateGoal(a, currentMonth, { monthly }, null).projection.reachedMonth, [a, currentMonth, monthly]);
  const diffMonths = baseDone && simDone ? monthDiff(baseDone, simDone) : null;

  const recurringPeople = [...new Set(plans.filter((p) => p.kind === 'recorrente').map((p) => p.person))];
  const canSave = recurringPeople.length <= 1;
  const step = Math.max(100, Math.round((current || goal.target / 24) / 10 / 50) * 50);
  const sliderMax = Math.max((current || 1000) * 3, monthly, 1000);

  const apply = async () => {
    if (!changed || !canSave || !confirm(`Usar ${formatCurrency(monthly)} por mês no plano a partir de ${monthLong(nextMonth(currentMonth))}?`)) return;
    setSaving(true);
    try {
      const person = recurringPeople[0] ?? 'Você';
      const from = nextMonth(currentMonth);
      const existing = plans.find((p) => p.kind === 'recorrente' && p.person === person && p.fromMonth === from);
      const data = { person, kind: 'recorrente' as const, amount: monthly, fromMonth: from, toMonth: null };
      if (existing) await updatePlan(existing.id, data); else await addPlan({ goalId: goal.id, ...data });
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  };

  if (a.status === 'completed') return <div className="gb-tab"><p className="gb-empty">Esta meta já foi concluída.</p></div>;

  return (
    <div className="gb-tab" style={{ '--gc': color } as React.CSSProperties}>
      <p className="gb-note" style={{ marginTop: 0 }}>
        Hoje o plano prevê <b>{formatCurrency(current)}</b> por mês. Mude o valor para ver o que acontece; nada é salvo até você confirmar.
      </p>

      <div className="gb-sim-input">
        <label>
          <span>Aporte mensal simulado</span>
          <AmountInput rawAmount={raw} onChange={setRaw} allowCredit={false} />
        </label>
        <input type="range" min={0} max={sliderMax} step={step} value={Math.min(monthly, sliderMax)} onChange={(e) => setRaw(toRaw(Number(e.target.value)))} aria-label="Aporte mensal simulado" />
        <div className="gb-chips">
          {[-10, 10, 25].map((p) => (
            <button key={p} type="button" onClick={() => setRaw(toRaw(Math.max(0, Math.round(current * (1 + p / 100)))))} disabled={current <= 0}>{p > 0 ? '+' : '−'}{Math.abs(p)}%</button>
          ))}
          <button type="button" onClick={() => setRaw(toRaw(monthly + 1000))}>+ R$ 1.000</button>
          <button type="button" onClick={() => setRaw(toRaw(current))} disabled={!changed}>Voltar ao atual</button>
        </div>
      </div>

      <div className="gb-sim-grid">
        {HORIZONS.map((h, i) => {
          const diff = sim[i] - base[i];
          return (
            <div key={h} className="gb-sim-card">
              <span>Daqui a {h} meses</span>
              <strong>{formatCurrency(sim[i])}</strong>
              <small style={{ color: !changed ? undefined : diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : undefined }}>
                {changed ? `${diff >= 0 ? '+' : '−'}${formatCurrency(Math.abs(diff))} vs planejamento` : `planejamento atual`}
              </small>
            </div>
          );
        })}
        <div className="gb-sim-card is-done">
          <span>Conclusão estimada</span>
          <strong>{simDone ? monthLong(simDone) : 'sem previsão'}</strong>
          <small style={{ color: diffMonths === null || diffMonths === 0 || !changed ? undefined : diffMonths < 0 ? 'var(--green)' : 'var(--red)' }}>
            {!changed ? (baseDone ? 'planejamento atual' : '') : diffMonths === null ? (simDone ? 'antes não havia previsão' : '') : diffMonths === 0 ? 'mesma data' : `${Math.abs(diffMonths)} ${Math.abs(diffMonths) === 1 ? 'mês' : 'meses'} ${diffMonths < 0 ? 'antes' : 'depois'}`}
          </small>
        </div>
      </div>

      {changed && (
        <div className="gb-sim-actions animate-fade-in">
          <button type="button" className="btn-primary" onClick={apply} disabled={!canSave || saving}>{saving ? 'Salvando…' : 'Usar este valor no plano'}</button>
          <button type="button" className="btn-ghost" onClick={() => setRaw(toRaw(current))}>Descartar</button>
          {!canSave && <p className="gb-note" style={{ margin: 0 }}>Há mais de uma pessoa no plano: ajuste o valor de cada uma na aba Planejamento.</p>}
        </div>
      )}
    </div>
  );
}
