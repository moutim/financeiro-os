'use client';

import { useMemo } from 'react';
import { CreditCard as CardIcon, Gauge, Landmark, PiggyBank, ReceiptText, Wallet, CalendarClock, Layers } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { formatCurrency } from '@/lib/currency';
import { buildCardsWithRealData } from '@/lib/creditCards';
import { useFinanceStore } from '@/lib/store';
import type { CommitmentBands, MonthProjection } from '@/lib/projection/engine';
import { BAND_COLOR, BAND_LABEL, bandOf, pct, shortMonth } from './shared';

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function Tile({ icon, label, value, sub, color = 'var(--blue)' }: TileProps) {
  return (
    <GlassCard padding="16px" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, overflowWrap: 'anywhere' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
    </GlassCard>
  );
}

interface Props {
  /** Mês atual da projeção */
  current: MonthProjection | undefined;
  currentMonthKey: string;
  futureInstallments: number;
  bands: CommitmentBands;
}

/**
 * Resumo do mês atual. Separa renda recebida, despesas pagas (realizadas) e previstas
 * (ainda não pagas), e mostra o limite de crédito à parte: limite não é dinheiro em conta.
 */
export default function SummaryStrip({ current, currentMonthKey, futureInstallments, bands }: Props) {
  const cards = useFinanceStore((s) => s.cards);
  const transactions = useFinanceStore((s) => s.transactions);
  const incomes = useFinanceStore((s) => s.incomes);

  const credit = useMemo(() => {
    const real = buildCardsWithRealData(cards, transactions, currentMonthKey);
    const limit = real.reduce((s, c) => s + c.limit, 0);
    const used = real.reduce((s, c) => s + c.realUsed, 0);
    return { limit, available: Math.max(0, limit - used), count: real.length };
  }, [cards, transactions, currentMonthKey]);

  if (!current) return null;

  const received = incomes
    .filter((i) => i.monthKey === currentMonthKey && i.isRecurring && !i.parentId && i.isPaid)
    .reduce((s, i) => s + i.amount, 0);
  const paid = current.items.filter((i) => i.isPaid).reduce((s, i) => s + i.amount, 0);
  const planned = current.committed - paid;
  const invoices = current.items.filter((i) => i.cardId).reduce((s, i) => s + i.amount, 0);
  const hasIncome = current.committedPct !== null;
  const band = bandOf(current, bands);

  return (
    <div className="planning-summary stagger">
      <Tile icon={<Wallet size={16} />} label="Salário líquido" color="var(--green)"
        value={hasIncome ? formatCurrency(current.income) : '—'}
        sub={hasIncome ? `Recebido: ${formatCurrency(received)}` : 'Lance uma renda recorrente'} />
      <Tile icon={<ReceiptText size={16} />} label="Compromissos do mês" color="var(--orange)"
        value={formatCurrency(current.committed)}
        sub={`Pago ${formatCurrency(paid)} · Previsto ${formatCurrency(planned)}`} />
      <Tile icon={<CardIcon size={16} />} label="Faturas de cartão" color="var(--indigo)"
        value={formatCurrency(invoices)} sub="Já inclusa nos compromissos" />
      <Tile icon={<CalendarClock size={16} />} label="Parcelas futuras" color="var(--orange)"
        value={formatCurrency(futureInstallments)} sub={`Após ${shortMonth(currentMonthKey)}, ainda a pagar`} />
      <Tile icon={<Gauge size={16} />} label="Comprometimento da renda"
        color={band ? BAND_COLOR[band] : 'var(--text-tertiary)'}
        value={hasIncome ? pct(current.committedPct ?? 0) : '—'}
        sub={band ? `Faixa ${BAND_LABEL[band].toLowerCase()}` : 'Sem salário de referência'} />
      <Tile icon={<PiggyBank size={16} />} label="Renda livre estimada" color="var(--green)"
        value={current.free === null ? '—' : formatCurrency(current.free)}
        sub="Antes de gastos variáveis não lançados" />
      <Tile icon={<Landmark size={16} />} label="Limite total de crédito" color="var(--blue)"
        value={credit.count ? formatCurrency(credit.limit) : '—'}
        sub={credit.count ? `${credit.count} ${credit.count === 1 ? 'cartão' : 'cartões'}` : 'Nenhum cartão cadastrado'} />
      <Tile icon={<Layers size={16} />} label="Limite disponível" color="var(--blue)"
        value={credit.count ? formatCurrency(credit.available) : '—'}
        sub="Crédito, não é dinheiro em conta" />
    </div>
  );
}
