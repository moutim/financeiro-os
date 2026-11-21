'use client';

import { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { PiggyBank } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import { formatCompact, formatCurrency } from '@/lib/currency';
import { summarizeProjection, type InstallmentPlan, type MonthProjection } from '@/lib/projection/engine';
import {
  basisOpacity, ChartTooltipBox, EmptyNote, Horizon, HorizonTabs, KIND_COLOR, KIND_LABEL, Legend, pct, shortMonth, sliceHorizon, TooltipRow, TOOLTIP_PROPS,
} from './shared';

interface Props {
  /** Cenário exibido (já com a compra simulada, se houver) */
  months: MonthProjection[];
  /** Cenário atual, sem a simulação: aparece como linha de comparação quando há simulação */
  baseMonths: MonthProjection[] | null;
  plans: InstallmentPlan[];
  currentMonthKey: string;
  horizon: Horizon;
  onHorizon: (h: Horizon) => void;
  selected: string | null;
  onSelect: (monthKey: string) => void;
}

interface Row {
  monthKey: string;
  label: string;
  free: number;
  baseFree: number | null;
  month: MonthProjection;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export default function FreeIncomeChart({ months, baseMonths, plans, currentMonthKey, horizon, onHorizon, selected, onSelect }: Props) {
  const visible = useMemo(() => sliceHorizon(months, currentMonthKey, horizon, false).filter((m) => m.free !== null), [months, currentMonthKey, horizon]);
  const stats = useMemo(() => summarizeProjection(visible, plans, currentMonthKey), [visible, plans, currentMonthKey]);
  const baseByKey = useMemo(() => new Map((baseMonths ?? []).map((m) => [m.monthKey, m])), [baseMonths]);

  const rows: Row[] = visible.map((m) => ({
    monthKey: m.monthKey,
    label: shortMonth(m.monthKey),
    free: m.free ?? 0,
    baseFree: baseMonths ? baseByKey.get(m.monthKey)?.free ?? null : null,
    month: m,
  }));
  const selectedMonth = selected ? visible.find((m) => m.monthKey === selected) ?? null : null;
  const pick = (m: MonthProjection | null) => (m ? `${shortMonth(m.monthKey)} · ${pct(m.committedPct ?? 0)}` : '—');

  return (
    <SectionCard
      icon={PiggyBank}
      title="Projeção de renda livre"
      description="Salário previsto − parcelas − fixas − outros compromissos já lançados"
      actions={<HorizonTabs value={horizon} onChange={onHorizon} />}
    >
      {rows.length === 0 ? (
        <EmptyNote>Sem salário de referência para projetar a renda livre.</EmptyNote>
      ) : (
        <>
          <div className="planning-stats">
            <Stat label="Maior comprometimento" value={pick(stats.highestCommitment)} />
            <Stat label="Menor comprometimento" value={pick(stats.lowestCommitment)} />
            <Stat label="Maior renda livre" value={stats.highestFree ? formatCurrency(stats.highestFree.free ?? 0) : '—'} sub={stats.highestFree ? shortMonth(stats.highestFree.monthKey) : undefined} />
            <Stat label="Compromissos futuros" value={formatCurrency(stats.futureCommitted)} sub={`Depois de ${shortMonth(currentMonthKey)}`} />
            <Stat label="Parcelas encerradas" value={String(stats.endingPlans)} sub="No período" />
            <Stat label="Liberado por mês" value={formatCurrency(stats.monthlyReleased)} sub="Com esses encerramentos" />
          </div>

          <div style={{ width: '100%', height: 260, marginTop: 12 }} role="img" aria-label="Renda livre estimada por mês">
            <ResponsiveContainer>
              <ComposedChart data={rows} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval={horizon > 12 ? 1 : 0} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={72} tickFormatter={formatCompact} />
                <ReferenceLine y={0} stroke="var(--text-tertiary)" />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  cursor={{ fill: 'var(--separator-subtle)' }}
                  content={({ active, payload }) => {
                    const r = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
                    if (!r) return null;
                    return (
                      <ChartTooltipBox title={`${r.label}${r.month.phase === 'current' ? ' · mês atual' : ' · previsto'}`}>
                        <TooltipRow color={KIND_COLOR.free} label="Renda livre" value={formatCurrency(r.free)} pct={pct(r.month.freePct ?? 0)} strong />
                        <TooltipRow label="Comprometido" value={formatCurrency(r.month.committed)} />
                        {r.baseFree !== null && r.baseFree !== r.free && <TooltipRow label="Sem a compra" value={`${formatCurrency(r.baseFree)} (−${formatCurrency(r.baseFree - r.free)})`} />}
                        {r.month.hasEstimate && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Inclui valores estimados por recorrência</div>}
                      </ChartTooltipBox>
                    );
                  }}
                />
                <Bar dataKey="free" radius={[6, 6, 0, 0]} maxBarSize={48} cursor="pointer" isAnimationActive={false}
                  onClick={(e: unknown) => { const r = (e as { payload?: Row })?.payload; if (r) onSelect(r.monthKey); }}>
                  {rows.map((r) => (
                    <Cell key={r.monthKey}
                      fill={r.free < 0 ? 'var(--red)' : KIND_COLOR.free}
                      fillOpacity={(selected && selected !== r.monthKey ? 0.5 : 1) * basisOpacity(r.month.basis)}
                    />
                  ))}
                </Bar>
                {baseMonths && <Line type="monotone" dataKey="baseFree" name="Sem a compra" stroke="var(--text-secondary)" strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <Legend items={[
            { color: KIND_COLOR.free, label: KIND_LABEL.free },
            ...(baseMonths ? [{ color: 'var(--text-secondary)', label: 'Linha tracejada: cenário atual (sem a compra)' }] : []),
          ]} />

          {selectedMonth && (
            <div className="planning-formula animate-fade-in">
              <strong>{shortMonth(selectedMonth.monthKey)}</strong>
              <span>{formatCurrency(selectedMonth.income)} salário</span>
              <span>− {formatCurrency(selectedMonth.installments)} parcelas</span>
              <span>− {formatCurrency(selectedMonth.fixed)} fixas</span>
              <span>− {formatCurrency(selectedMonth.other)} outros</span>
              <strong style={{ color: (selectedMonth.free ?? 0) < 0 ? 'var(--red)' : 'var(--green)' }}>= {formatCurrency(selectedMonth.free ?? 0)} livre</strong>
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
            A renda livre é antes dos gastos variáveis ainda não lançados. Clique numa barra para ver a conta do mês.
          </p>
        </>
      )}
    </SectionCard>
  );
}
