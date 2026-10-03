'use client';

import { useState } from 'react';
import { ComposedChart, Bar, BarStack, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { addMonths, formatCompact, formatCurrency } from '@/lib/currency';
import { commitmentRatio, monthFullLabel, monthName, type MonthBreakdown } from '@/lib/financialAnalysis';
import type { CreditCard } from '@/lib/types';
import {
  CHART_MARGIN, ChartLegend, Dot, HighlightCard, HighlightGrid, TooltipCard, TooltipDivider, TooltipLine,
  gridStyle, monthTickInterval, xAxisStyle, yAxisStyle,
} from './FinanceChartParts';

const LEGEND = [
  { key: 'cards', name: 'Cartões (parcelas e faturas)', color: 'var(--blue)' },
  { key: 'other', name: 'Demais compromissos', color: 'var(--orange)' },
  { key: 'income', name: 'Renda registrada', color: 'var(--green)', dashed: true },
];

/** Etiqueta do mês: verde com folga, laranja perto do limite, vermelho acima da renda */
function commitmentBadge(ratio: number | null) {
  if (ratio === null) return undefined;
  const text = `${(ratio * 100).toFixed(0)}% da renda`;
  if (ratio >= 1) return { text, color: 'var(--red)', background: 'var(--red-light)' };
  if (ratio >= 0.7) return { text, color: 'var(--orange)', background: 'var(--orange-light)' };
  return { text, color: 'var(--green)', background: 'var(--green-light)' };
}

interface FutureCommitmentChartProps {
  /** Do mês de partida em diante; o primeiro é o mês em andamento */
  breakdowns: MonthBreakdown[];
  cards: CreditCard[];
  /** Último mês com compra no cartão lançada (pode estar além da janela do gráfico) */
  lastCardMonth: string | null;
  tickLabel: (monthKey: string) => string;
}

/**
 * Compromissos já lançados (parcelas, faturas e contas copiadas para meses futuros)
 * contra a renda registrada em cada mês. A renda não é estimada: mês sem renda lançada
 * fica sem a linha.
 */
export default function FutureCommitmentChart({ breakdowns, cards, lastCardMonth, tickLabel }: FutureCommitmentChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const rows = breakdowns.map((b) => ({
    month: tickLabel(b.monthKey),
    breakdown: b,
    // valor negativo (estorno maior que as compras) não vira barra
    cards: Math.max(0, b.cardTotal),
    other: Math.max(0, b.otherExpenses),
    income: b.income > 0 ? b.income : null,
  }));

  // Destaques olham só para os meses seguintes: o primeiro já está em andamento
  const ahead = breakdowns.slice(1);
  const next = ahead[0] ?? breakdowns[0];
  const nextRatio = commitmentRatio(next);
  const aheadCards = ahead.reduce((sum, b) => sum + Math.max(0, b.cardTotal), 0);
  const cardName = (cardId: string) => cards.find((c) => c.id === cardId)?.name ?? 'Cartão excluído';
  const legend = LEGEND.filter((entry) => entry.key !== 'income' || rows.some((r) => r.income !== null));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Destaques ── */}
      <HighlightGrid>
        <HighlightCard
          marker={<CalendarClock size={12} color="var(--blue)" />}
          label={`JÁ COMPROMETIDO EM ${monthName(next.monthKey).toUpperCase()}`}
          value={formatCurrency(next.expenses)}
          detail={nextRatio === null ? 'Sem renda registrada para o mês' : `${(nextRatio * 100).toFixed(0)}% da renda registrada`}
          detailColor={nextRatio === null ? undefined : nextRatio >= 1 ? 'var(--red)' : nextRatio >= 0.7 ? 'var(--orange)' : 'var(--green)'}
        />
        <HighlightCard
          marker={<Dot color="var(--blue)" />}
          label="PARCELAS NOS CARTÕES"
          value={formatCurrency(aheadCards)}
          detail={ahead.length > 0 ? `de ${monthName(ahead[0].monthKey)} a ${monthName(ahead[ahead.length - 1].monthKey)}` : undefined}
        />
        <HighlightCard
          marker={<ShieldCheck size={12} color="var(--text-secondary)" />}
          label="CARTÕES LIVRES A PARTIR DE"
          value={lastCardMonth ? monthFullLabel(addMonths(lastCardMonth, 1)).replace(' de ', ' ') : '—'}
          detail={lastCardMonth ? `última parcela lançada em ${monthName(lastCardMonth)}` : 'Nenhuma compra no cartão lançada adiante'}
        />
      </HighlightGrid>

      {/* ── Barras: cartões + demais; linha tracejada: renda registrada ── */}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={CHART_MARGIN}>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="month" {...xAxisStyle} interval={monthTickInterval(rows.length)} />
            <YAxis {...yAxisStyle} tickFormatter={formatCompact} />

            <Tooltip
              cursor={{ fill: 'var(--separator)', opacity: 0.4 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                if (!active || !row) return null;
                const b = row.breakdown;
                const ratio = commitmentRatio(b);
                const byCard = Object.entries(b.byCard).filter(([, value]) => value !== 0);
                return (
                  <TooltipCard title={monthFullLabel(b.monthKey)} badge={commitmentBadge(ratio)}>
                    <TooltipLine color="var(--blue)" label="Cartões:" value={formatCurrency(b.cardTotal)} />
                    {byCard.map(([cardId, value]) => (
                      <TooltipLine key={cardId} sub label={cardName(cardId)} value={formatCurrency(value)} />
                    ))}
                    <TooltipLine color="var(--orange)" label="Demais compromissos:" value={formatCurrency(b.otherExpenses)} />
                    <TooltipDivider />
                    <TooltipLine label="Total comprometido:" value={formatCurrency(b.expenses)} />
                    {ratio === null ? (
                      <TooltipLine color="var(--green)" label="Renda registrada:" value="—" />
                    ) : (
                      <>
                        <TooltipLine color="var(--green)" label="Renda registrada:" value={formatCurrency(b.income)} valueColor="var(--green)" />
                        <TooltipLine
                          label={b.balance >= 0 ? 'Livre:' : 'Acima da renda:'}
                          value={formatCurrency(Math.abs(b.balance))}
                          valueColor={b.balance >= 0 ? 'var(--green)' : 'var(--red)'}
                        />
                      </>
                    )}
                  </TooltipCard>
                );
              }}
            />

            <BarStack radius={[6, 6, 0, 0]}>
              <Bar dataKey="cards" name="Cartões" fill="var(--blue)" fillOpacity={0.85} maxBarSize={24} hide={hidden.has('cards')} />
              <Bar dataKey="other" name="Demais compromissos" fill="var(--orange)" fillOpacity={0.85} maxBarSize={24} hide={hidden.has('other')} />
            </BarStack>

            <Line
              type="monotone"
              dataKey="income"
              name="Renda registrada"
              stroke="var(--green)"
              strokeWidth={2}
              strokeDasharray="4 4"
              connectNulls={false}
              hide={hidden.has('income')}
              // sem o '0', os pontos herdariam o tracejado da linha
              dot={{ r: 3, fill: 'var(--green)', stroke: 'var(--surface)', strokeWidth: 1.5, strokeDasharray: '0' }}
              activeDot={{ r: 5, fill: 'var(--green)', stroke: '#FFF', strokeWidth: 2, strokeDasharray: '0' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend entries={legend} hidden={hidden} onToggle={toggle} />
    </div>
  );
}
