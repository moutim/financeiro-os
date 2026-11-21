'use client';

import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipBox, TOOLTIP_PROPS, TooltipRow } from '@/components/ui/ChartTooltip';
import { formatCompact, formatCurrency, monthKeyToLabel, monthKeyToShortLabel } from '@/lib/currency';
import { getCategoryConfig } from '@/lib/detailedCategories';
import { historySeries, type HistoryMonth, type HistoryPoint } from '@/lib/budgetInsights';

type Mode = 'values' | 'pct' | 'compare';
type Range = 6 | 12;

const MODES: { id: Mode; label: string; title: string }[] = [
  { id: 'values', label: 'Valores', title: 'Gasto mensal em reais, com o orçamento como referência' },
  { id: 'pct', label: '% do orçamento', title: 'Quanto de cada orçamento foi consumido' },
  { id: 'compare', label: 'Orçamento × gasto', title: 'Barras do orçamento e do gasto, somando as categorias escolhidas' },
];

const DEFAULT_SELECTION = 3;
const SPEND_COLOR = 'var(--blue)';

const macroOf = (key: string) => key.split(' › ')[0];
const labelOf = (key: string) => key.split(' › ').pop() ?? key;
const monthLabel = (m: string) => `${monthKeyToShortLabel(m)}/${m.slice(2, 4)}`;

/** Cor da série: a da categoria macro; subcategorias da mesma categoria compartilham a cor */
const colorOf = (key: string) => getCategoryConfig(macroOf(key)).color;

interface Props {
  history: HistoryMonth[];
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
}

/**
 * Evolução dos orçamentos: gasto, limite e consumo mês a mês para as categorias escolhidas.
 * Mês sem lançamentos fica em branco ("sem informação"); mês sem orçamento mostra só o gasto.
 */
