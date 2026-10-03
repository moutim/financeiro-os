'use client';

import { useId, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { formatCompact, formatCurrency } from '@/lib/currency';
import { monthFullLabel, monthName, type MonthBreakdown } from '@/lib/financialAnalysis';
import {
  CHART_MARGIN, ChartLegend, Dot, HighlightCard, HighlightGrid, TooltipCard, TooltipLine,
  gridStyle, monthTickInterval, svgId, xAxisStyle, yAxisStyle,
} from './FinanceChartParts';

// Renda verde e gastos vermelhos, como nas listas do app; o saldo na cor do usuário
const SERIES = [
  { key: 'income', name: 'Renda', color: 'var(--green)' },
  { key: 'expenses', name: 'Gastos', color: 'var(--red)' },
  { key: 'balance', name: 'Saldo', color: 'var(--blue)' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

interface FinancialEvolutionChartProps {
  breakdowns: MonthBreakdown[];
  tickLabel: (monthKey: string) => string;
}

const average = (values: number[]) => (values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);

/** Renda, gastos e saldo mês a mês (mesmas contas dos cards do dashboard) */
export default function FinancialEvolutionChart({ breakdowns, tickLabel }: FinancialEvolutionChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const gradientId = useId();

  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const rows = breakdowns.map((b) => ({
    monthKey: b.monthKey,
    month: tickLabel(b.monthKey),
    income: b.income,
    expenses: b.expenses,
    balance: b.balance,
  }));

  const withData = breakdowns.filter((b) => b.hasData);
  const latest = breakdowns[breakdowns.length - 1];
  const previous = breakdowns.slice(0, -1).filter((b) => b.hasData);
  const avgIncome = average(withData.map((b) => b.income));
  const avgExpenses = average(withData.map((b) => b.expenses));
  const avgPreviousExpenses = average(previous.map((b) => b.expenses));
  const avgBalance = average(withData.map((b) => b.balance));
  // Gasto do mês selecionado contra a média dos meses anteriores do período
  const expenseChange = previous.length > 0 && avgPreviousExpenses > 0 ? latest.expenses / avgPreviousExpenses - 1 : null;
  const latestName = monthName(latest.monthKey);
  const hasNegative = !hidden.has('balance') && rows.some((r) => r.balance < 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Destaques ── */}
      <HighlightGrid>
        <HighlightCard
          marker={<Dot color="var(--green)" />}
          label="RENDA MÉDIA"
          value={formatCurrency(avgIncome)}
          valueColor="var(--green)"
          detail={`por mês, em ${withData.length} meses`}
        />
        <HighlightCard
          marker={<Dot color="var(--red)" />}
          label="GASTO MÉDIO"
          value={formatCurrency(avgExpenses)}
          detail={expenseChange === null ? 'por mês no período' : (
            <>
              {expenseChange > 0 ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
              {latestName}: {Math.abs(expenseChange * 100).toFixed(0)}% {expenseChange > 0 ? 'acima' : 'abaixo'} da média
            </>
          )}
          detailColor={expenseChange === null ? undefined : expenseChange > 0 ? 'var(--red)' : 'var(--green)'}
        />
        <HighlightCard
          marker={<Wallet size={12} color="var(--blue)" />}
          label={`SALDO EM ${latestName.toUpperCase()}`}
          value={formatCurrency(latest.balance)}
          valueColor={latest.balance >= 0 ? 'var(--green)' : 'var(--red)'}
          detail={`Média do período: ${formatCurrency(avgBalance)}`}
        />
      </HighlightGrid>

      {/* ── Curvas ── */}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id={svgId(gradientId, 'evo-income')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={svgId(gradientId, 'evo-expenses')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--red)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--red)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="month" {...xAxisStyle} interval={monthTickInterval(rows.length)} />
            <YAxis {...yAxisStyle} tickFormatter={formatCompact} />
            {hasNegative && <ReferenceLine y={0} stroke="var(--separator-opaque)" />}

            <Tooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                if (!active || !row) return null;
                const freePct = row.income > 0 ? (row.balance / row.income) * 100 : null;
                return (
                  <TooltipCard
                    title={monthFullLabel(row.monthKey)}
                    badge={freePct === null ? undefined : freePct >= 0
                      ? { text: `${freePct.toFixed(0)}% livre`, color: 'var(--green)', background: 'var(--green-light)' }
                      : { text: 'Acima da renda', color: 'var(--red)', background: 'var(--red-light)' }}
                  >
                    {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
                      <TooltipLine
                        key={s.key}
                        color={s.color}
                        label={`${s.name}:`}
                        value={formatCurrency(row[s.key as SeriesKey])}
                        valueColor={s.key === 'income' ? 'var(--green)' : s.key === 'balance' && row.balance < 0 ? 'var(--red)' : undefined}
                      />
                    ))}
                  </TooltipCard>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="income"
              name="Renda"
              stroke="var(--green)"
              strokeWidth={2.8}
              fill={`url(#${svgId(gradientId, 'evo-income')})`}
              hide={hidden.has('income')}
              dot={{ r: 4, fill: 'var(--green)', stroke: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--green)', stroke: '#FFF', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Gastos"
              stroke="var(--red)"
              strokeWidth={2.4}
              fill={`url(#${svgId(gradientId, 'evo-expenses')})`}
              hide={hidden.has('expenses')}
              dot={{ r: 4, fill: 'var(--red)', stroke: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--red)', stroke: '#FFF', strokeWidth: 2 }}
            />
            {/* saldo só como linha: preenchido, cobriria as outras duas áreas */}
            <Area
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="var(--blue)"
              strokeWidth={2}
              fill="none"
              hide={hidden.has('balance')}
              dot={{ r: 3, fill: 'var(--blue)', stroke: 'var(--surface)', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: 'var(--blue)', stroke: '#FFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend entries={SERIES.map((s) => ({ key: s.key, name: s.name, color: s.color }))} hidden={hidden} onToggle={toggle} />
    </div>
  );
}
