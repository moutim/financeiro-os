'use client';

import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipBox, TOOLTIP_PROPS, TooltipRow } from '@/components/ui/ChartTooltip';
import { formatCompact, formatCurrency } from '@/lib/currency';
import { goalInsights, monthLong, nextMonth, planContribution, projectGoal } from '@/lib/goalPlanning';
import { monthDiff, monthRange } from '@/lib/projection/engine';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import { goalColor, shortDate, shortMonth } from './format';

const HORIZONS: { id: string; label: string; months: number | null }[] = [
  { id: '6', label: '6 meses', months: 6 },
  { id: '12', label: '12 meses', months: 12 },
  { id: 'goal', label: 'Até atingir', months: null },
];

interface Point {
  monthKey: string;
  label: string;
  /** Saldo inicial + aportes − resgates, acumulados */
  saved: number | null;
  /** Rendimentos acumulados (empilhados sobre o que foi guardado) */
  yielded: number | null;
  /** Saldo projetado (a partir de hoje) */
  projected: number | null;
  total: number | null;
}

/**
 * Visão geral da caixinha: o que falta, quando termina e um gráfico simples da evolução, que
 * separa o que foi aportado, os rendimentos e a projeção. O gráfico complementa; não é o centro.
 */
export default function GoalOverviewTab({ row, currentMonth }: { row: GoalRow; currentMonth: string }) {
  const { goal, analysis: a } = row;
  const color = goalColor(goal);
  const [horizonId, setHorizonId] = useState('12');
  const horizon = HORIZONS.find((h) => h.id === horizonId)?.months ?? null;

  const data: Point[] = useMemo(() => {
    // histórico real: guardado (aportes líquidos) e rendimentos, acumulados até o fim de cada mês
    const first = a.entries[0]?.tx.monthKey;
    const start = first && first < currentMonth ? first : currentMonth;
    const months = monthRange(start, currentMonth);
    const real: Point[] = months.map((monthKey) => {
      const upto = a.entries.filter((e) => e.tx.monthKey <= monthKey);
      const yielded = upto.filter((e) => e.kind === 'rendimento').reduce((sum, e) => sum + e.signed, 0);
      const saved = a.totals.initial + upto.filter((e) => e.kind !== 'rendimento').reduce((sum, e) => sum + e.signed, 0);
      return { monthKey, label: shortMonth(monthKey), saved: round(saved), yielded: round(yielded), projected: null, total: round(saved + yielded) };
    });
    const projection = projectGoal({
      balance: a.totals.balance, target: goal.target, fromMonth: nextMonth(currentMonth),
      contributionFor: planContribution(a.plans, 0), monthlyRate: a.rate, horizonMonths: horizon,
    });
    if (real.length > 0 && projection.points.length > 0) real[real.length - 1].projected = real[real.length - 1].total;
    return [
      ...real,
      ...projection.points.map((p): Point => ({ monthKey: p.monthKey, label: shortMonth(p.monthKey), saved: null, yielded: null, projected: p.balance, total: p.balance })),
    ];
  }, [a.entries, a.totals, a.plans, a.rate, goal.target, currentMonth, horizon]);

  const insights = goalInsights(a, currentMonth).slice(0, 3);
  const max = Math.max(goal.target, ...data.map((d) => d.total ?? 0));
  const reached = a.projection.reachedMonth;
  const hasHistory = a.entries.length > 0;

  return (
    <div className="gb-tab">
      <dl className="gb-facts">
        <div><dt>Prazo planejado</dt><dd>{goal.deadline ? monthLong(goal.deadline) : 'Sem prazo'}</dd>
          <small>{a.monthsLeft !== null && a.status !== 'completed' ? (a.monthsLeft > 0 ? `${a.monthsLeft} ${a.monthsLeft === 1 ? 'mês' : 'meses'} restantes` : 'vencido ou no mês atual') : ''}</small></div>
        <div><dt>Previsão de conclusão</dt><dd>{a.status === 'completed' ? 'Concluída' : a.status === 'paused' ? 'Pausada' : reached ? monthLong(reached) : 'Sem previsão'}</dd>
          <small>{a.status === 'paused' ? 'retome para voltar a prever' : reached ? `em ${monthDiff(currentMonth, reached)} ${monthDiff(currentMonth, reached) === 1 ? 'mês' : 'meses'}` : 'sem aportes planejados'}</small></div>
        <div><dt>Aporte mensal</dt><dd>{a.plannedThisMonth.recurring > 0 ? formatCurrency(a.plannedThisMonth.recurring) : '—'}</dd>
          <small>{a.rate > 0 ? `rendimento de ${String(goal.monthlyRate).replace('.', ',')}% ao mês` : 'sem rendimentos'}</small></div>
        <div><dt>Mensal para o prazo</dt><dd>{a.requiredForDeadline !== null ? formatCurrency(a.requiredForDeadline) : '—'}</dd>
          <small>{goal.deadline ? `até ${shortMonth(goal.deadline)}` : 'defina um prazo'}</small></div>
      </dl>

      <div className="gb-section-head">
        <h3>Evolução</h3>
        <div className="category-sort-group" role="group" aria-label="Horizonte do gráfico">
          {HORIZONS.map((h) => (
            <button key={h.id} type="button" aria-pressed={horizonId === h.id} className={`segmented-tab ${horizonId === h.id ? 'active' : ''}`} onClick={() => setHorizonId(h.id)}>{h.label}</button>
          ))}
        </div>
      </div>

      <div className="gb-chart" role="img" aria-label="Evolução do dinheiro guardado e projeção">
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={72} tickFormatter={formatCompact} domain={[0, Math.ceil(max * 1.05)]} />
            <ReferenceLine y={goal.target} stroke="var(--green)" strokeWidth={2} label={{ value: 'Meta', position: 'insideTopLeft', fontSize: 11, fill: 'var(--green)' }} />
            <Tooltip {...TOOLTIP_PROPS} cursor={{ stroke: 'var(--separator-opaque)' }}
              content={({ active, payload }) => {
                const r = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
                if (!r) return null;
                const projected = r.saved === null;
                return (
                  <ChartTooltipBox title={`${monthLong(r.monthKey)}${projected ? ' · projeção' : ''}`}>
                    {projected ? <TooltipRow color={color} label="Saldo projetado" value={formatCurrency(r.projected ?? 0)} /> : (
                      <>
                        <TooltipRow color={color} label="Guardado" value={formatCurrency(r.saved ?? 0)} />
                        {(r.yielded ?? 0) > 0 && <TooltipRow color="var(--teal)" label="Rendimentos" value={formatCurrency(r.yielded ?? 0)} />}
                        <TooltipRow label="Total" value={formatCurrency(r.total ?? 0)} muted />
                      </>
                    )}
                    <TooltipRow label="Falta para a meta" value={formatCurrency(Math.max(0, goal.target - (r.total ?? 0)))} muted />
                  </ChartTooltipBox>
                );
              }} />
            <Area type="monotone" dataKey="saved" stackId="s" stroke={color} strokeWidth={2.5} fill={color} fillOpacity={0.22} connectNulls={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="yielded" stackId="s" stroke="var(--teal)" strokeWidth={1.5} fill="var(--teal)" fillOpacity={0.35} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="projected" stroke={color} strokeDasharray="6 4" strokeWidth={2.5} strokeOpacity={0.8} dot={false} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="gb-note">
        <span className="gb-key" style={{ background: color }} /> Aportes realizados
        {a.totals.yield > 0 && <><span className="gb-key" style={{ background: 'var(--teal)' }} /> Rendimentos</>}
        <span className="gb-key is-dash" style={{ borderColor: color }} /> Projeção{a.rate > 0 ? ' (com o rendimento configurado)' : ' (sem rendimentos)'}
        {!hasHistory && ' · Ainda não há aportes lançados.'}
        {a.entries[0] && ` · Primeiro aporte em ${shortDate(a.entries[0].tx.date) || shortMonth(a.entries[0].tx.monthKey)}.`}
      </p>

      {insights.length > 0 && (
        <ul className="gb-insights">
          {insights.map((i) => (
            <li key={i.id}>
              <i style={{ background: i.tone === 'risk' ? 'var(--orange)' : i.tone === 'positive' ? 'var(--green)' : 'var(--blue)' }} aria-hidden />
              <span>{i.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
