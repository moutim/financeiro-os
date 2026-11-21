'use client';

import { useMemo, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { History } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import { formatCurrency } from '@/lib/currency';
import { summarizeHistory, type MonthProjection } from '@/lib/projection/engine';
import { ChartTooltipBox, EmptyNote, pct, shortMonth, TooltipRow } from './shared';

type Window = 3 | 6 | 12;
const WINDOWS: Window[] = [3, 6, 12];

interface Point {
  label: string;
  pct: number | null;
  prevPct: number | null;
  prevLabel: string | null;
  month: MonthProjection;
  prev: MonthProjection | null;
}

/**
 * Histórico real: só meses já encerrados, com salário lançado. Nada de estimativa aqui;
 * as projeções ficam nas outras seções. O mês atual entra quando fechar.
 */
export default function HistoryChart({ months }: { months: MonthProjection[] }) {
  const [windowSize, setWindowSize] = useState<Window>(6);
  const [compare, setCompare] = useState(false);
  const history = useMemo(() => summarizeHistory(months), [months]);
  const all = history.points;

  const { data, shown } = useMemo(() => {
    const current = all.slice(-windowSize);
    const previous = compare ? all.slice(Math.max(0, all.length - windowSize * 2), all.length - windowSize) : [];
    const rows: Point[] = current.map((m, i) => {
      // alinha o período anterior de trás para frente
      const prev = previous[previous.length - (current.length - i)] ?? null;
      return { label: shortMonth(m.monthKey), pct: m.committedPct, prevPct: prev?.committedPct ?? null, prevLabel: prev ? shortMonth(prev.monthKey) : null, month: m, prev };
    });
    return { data: rows, shown: current };
  }, [all, windowSize, compare]);

  const avg = history.averages;
  const first = shown[0];
  const last = shown[shown.length - 1];
  const delta = first && last && shown.length > 1 ? (last.committedPct ?? 0) - (first.committedPct ?? 0) : null;
  const avgOf = (w: Window) => (w === 3 ? avg.last3 : w === 6 ? avg.last6 : avg.last12);

  return (
    <SectionCard
      icon={History}
      title="Histórico de comprometimento"
      description="Meses encerrados com salário lançado: dados reais, sem estimativas"
      actions={
        <div className="planning-pills" role="group" aria-label="Período do histórico">
          {WINDOWS.map((w) => (
            <button key={w} type="button" className={windowSize === w ? 'is-active' : ''} aria-pressed={windowSize === w} onClick={() => setWindowSize(w)}>{w}m</button>
          ))}
        </div>
      }
    >
      {all.length < 2 ? (
        <EmptyNote>
          Histórico ainda insuficiente: {all.length === 0 ? 'nenhum mês encerrado com salário lançado' : 'apenas 1 mês encerrado com salário lançado'}.
          O gráfico aparece a partir de 2 meses e a análise de tendência, a partir de 3.
        </EmptyNote>
      ) : (
        <>
          <div className="planning-stats">
            {WINDOWS.map((w) => (
              <div key={w}>
                <span>Média {w} meses</span>
                <strong>{avgOf(w) === null ? '—' : pct(avgOf(w) ?? 0)}</strong>
              </div>
            ))}
            <div>
              <span>Variação no período</span>
              <strong style={{ color: delta === null ? undefined : delta > 0 ? 'var(--red)' : 'var(--green)' }}>
                {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} p.p.`}
              </strong>
            </div>
          </div>

          <div style={{ width: '100%', height: 240, marginTop: 12 }} role="img" aria-label="Evolução histórica do percentual de renda comprometida">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={44} domain={[0, (max: number) => Math.max(50, Math.ceil(max / 10) * 10)]} tickFormatter={(v: number) => `${v}%`} />
                {avgOf(windowSize) !== null && <ReferenceLine y={avgOf(windowSize) ?? 0} stroke="var(--text-tertiary)" strokeDasharray="4 4" label={{ value: `média ${windowSize}m`, position: 'insideTopRight', fontSize: 11, fill: 'var(--text-tertiary)' }} />}
                <Tooltip
                  content={({ active, payload }) => {
                    const p = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
                    if (!p) return null;
                    const m = p.month;
                    return (
                      <ChartTooltipBox title={`${p.label} · realizado`}>
                        <TooltipRow label="Comprometimento" value={pct(m.committedPct ?? 0)} strong />
                        <TooltipRow label="Total comprometido" value={formatCurrency(m.committed)} />
                        <TooltipRow label="Salário líquido" value={formatCurrency(m.income)} />
                        <TooltipRow label="Renda livre" value={formatCurrency(m.free ?? 0)} />
                        {p.prev && <TooltipRow label={`Período anterior (${p.prevLabel})`} value={pct(p.prevPct ?? 0)} />}
                      </ChartTooltipBox>
                    );
                  }}
                />
                {compare && <Line type="monotone" dataKey="prevPct" stroke="var(--text-tertiary)" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}
                <Line type="monotone" dataKey="pct" stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--blue)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Comparar com o período anterior (linha tracejada)
          </label>
          {!history.sufficient && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              Há só {all.length} meses de histórico: ainda é cedo para falar em tendência.
            </p>
          )}
          {compare && all.length <= windowSize && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              Não há meses suficientes antes deste período para comparar.
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
}
