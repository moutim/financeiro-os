'use client';

import type { Transaction } from '@/lib/types';
import { useCategoryTaxonomy } from '@/lib/taxonomy';
import { formatCurrency } from '@/lib/currency';

interface SubTransactionsGroupsProps {
  transaction: Transaction;
}

/**
 * Sub-transações no mesmo estilo das linhas de transação, recuadas sob uma linha-guia
 * que indica que fazem parte da transação acima. Sempre expandidas.
 */
export default function SubTransactionsGroups({ transaction: tx }: SubTransactionsGroupsProps) {
  const taxonomy = useCategoryTaxonomy();

  const subs = tx.subTransactions ?? [];
  if (subs.length === 0) return null;

  return (
    <div style={{ margin: '0 0 6px 14px', paddingLeft: 12, borderLeft: '2px solid var(--separator)' }}>
      {subs.map((st, idx) => {
        // sub sem categoria própria segue a da transação
        const view = taxonomy.normalize({
          ...tx,
          name: st.name,
          category: st.category || tx.category,
          subcategory: st.category ? st.subcategory ?? null : tx.subcategory,
        });
        const cfg = taxonomy.getConfig(view.category);
        return (
          <div
            key={st.id ?? idx}
            className="transaction-item"
            style={{ padding: '6px 0', borderBottom: idx === subs.length - 1 ? 'none' : undefined }}
          >
            <div
              className="transaction-icon"
              style={{ background: cfg.color, color: '#FFF', width: 24, height: 24, borderRadius: 6 }}
            >
              <cfg.icon size={12} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="transaction-main">
                <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</span>
                  {st.installments && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 6px', borderRadius: 4, marginLeft: 6, flexShrink: 0 }}>
                      {st.installments}
                    </span>
                  )}
                </div>
                <span className="transaction-category">
                  <span className="transaction-category-dot">•</span>
                  <span className="transaction-category-label">
                    {cfg.label}{view.subcategory && view.subcategory !== cfg.label ? ` › ${view.subcategory}` : ''}
                  </span>
                </span>
              </div>
            </div>
            <div className="transaction-amount" style={{ fontSize: 13 }}>{formatCurrency(st.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}
