'use client';

import { useState } from 'react';
import { ReceiptText, CalendarDays, List, CheckCircle2 } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import ScrollArea from '@/components/ui/ScrollArea';
import TransactionList from '@/components/transactions/TransactionList';
import { walletFace, bankLogoSrc } from '@/components/cards/WalletCardFace';
import { formatCurrency, monthKeyToLabel } from '@/lib/currency';
import type { CardWithRealData } from '@/lib/creditCards';
import type { Transaction } from '@/lib/types';

const VIEW_TABS = [
  { id: 'month', label: 'Fatura do mês', icon: CalendarDays },
  { id: 'all', label: 'Todas', icon: List },
] as const;

type View = (typeof VIEW_TABS)[number]['id'];

/** Mesma altura máxima das listas do dashboard; o excedente rola dentro do card */
const LIST_MAX_HEIGHT = 440;

const sumAmounts = (txs: Transaction[]) => txs.reduce((sum, t) => sum + t.amount, 0);

function transactionsInView(card: CardWithRealData, view: View, selectedMonth: string): Transaction[] {
  return view === 'month'
    ? card.cardTransactions.filter((t) => t.monthKey === selectedMonth)
    : card.cardTransactions;
}

/** Meses do mais recente (ou parcela futura) para o mais antigo, como um extrato */
function groupByMonth(txs: Transaction[]): { monthKey: string; txs: Transaction[] }[] {
  const byMonth = new Map<string, Transaction[]>();
  for (const t of txs) byMonth.set(t.monthKey, [...(byMonth.get(t.monthKey) ?? []), t]);
  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthTxs]) => ({ monthKey, txs: monthTxs }));
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

/** Situação de um grupo (mês): "Paga" ou quanto falta pagar */
function PaidStatus({ txs }: { txs: Transaction[] }) {
  const open = sumAmounts(txs.filter((t) => !t.isPaid));
  if (open === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: 11, fontWeight: 600, background: 'var(--green-light)', padding: '2px 6px', borderRadius: 10 }}>
        <CheckCircle2 size={12} strokeWidth={2.5} />
        Paga
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--orange)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {formatCurrency(open)} a pagar
    </span>
  );
}

interface CardTransactionsSectionProps {
  cards: CardWithRealData[];
  selectedMonth: string;
}

/**
 * Compras de cada cartão com a situação de pagamento: a fatura do mês selecionado
 * ou todas, mês a mês, na ordem em que foram lançadas. Só leitura: pagar, editar e
 * excluir ficam nas outras telas.
 */
export default function CardTransactionsSection({ cards, selectedMonth }: CardTransactionsSectionProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [view, setView] = useState<View>('month');

  if (cards.length === 0) return null;

  // Ainda não escolhido (ou excluído): o primeiro na ordem atual dos cartões
  const card = cards.find((c) => c.id === selectedCardId) ?? cards[0];
  const shown = transactionsInView(card, view, selectedMonth);
  const total = sumAmounts(shown);
  const paid = sumAmounts(shown.filter((t) => t.isPaid));
  const monthLabel = monthKeyToLabel(selectedMonth);

  return (
    <SectionCard
      icon={ReceiptText}
      title="Transações por Cartão"
      description={view === 'month'
        ? `Compras lançadas em cada cartão em ${monthLabel}`
        : 'Todas as compras lançadas em cada cartão, mês a mês'}
      actions={<SegmentedTabs tabs={VIEW_TABS} value={view} onChange={setView} />}
    >
      {/* Seletor de cartão em miniaturas da face (como a Carteira do iPhone): o selecionado
          fica em destaque e, embaixo do nome, quantas compras ainda faltam pagar */}
      <div className="card-picker" role="group" aria-label="Escolher cartão">
        {cards.map((c) => {
          const isActive = c.id === card.id;
          const { bank, isLight, style } = walletFace(c);
          const inView = transactionsInView(c, view, selectedMonth);
          const openCount = inView.filter((t) => !t.isPaid).length;
          const status = inView.length === 0 ? 'Sem compras' : openCount > 0 ? `${openCount} a pagar` : 'Em dia';
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCardId(c.id)}
              aria-pressed={isActive}
              className={`card-picker-item${isActive ? ' active' : ''}`}
            >
              <span className={`card-picker-face${isLight ? ' is-light' : ''}`} style={style}>
                {bank && (
                  // eslint-disable-next-line @next/next/no-img-element -- favicon externo, sem otimização
                  <img
                    className="card-picker-logo"
                    src={bankLogoSrc(bank.domain)}
                    alt=""
                    width={13}
                    height={13}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </span>
              <span className="card-picker-name">{c.name}</span>
              <span className="card-picker-status">{status}</span>
            </button>
          );
        })}
      </div>

      {/* Resumo do cartão */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        marginBottom: 4,
        borderTop: '1px solid var(--separator)',
        borderBottom: '1px solid var(--separator)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24, rowGap: 8 }}>
          <Stat label={view === 'month' ? 'Fatura' : 'Total'} value={total} />
          <Stat label="Pago" value={paid} color="var(--green)" />
          <Stat label="A pagar" value={total - paid} color={total - paid > 0 ? 'var(--orange)' : undefined} />
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-tertiary)', fontSize: 14 }}>
          {view === 'month'
            ? `Nenhuma compra no cartão ${card.name} em ${monthLabel}.`
            : `Nenhuma compra lançada no cartão ${card.name}.`}
          <div style={{ fontSize: 13, marginTop: 4 }}>Escolha o cartão ao lançar uma transação para ela aparecer aqui.</div>
        </div>
      ) : view === 'month' ? (
        <TransactionList transactions={shown} showDelete={false} order="added" maxHeight={LIST_MAX_HEIGHT} />
      ) : (
        <ScrollArea maxHeight={LIST_MAX_HEIGHT}>
          {groupByMonth(shown).map(({ monthKey, txs }, index) => (
            <div key={monthKey} style={{ borderTop: index > 0 ? '1px solid var(--separator)' : 'none', paddingBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 0 4px' }}>
                <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>
                  {monthKeyToLabel(monthKey)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(sumAmounts(txs))}
                  </span>
                  <PaidStatus txs={txs} />
                </div>
              </div>
              <TransactionList transactions={txs} showDelete={false} order="added" />
            </div>
          ))}
        </ScrollArea>
      )}
    </SectionCard>
  );
}
