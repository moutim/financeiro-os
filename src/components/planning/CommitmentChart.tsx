'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Layers } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import { formatCurrency } from '@/lib/currency';
import type { CommitmentBands, MonthProjection } from '@/lib/projection/engine';
import type { CreditCard } from '@/lib/types';
import MonthDetail from './MonthDetail';
import {
  BAND_COLOR, BAND_LABEL, bandOf, basisOpacity, ChartTooltipBox, EmptyNote, Horizon, HorizonTabs, KIND_COLOR, KIND_LABEL,
  Legend, pct, shortMonth, sliceHorizon, TooltipRow,
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
export default function CommitmentChart({ months, currentMonthKey, horizon, onHorizon, selected, onSelect, bands, cards, simulating }: Props) {
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
                  cursor={{ fill: 'var(--separator-subtle)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
                    if (!row) return null;
                    const m = row.month;
                    const band = bandOf(m, bands);
                    return (
                      <ChartTooltipBox title={`${row.label}${m.phase === 'current' ? ' · mês atual' : m.phase === 'past' ? ' · realizado' : ' · previsto'}`}>
                        <TooltipRow label="Salário líquido" value={formatCurrency(m.income)} strong />
                        {(['installments', 'fixed', 'other'] as const).map((k) => (
                          <TooltipRow key={k} color={KIND_COLOR[k]} label={KIND_LABEL[k]} value={`${formatCurrency(m[k])} · ${pct((m[k] / m.income) * 100)}`} />
                        ))}
                        <TooltipRow color={KIND_COLOR.free} label="Renda livre" value={`${formatCurrency(m.free ?? 0)} · ${pct(m.freePct ?? 0)}`} strong />
                        {band && <TooltipRow color={BAND_COLOR[band]} label="Comprometimento" value={`${pct(m.committedPct ?? 0)} · ${BAND_LABEL[band]}`} />}
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
                      const band = bandOf(r.month, bands);
                      const isSelected = r.monthKey === selected;
                      const isCurrent = r.month.phase === 'current';
                      return (
                        <Cell
                          key={`${key}-${r.monthKey}`}
                          fillOpacity={isSelected || !selected ? basisOpacity(r.month.basis) : basisOpacity(r.month.basis) * 0.55}
                          stroke={isSelected ? 'var(--text-primary)' : key === 'free' && (band === 'critical' || band === 'high') ? BAND_COLOR[band] : isCurrent ? 'var(--blue)' : 'none'}
                          strokeWidth={isSelected || isCurrent || (key === 'free' && (band === 'critical' || band === 'high')) ? 2 : 0}
                        />
                      );
                    })}
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
              { color: 'var(--text-tertiary)', label: 'Barra clara: estimado por recorrência', faded: true },
            ]} />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              Meses passados são realizados; o contorno azul marca o mês atual. Contorno laranja/vermelho: comprometimento {BAND_LABEL.high.toLowerCase()} ou {BAND_LABEL.critical.toLowerCase()} (faixas configuráveis no calendário).
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
