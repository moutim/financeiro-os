'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';
import { Layers } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import { formatCurrency } from '@/lib/currency';
import type { CommitmentBands, MonthProjection } from '@/lib/projection/engine';
import type { CreditCard } from '@/lib/types';
import MonthDetail from './MonthDetail';
import {
  basisOpacity, ChartTooltipBox, EmptyNote, Horizon, HorizonTabs, KIND_COLOR, KIND_LABEL,
  Legend, shortMonth, sliceHorizon, TooltipRow, TOOLTIP_PROPS,
} from './shared';

interface Props {
  months: MonthProjection[];
  currentMonthKey: string;
  horizon: Horizon;
  onHorizon: (h: Horizon) => void;
  selected: string | null;
  onSelect: (monthKey: string) => void;
  bands: CommitmentBands;
  cards: Pick<CreditCard, 'id' | 'name'>[];
  simulating: boolean;
}

interface Row {
  monthKey: string;
  label: string;
  installments: number;
  fixed: number;
  other: number;
  free: number;
  month: MonthProjection;
}

/**
 * Cada barra é a renda líquida do mês (100%). Os segmentos são % da renda; se o
 * comprometimento passa de 100%, a barra ultrapassa a linha e o mês é marcado como acima da renda.
 */
export default function CommitmentChart({ months, currentMonthKey, horizon, onHorizon, selected, onSelect, cards, simulating }: Props) {
  const visible = useMemo(() => sliceHorizon(months, currentMonthKey, horizon), [months, currentMonthKey, horizon]);
  const rows: Row[] = useMemo(
    () => visible
      .filter((m) => m.committedPct !== null)
      .map((m) => {
        const p = (v: number) => (v / m.income) * 100;
        return {
          monthKey: m.monthKey,
          label: shortMonth(m.monthKey),
          installments: p(m.installments),
          fixed: p(m.fixed),
          other: p(m.other),
          free: Math.max(0, p(m.free ?? 0)),
          month: m,
        };
      }),
    [visible],
  );
  const skipped = visible.length - rows.length;
  const maxTotal = Math.max(100, ...rows.map((r) => r.installments + r.fixed + r.other));
  const selectedMonth = selected ? months.find((m) => m.monthKey === selected) ?? null : null;

  const select = (e: unknown) => {
    const row = (e as { payload?: Row } | undefined)?.payload;
    if (row?.monthKey) onSelect(row.monthKey);
  };

  return (
    <SectionCard
      icon={Layers}
      title="Comprometimento da renda"
      description={simulating ? 'Mostrando o cenário com a compra simulada' : 'Cada barra é o salário líquido do mês (100%). Clique para ver o que compõe o mês'}
      actions={<HorizonTabs value={horizon} onChange={onHorizon} />}
    >
      {rows.length === 0 ? (
        <EmptyNote>Lance seu salário como renda recorrente para ver quanto dele está comprometido mês a mês.</EmptyNote>
      ) : (
        <>
          <div style={{ width: '100%', height: 300 }} role="img" aria-label="Comprometimento da renda por mês, em percentual do salário líquido">
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }} axisLine={false} tickLine={false} interval={horizon > 12 ? 1 : 0} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={44}
                  domain={[0, Math.ceil(maxTotal / 25) * 25]} tickFormatter={(v: number) => `${v}%`}
                />
                <ReferenceLine y={100} stroke="var(--text-tertiary)" strokeDasharray="4 4" />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  cursor={{ fill: 'var(--separator-subtle)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
                    if (!row) return null;
                    const m = row.month;
                    return (
                      <ChartTooltipBox title={`${row.label}${m.phase === 'current' ? ' · mês atual' : m.phase === 'past' ? ' · realizado' : ' · previsto'}`}>
                        <TooltipRow label="Salário líquido" value={formatCurrency(m.income)} strong />
                        {(['installments', 'fixed', 'other'] as const).map((k) => (
                          <TooltipRow key={k} color={KIND_COLOR[k]} label={KIND_LABEL[k]} value={formatCurrency(m[k])} />
                        ))}
                        <TooltipRow color={KIND_COLOR.free} label="Renda livre" value={formatCurrency(m.free ?? 0)} strong />
                        {m.hasEstimate && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Inclui valores estimados por recorrência</div>}
                      </ChartTooltipBox>
                    );
                  }}
                />
                {(['installments', 'fixed', 'other', 'free'] as const).map((key) => (
                  <Bar
                    key={key} dataKey={key} stackId="income" fill={KIND_COLOR[key]} maxBarSize={56}
                    radius={key === 'free' ? [6, 6, 0, 0] : 0}
                    cursor="pointer" onClick={select} isAnimationActive={false}
                  >
                    {rows.map((r) => {
                      const isSelected = r.monthKey === selected;
                      return (
                        <Cell
                          key={`${key}-${r.monthKey}`}
                          fillOpacity={isSelected || !selected ? basisOpacity(r.month.basis) : basisOpacity(r.month.basis) * 0.55}
                        />
                      );
                    })}
                    <LabelList
                      dataKey={key}
                      content={(props) => {
                        const { x, y, width, height, value } = props as { x: number; y: number; width: number; height: number; value: number };
                        // só rotula blocos com espaço para o texto
                        if (!(height >= 18) || !(width >= 30) || !(value > 0)) return null;
                        return (
                          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central"
                            fontSize={11} fontWeight={700} fill={key === 'other' || key === 'free' ? '#3D3200' : '#fff'}
                            stroke={key === 'other' || key === 'free' ? 'none' : 'rgba(0,0,0,0.25)'} strokeWidth={key === 'other' || key === 'free' ? 0 : 2.5} paintOrder="stroke"
                            style={{ pointerEvents: 'none' }}>
                            {Math.round(value)}%
                          </text>
                        );
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 8 }}>
            <Legend items={[
              { color: KIND_COLOR.installments, label: KIND_LABEL.installments },
              { color: KIND_COLOR.fixed, label: KIND_LABEL.fixed },
              { color: KIND_COLOR.other, label: KIND_LABEL.other },
              { color: KIND_COLOR.free, label: KIND_LABEL.free },
            ]} />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              Meses passados são realizados; os futuros incluem valores estimados por recorrência.
              Gastos variáveis ainda não lançados não estão incluídos nos meses futuros.
              {skipped > 0 && ` ${skipped} ${skipped === 1 ? 'mês' : 'meses'} sem salário de referência ${skipped === 1 ? 'foi omitido' : 'foram omitidos'}.`}
            </p>
          </div>

          <div className="planning-chips" role="group" aria-label="Selecionar mês">
            {rows.map((r) => (
              <button key={r.monthKey} type="button" className={selected === r.monthKey ? 'is-active' : ''} aria-pressed={selected === r.monthKey} onClick={() => onSelect(r.monthKey)}>
                {r.label}
              </button>
            ))}
          </div>

          {selectedMonth && <MonthDetail month={selectedMonth} cards={cards} />}
        </>
      )}
    </SectionCard>
  );
}
