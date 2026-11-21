'use client';

import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import AmountInput from '@/components/transactions/AmountInput';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { monthLong, nextMonth } from '@/lib/goalPlanning';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import type { ContributionPlan } from '@/lib/types';
import { shortMonth } from './format';

const cents = (raw: string) => (parseInt(raw.replace(/\D/g, ''), 10) || 0) / 100;
const toRaw = (v: number) => (v > 0 ? String(Math.round(v * 100)) : '');

/**
 * Planejamento da caixinha: prazo, início, rendimento e pausa; os participantes com o valor que cada
 * um pretende aportar (que pode mudar ao longo do tempo) e os aportes extraordinários previstos.
 * A previsão de conclusão aparece logo abaixo e usa só o que está planejado aqui.
 */
export default function GoalPlanTab({ row, currentMonth }: { row: GoalRow; currentMonth: string }) {
  const { addPlan, updatePlan, deletePlan, updateGoal } = useFinanceStore();
  const { goal, analysis: a, plans } = row;
  const hasPlanRows = plans.some((p) => p.kind === 'recorrente');
  const people = useMemo(() => [...new Set(['Você', ...a.persons.map((p) => p.person), ...plans.map((p) => p.person)])], [a.persons, plans]);

  // ── Configurações da meta ──
  const [deadline, setDeadline] = useState(goal.deadline ?? '');
  const [start, setStart] = useState(goal.planStartMonth ?? '');
  const [rate, setRate] = useState(goal.monthlyRate ? String(goal.monthlyRate).replace('.', ',') : '');
  const [monthlyRaw, setMonthlyRaw] = useState(toRaw(goal.monthlyPrediction));
  const [paused, setPaused] = useState(!!goal.paused);
  const [savingGoal, setSavingGoal] = useState(false);
  const dirty = deadline !== (goal.deadline ?? '') || start !== (goal.planStartMonth ?? '') || paused !== !!goal.paused
    || (rate.replace(',', '.') || '') !== (goal.monthlyRate ? String(goal.monthlyRate) : '')
    || (!hasPlanRows && cents(monthlyRaw) !== goal.monthlyPrediction);

  const saveGoal = async () => {
    setSavingGoal(true);
    try {
      await updateGoal(goal.id, {
        deadline: deadline || null,
        planStartMonth: start || null,
        monthlyRate: parseFloat(rate.replace(',', '.')) > 0 ? parseFloat(rate.replace(',', '.')) : null,
        paused,
        ...(hasPlanRows ? {} : { monthlyPrediction: cents(monthlyRaw) }),
      });
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); } finally { setSavingGoal(false); }
  };

  // ── Participantes e aportes planejados ──
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({ person: 'Você', kind: 'recorrente' as ContributionPlan['kind'], raw: '', from: nextMonth(currentMonth), to: '' });
  const [saving, setSaving] = useState(false);

  const openForm = (plan?: ContributionPlan, kind: ContributionPlan['kind'] = 'recorrente') => {
    setEditing(plan?.id ?? 'new');
    setForm(plan
      ? { person: plan.person, kind: plan.kind, raw: toRaw(plan.amount), from: plan.fromMonth, to: plan.toMonth ?? '' }
      : { person: 'Você', kind, raw: '', from: nextMonth(currentMonth), to: '' });
  };
  const savePlan = async () => {
    const amount = cents(form.raw);
    if (!form.person.trim() || amount <= 0 || !form.from) return;
    const toMonth = form.kind === 'extraordinario' ? form.from : form.to || null;
    if (toMonth && toMonth < form.from) { alert('O mês final não pode ser anterior ao inicial.'); return; }
    setSaving(true);
    try {
      const data = { person: form.person.trim(), kind: form.kind, amount, fromMonth: form.from, toMonth };
      if (editing && editing !== 'new') await updatePlan(editing, data);
      else await addPlan({ goalId: goal.id, ...data });
      setEditing(null);
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  };
  const removePlan = async (id: string) => {
    if (!confirm('Remover esta linha do plano de aportes?')) return;
    try { await deletePlan(id); } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
  };

  const sorted = [...plans].sort((x, y) => x.person.localeCompare(y.person) || x.fromMonth.localeCompare(y.fromMonth));
  const reached = a.projection.reachedMonth;

  return (
    <div className="gb-tab">
      {/* Previsão com o que está planejado */}
      <div className="gb-forecast">
        {a.status === 'completed' ? <p>Meta concluída. Parabéns!</p>
          : a.status === 'paused' ? <p>Meta pausada: não há previsão enquanto estiver pausada.</p>
          : reached ? (
            <p>Com os aportes planejados{a.rate > 0 ? ' e o rendimento configurado' : ' (sem rendimentos)'}, a meta é alcançada em <b>{monthLong(reached)}</b>, em {a.projection.monthsToReach} {a.projection.monthsToReach === 1 ? 'mês' : 'meses'}.
              {a.monthsLate !== null && a.monthsLate > 0 && <> Isso passa {a.monthsLate} {a.monthsLate === 1 ? 'mês' : 'meses'} do prazo{a.requiredForDeadline ? `; para cumpri-lo seriam ${formatCurrency(a.requiredForDeadline)} por mês` : ''}.</>}
            </p>
          ) : <p>Não há aportes planejados, então não é possível prever quando a meta será alcançada. Defina o valor mensal abaixo.</p>}
      </div>

      <div className="gb-section-head"><h3>Participantes e aportes</h3>
        {editing === null && (
          <span className="gb-head-actions">
            <button type="button" className="btn-secondary" onClick={() => openForm()}><Plus size={14} /> Aporte mensal</button>
            <button type="button" className="btn-ghost" onClick={() => openForm(undefined, 'extraordinario')}><Plus size={14} /> Extraordinário</button>
          </span>
        )}
      </div>

      {editing !== null && (
        <div className="gx-form">
          <label><span>Participante</span>
            <input className="form-input" list={`gb-people-${goal.id}`} value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} />
            <datalist id={`gb-people-${goal.id}`}>{people.map((p) => <option key={p} value={p} />)}</datalist>
          </label>
          <label><span>Tipo</span>
            <select className="form-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ContributionPlan['kind'] })}>
              <option value="recorrente">Mensal (todo mês)</option>
              <option value="extraordinario">Extraordinário (um mês)</option>
            </select>
          </label>
          <label><span>Valor</span><AmountInput rawAmount={form.raw} onChange={(raw) => setForm({ ...form, raw })} allowCredit={false} /></label>
          <label><span>{form.kind === 'recorrente' ? 'A partir de' : 'Mês'}</span>
            <input className="form-input" type="month" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </label>
          {form.kind === 'recorrente' && (
            <label><span>Até (opcional)</span>
              <input className="form-input" type="month" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </label>
          )}
          <div className="gx-form-actions">
            <button type="button" className="btn-primary" onClick={savePlan} disabled={saving}><Check size={15} /> {saving ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)} disabled={saving}><X size={15} /> Cancelar</button>
          </div>
          <p className="gb-note" style={{ gridColumn: '1 / -1', margin: 0 }}>
            Para mudar o valor de alguém, adicione uma linha nova a partir do mês desejado: a mais recente vale. Cada pessoa pode ter um valor diferente.
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="gb-note" style={{ marginTop: 4 }}>
          {goal.monthlyPrediction > 0 ? `Sem participantes definidos: a previsão usa o aporte mensal da meta (${formatCurrency(goal.monthlyPrediction)}).` : 'Nenhum participante com aporte planejado ainda.'}
        </p>
      ) : (
        <ul className="gx-plans">
          {sorted.map((p) => (
            <li key={p.id}>
              <span className="gx-plan-who"><strong>{p.person}</strong><small>{p.kind === 'recorrente' ? 'mensal' : 'extraordinário'}</small></span>
              <span className="gx-plan-when">{p.kind === 'recorrente' ? `${shortMonth(p.fromMonth)} → ${p.toMonth ? shortMonth(p.toMonth) : 'sem fim'}` : shortMonth(p.fromMonth)}</span>
              <span className="num">{formatCurrency(p.amount)}{p.kind === 'recorrente' ? '/mês' : ''}</span>
              <span className="gx-plan-actions">
                <button type="button" onClick={() => openForm(p)} aria-label="Editar"><Pencil size={14} /></button>
                <button type="button" onClick={() => removePlan(p.id)} aria-label="Remover" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Configurações da meta */}
      <div className="gb-section-head" style={{ marginTop: 26 }}><h3>Prazo e configurações</h3></div>
      <div className="gx-form" style={{ paddingTop: 4 }}>
        {!hasPlanRows && (
          <label><span>Aporte mensal planejado</span><AmountInput rawAmount={monthlyRaw} onChange={setMonthlyRaw} allowCredit={false} /></label>
        )}
        <label><span>Prazo desejado</span><input className="form-input" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        <label><span>Data de início do plano</span><input className="form-input" type="month" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label><span>Rendimento (% ao mês)</span><input className="form-input" inputMode="decimal" value={rate} placeholder="sem rendimento" onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))} /></label>
        <label className="gb-toggle"><span>Meta pausada</span>
          <button type="button" role="switch" aria-checked={paused} className={paused ? 'is-on' : ''} onClick={() => setPaused(!paused)}><i /></button>
          <small>{paused ? 'Não entra nos aportes planejados nem na previsão.' : 'Em andamento.'}</small>
        </label>
        <div className="gx-form-actions">
          <button type="button" className="btn-primary" onClick={saveGoal} disabled={!dirty || savingGoal}>{savingGoal ? 'Salvando…' : 'Salvar configurações'}</button>
        </div>
      </div>
      <p className="gb-note">Sem taxa de rendimento a previsão usa só os aportes: nenhuma taxa é presumida. Rendimentos reais entram pelo lançamento de um rendimento.</p>
    </div>
  );
}