export default function BudgetHistory({ history, selectedMonth, onSelectMonth }: Props) {
  const [mode, setMode] = useState<Mode>('values');
  const [range, setRange] = useState<Range>(6);
  const [picked, setPicked] = useState<string[] | null>(null);

  const months = useMemo(() => history.slice(-range), [history, range]);

  // Categorias disponíveis: as que tiveram orçamento e as macros com gasto no período
  const options = useMemo(() => {
    const withBudget = new Set<string>();
    const spent = new Map<string, number>();
    for (const m of months) {
      for (const k of Object.keys(m.limitByKey)) withBudget.add(k);
      for (const [k, v] of Object.entries(m.spentByKey)) if (!k.includes(' › ')) spent.set(k, (spent.get(k) ?? 0) + v);
    }
    const keys = new Set<string>([...withBudget, ...[...spent].filter(([, v]) => v > 0).map(([k]) => k)]);
    const lastLimit = (k: string) => [...months].reverse().find((m) => m.limitByKey[k] !== undefined)?.limitByKey[k] ?? 0;
    return [...keys]
      .map((key) => ({ key, budgeted: withBudget.has(key), weight: withBudget.has(key) ? 1e9 + lastLimit(key) : spent.get(key) ?? 0 }))
      .sort((a, b) => b.weight - a.weight);
  }, [months]);

  const selection = useMemo(() => {
    const valid = (picked ?? options.slice(0, DEFAULT_SELECTION).map((o) => o.key)).filter((k) => options.some((o) => o.key === k));
    return valid;
  }, [picked, options]);

  const toggle = (key: string) => {
    const base = picked ?? selection;
    setPicked(base.includes(key) ? base.filter((k) => k !== key) : [...base, key]);
  };

  const series = useMemo(() => new Map(selection.map((k) => [k, historySeries(months, [k])])), [months, selection]);
  const total = useMemo(() => historySeries(months, selection), [months, selection]);
  const hasAnyData = months.some((m) => m.hasData);
  const single = selection.length === 1 ? selection[0] : null;

  const rows = months.map((m, i) => {
    const row: Record<string, number | string | null | boolean> = { monthKey: m.monthKey, label: monthLabel(m.monthKey), hasData: m.hasData };
    for (const k of selection) {
      const p = series.get(k)?.[i];
      row[`spent:${k}`] = p?.spent ?? null;
      row[`limit:${k}`] = p?.limit ?? null;
      row[`pct:${k}`] = p?.pct ?? null;
    }
    row.totalSpent = total[i].spent;
    row.totalLimit = total[i].limit;
    row.totalPct = total[i].pct;
    return row;
  });

  if (options.length === 0 || months.length < 2 || !hasAnyData) {
    return (
      <section className="cx-section" aria-label="Evolução dos orçamentos">
        <header className="cx-head"><div><h2>Evolução</h2><p>Gasto e orçamento ao longo dos meses</p></div></header>
        <p className="cx-empty-line">Ainda não há meses suficientes com lançamentos para mostrar a evolução.</p>
      </section>
    );
  }

  const percent = mode === 'pct';

  return (
    <section className="cx-section" aria-label="Evolução dos orçamentos">
      <header className="cx-head">
        <div>
          <h2>Evolução</h2>
          <p>Gasto e orçamento mês a mês. Escolha as categorias para comparar.</p>
        </div>
        <div className="cx-head-tools">
          <div className="category-sort-group" role="group" aria-label="Período">
            {([6, 12] as Range[]).map((r) => (
              <button key={r} type="button" aria-pressed={range === r} className={`segmented-tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r} meses</button>
            ))}
          </div>
        </div>
      </header>

      <div className="cx-toolbar">
        <div className="category-sort-group" role="group" aria-label="Tipo de visualização">
          {MODES.map((m) => (
            <button key={m.id} type="button" title={m.title} aria-pressed={mode === m.id} className={`segmented-tab ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>{m.label}</button>
          ))}
        </div>
      </div>

      <div className="cx-chips" role="group" aria-label="Categorias comparadas">
        {options.map((o) => {
          const on = selection.includes(o.key);
          const color = colorOf(o.key);
          return (
            <button key={o.key} type="button" aria-pressed={on} className={`cx-chip${on ? ' is-on' : ''}`} onClick={() => toggle(o.key)}
              style={on ? { borderColor: color, color } : undefined} title={o.budgeted ? 'Tem orçamento no período' : 'Sem orçamento no período: só o gasto'}>
              <span className="cx-chip-dot" style={{ background: color }} />
              {o.key.includes(' › ') ? labelOf(o.key) : o.key}
            </button>
          );
        })}
      </div>

      {selection.length === 0 ? (
        <p className="cx-empty-line">Escolha ao menos uma categoria.</p>
      ) : (
        <>
          <div className="cx-chart" role="img" aria-label="Evolução do gasto e do orçamento por mês">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                onClick={(s: unknown) => { const idx = (s as { activeTooltipIndex?: number })?.activeTooltipIndex; if (typeof idx === 'number' && months[idx]) onSelectMonth(months[idx].monthKey); }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={percent ? 46 : 62}
                  tickFormatter={percent ? (v: number) => `${v}%` : formatCompact} />
                {percent && <ReferenceLine y={100} stroke="var(--red)" strokeDasharray="4 4" />}
                <Tooltip {...TOOLTIP_PROPS} cursor={{ stroke: 'var(--separator-opaque)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as Record<string, number | string | null | boolean> | undefined) : undefined;
                    if (!row) return null;
                    const i = months.findIndex((m) => m.monthKey === row.monthKey);
                    return (
                      <ChartTooltipBox title={monthKeyToLabel(String(row.monthKey))}>
                        {!row.hasData ? <TooltipRow label="Sem informação neste mês" value="" muted /> : mode === 'compare' ? (
                          <>
                            <TooltipRow color={SPEND_COLOR} label="Gasto" value={formatCurrency(Number(row.totalSpent ?? 0))} />
                            {row.totalLimit !== null
                              ? <TooltipRow color="var(--text-quaternary)" label="Orçamento" value={formatCurrency(Number(row.totalLimit))} detail={total[i].pct !== null ? `${Math.round(total[i].pct ?? 0)}%` : undefined} />
                              : <TooltipRow label="Sem orçamento neste mês" value="" muted />}
                          </>
                        ) : selection.map((k) => {
                          const p: HistoryPoint | undefined = series.get(k)?.[i];
                          if (!p) return null;
                          return (
                            <TooltipRow key={k} color={colorOf(k)} label={labelOf(k)}
                              value={percent ? (p.pct === null ? 'sem orçamento' : `${Math.round(p.pct)}%`) : formatCurrency(p.spent ?? 0)}
                              detail={percent ? undefined : p.limit !== null ? `de ${formatCompact(p.limit)}` : undefined}
                              muted={percent && p.pct === null} />
                          );
                        })}
                      </ChartTooltipBox>
                    );
                  }} />

                {mode === 'compare' ? (
                  <>
                    <Bar dataKey="totalLimit" name="Orçamento" fill="var(--text-quaternary)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                    <Bar dataKey="totalSpent" name="Gasto" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                  </>
                ) : selection.map((k) => (
                  <Line key={k} type="monotone" dataKey={`${percent ? 'pct' : 'spent'}:${k}`} name={labelOf(k)} stroke={colorOf(k)} strokeWidth={2.5}
                    dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
                ))}
                {mode === 'values' && single && (
                  <Line type="stepAfter" dataKey={`limit:${single}`} name="Orçamento" stroke="var(--text-tertiary)" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="cx-note">
            Meses sem lançamentos ficam em branco (sem informação). {mode === 'values' && !single ? 'Escolha só uma categoria para ver a linha do orçamento. ' : ''}
            {mode === 'pct' ? 'A linha vermelha é o limite (100%); meses sem orçamento não têm percentual. ' : ''}
            Clique num ponto para abrir o mês.
          </p>

          {/* Tabela como complemento, recolhida para não concorrer com o gráfico */}
          <details className="cx-details">
            <summary>Ver tabela de consumo por mês</summary>
            <div className="budget-history-scroll">
              <table className="budget-history">
                <thead>
                  <tr>
                    <th scope="col">Categoria</th>
                    {months.map((m) => (
                      <th key={m.monthKey} scope="col">
                        <button type="button" onClick={() => onSelectMonth(m.monthKey)} className={m.monthKey === selectedMonth ? 'is-selected' : undefined} title={monthKeyToLabel(m.monthKey)}>
                          {monthLabel(m.monthKey)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selection.map((k) => (
                    <tr key={k}>
                      <th scope="row">{k.includes(' › ') ? <><span className="budget-history-branch" aria-hidden>└ </span>{labelOf(k)}</> : k}</th>
                      {(series.get(k) ?? []).map((p, i) => (
                        <td key={months[i].monthKey} className={months[i].monthKey === selectedMonth ? 'is-selected' : undefined}
                          title={p.spent === null ? 'Sem informação' : p.limit === null ? `${formatCurrency(p.spent)}, sem orçamento` : `${formatCurrency(p.spent)} de ${formatCurrency(p.limit)}`}>
                          {p.spent === null ? <span className="cx-muted">—</span>
                            : p.pct === null ? <span className="cx-muted">{formatCompact(p.spent)}</span>
                              : <span className="cx-cell-pct" style={{ color: p.pct > 100 ? 'var(--red)' : p.pct > 90 ? 'var(--orange)' : 'var(--text-primary)' }}>{Math.round(p.pct)}%</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cx-note">Percentual onde havia orçamento; valor em cinza onde só houve gasto; “—” sem informação.</p>
          </details>
        </>
      )}
    </section>
  );
}
