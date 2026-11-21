'use client';

import { formatCurrency } from '@/lib/currency';
import { SIMULATION_ID_PREFIX, type CommitmentItem, type CommitmentKind, type MonthProjection } from '@/lib/projection/engine';
import type { CreditCard } from '@/lib/types';
import { BASIS_LABEL, KIND_COLOR, KIND_LABEL, pct, shortMonth } from './shared';

const KINDS: CommitmentKind[] = ['installments', 'fixed', 'other'];

function Line({ label, value, color, strong }: { label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, padding: '4px 0' }}>
      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {color && <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />}
        {label}
      </span>
      <span style={{ fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  );
}

function sourceNote(item: CommitmentItem): string | null {
  if (item.id.startsWith(SIMULATION_ID_PREFIX)) return 'simulação';
  if (item.source === 'recurrence') return 'estimado por recorrência';
  return null;
}

/** Composição completa de um mês: totais por categoria e as compras/despesas que formam cada valor */
export default function MonthDetail({ month, cards }: { month: MonthProjection; cards: Pick<CreditCard, 'id' | 'name'>[] }) {
  const cardName = (id: string | null) => (id ? cards.find((c) => c.id === id)?.name ?? null : null);
  const hasIncome = month.committedPct !== null;

  return (
    <div className="planning-detail animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{shortMonth(month.monthKey)}</h3>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{BASIS_LABEL[month.basis]}</span>
      </div>

      <div className="planning-detail-grid">
        <div>
          <Line
            label={month.incomeSource === 'recurrence' ? 'Salário líquido previsto' : 'Salário líquido'}
            value={hasIncome ? formatCurrency(month.income) : '—'}
            strong
          />
          {KINDS.map((k) => (
            <Line key={k} color={KIND_COLOR[k]} label={KIND_LABEL[k]} value={formatCurrency(month[k])} />
          ))}
          <div style={{ borderTop: '1px solid var(--separator)', margin: '8px 0' }} />
          <Line
            label="Total comprometido"
            value={`${formatCurrency(month.committed)}${hasIncome ? ` · ${pct(month.committedPct ?? 0)}` : ''}`}
            strong
          />
          <Line
            label="Renda livre estimada"
            color={KIND_COLOR.free}
            value={month.free === null ? '—' : formatCurrency(month.free)}
            strong
          />
          {!hasIncome && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              Nenhum salário (renda recorrente) lançado até este mês: percentual e renda livre não podem ser calculados.
            </p>
          )}
          {month.extraIncome > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              Rendas extras de {formatCurrency(month.extraIncome)} não entram no cálculo (não são salário recorrente).
            </p>
          )}
        </div>

        <div className="planning-detail-items">
          {month.items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>Nenhum compromisso lançado neste mês.</p>
          ) : (
            KINDS.map((k) => {
              const items = month.items.filter((i) => i.kind === k);
              if (items.length === 0) return null;
              return (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: KIND_COLOR[k], marginBottom: 4 }}>
                    {KIND_LABEL[k]} · {items.length}
                  </div>
                  {items.map((i) => {
                    const note = sourceNote(i);
                    const card = cardName(i.cardId);
                    return (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '3px 0' }}>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 500 }}>{i.name}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {i.installment ? ` · ${i.installment}` : ''}{card ? ` · ${card}` : ''}{note ? ` · ${note}` : ''}{i.isPaid ? ' · pago' : ''}
                          </span>
                        </span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(i.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
