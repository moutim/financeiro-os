'use client';

import { formatCurrency } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import ScrollArea from '@/components/ui/ScrollArea';
import type { CategoryConfig, Transaction } from '@/lib/types';

interface CategoryTransactionsModalProps {
  category: string;
  /** Lançamentos da categoria, já divididos por sub-transação e sem estornos */
  transactions: Transaction[];
  total: number;
  config: CategoryConfig;
  onClose: () => void;
}

/** "12 out" a partir da data ISO da transação; vazio quando ela não tem data */
function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Lançamentos de uma categoria do gráfico "Por Categoria", do maior para o menor valor */
export default function CategoryTransactionsModal({ category, transactions, total, config, onClose }: CategoryTransactionsModalProps) {
  const swipeToClose = useSwipeToClose(onClose);
  const items = [...transactions].sort((a, b) => b.amount - a.amount);

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="transaction-icon"
              style={{ background: config.color, color: '#FFF', width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}
            >
              <config.icon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                {items.length} {items.length === 1 ? 'lançamento' : 'lançamentos'}
              </p>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatCurrency(total)}
            </div>
          </div>
        </div>

        <div className="grouped-list">
          <ScrollArea maxHeight="min(60vh, 420px)">
            {items.map((t) => {
              const detail = [t.subcategory && t.subcategory !== category ? t.subcategory : '', shortDate(t.date), t.installments ?? '']
                .filter(Boolean)
                .join(' · ');
              return (
                <div key={t.id} className="grouped-row" style={{ padding: '8px 16px', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    {detail && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{detail}</div>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>

        <button type="button" className="btn-primary" onClick={onClose} style={{ width: '100%', marginTop: 16 }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
