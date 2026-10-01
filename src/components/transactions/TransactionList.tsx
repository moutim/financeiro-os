'use client';

import { useState } from 'react';
import { Inbox, Trash2, Pencil, Check } from 'lucide-react';

import type { Transaction } from '@/lib/types';
import { useCategoryTaxonomy } from '@/lib/taxonomy';
import { formatCurrency } from '@/lib/currency';
import { useFinanceStore } from '@/lib/store';
import TransactionEditModal from './TransactionEditModal';
import TransactionDeleteModal from './TransactionDeleteModal';

interface TransactionListProps {
  transactions: Transaction[];
  showDelete?: boolean;
}

export default function TransactionList({ transactions, showDelete = true }: TransactionListProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const taxonomy = useCategoryTaxonomy();

  if (transactions.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px 0',
        color: 'var(--text-tertiary)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text-tertiary)' }}>
          <Inbox size={48} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Nenhuma transação</div>
        <div style={{ fontSize: 15, marginTop: 4 }}>Adicione uma nova transação</div>
      </div>
    );
  }

  // `view` traz a categoria no formato do modo atual (só exibição); `tx` segue
  // original para edição e exclusão.
  const sortedRows = transactions
    .map((tx) => ({ tx, view: taxonomy.normalize(tx) }))
    .sort(({ view: a }, { view: b }) => {
      if (a.category === 'Fixos' && b.category !== 'Fixos') return -1;
      if (a.category !== 'Fixos' && b.category === 'Fixos') return 1;
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return 0;
    });

  return (
    <div>
      {sortedRows.map(({ tx, view }, i) => {
        const cfg = taxonomy.getConfig(view.category);
        return (
          <div
            key={tx.id}
            className="transaction-item animate-fade-in-up"
            style={{ 
              animationDelay: `${i * 40}ms`, 
              opacity: 0, 
              padding: tx.isPaid ? '8px 12px' : '8px 0', 
              margin: tx.isPaid ? '4px -12px' : '0',
              borderRadius: tx.isPaid ? 8 : 0,
              background: tx.isPaid ? 'var(--green-light)' : 'transparent',
              alignItems: 'center', 
              filter: tx.isPaid ? 'opacity(0.7)' : 'none' 
            }}
          >
            <div
              className="transaction-icon"
              style={{ background: cfg.color, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8 }}
            >
              <cfg.icon size={14} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="transaction-name" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {(() => {
                    const nameMatch = tx.name.match(/^(.*?)\s*\(?(?:2025|2026)-\d{2}-\d{2}(?: 00:00:00)?\)?$/);
                    const baseName = nameMatch ? nameMatch[1] : tx.name;
                    
                    let inst = tx.installments;
                    
                    // Se a parcela ou o nome contiverem a data maluca do excel (ex: 2026-04-01), formatamos pra 1/4 no visual
                    const rawInst = inst || tx.name;
                    const dateMatch = rawInst.match(/(?:2025|2026)-(\d{2})-(\d{2})/);
                    if (dateMatch) {
                      inst = `${parseInt(dateMatch[2], 10)}/${parseInt(dateMatch[1], 10)}`;
                    } else if (!inst) {
                      const fractionMatch = tx.name.match(/(\d+\/\d+)$/);
                      if (fractionMatch) inst = fractionMatch[1];
                    }

                    // Limpa qualquer (1/4) do baseName caso a parcela já tenha sido extraída
                    const cleanName = baseName.replace(/\s*\(\d+\/\d+\)$/, '').replace(/\s+\d+\/\d+$/, '');

                    return (
                      <>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cleanName}</span>
                        {inst && (
                          <span style={{ 
                            fontSize: 10, 
                            fontWeight: 700, 
                            background: 'var(--blue-light)', 
                            color: 'var(--blue)', 
                            padding: '2px 6px', 
                            borderRadius: 4, 
                            marginLeft: 6,
                            flexShrink: 0
                          }}>
                            {inst}
                          </span>
                        )}
                        {tx.isPaid && (
                          <Check size={14} color="var(--green)" style={{ marginLeft: 4, flexShrink: 0 }} />
                        )}
                      </>
                    );
                  })()}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                  • {cfg.label}{view.subcategory && view.subcategory !== cfg.label ? ` › ${view.subcategory}` : ''}
                  {taxonomy.mode === 'detailed' && view.recurrency === 'Fixo' && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4, marginLeft: 2 }}>
                      Fixo
                    </span>
                  )}
                </span>
              </div>
              
              {tx.subTransactions && tx.subTransactions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, gap: 1 }}>
                  {tx.subTransactions.map((st, idx) => (
                    <span key={idx} style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ↳ {st.name}{st.installments ? ` (${st.installments})` : ''} • {formatCurrency(st.amount)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className="transaction-amount"
                style={{ color: tx.amount < 0 ? 'var(--green)' : 'var(--text-primary)', fontSize: 14 }}
              >
                {tx.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
              </div>
              {showDelete && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setEditingTransaction(tx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-quaternary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--blue)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-quaternary)'}
                    title="Editar transação"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeletingTransaction(tx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      opacity: 0.7,
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                    title="Excluir transação"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
      {deletingTransaction && (
        <TransactionDeleteModal
          transaction={deletingTransaction}
          onClose={() => setDeletingTransaction(null)}
        />
      )}
    </div>
  );
}
