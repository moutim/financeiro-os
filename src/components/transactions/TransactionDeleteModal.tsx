'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

interface TransactionDeleteModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function TransactionDeleteModal({ transaction, onClose }: TransactionDeleteModalProps) {
  const { deleteTransaction } = useFinanceStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  const isParcelada = (t: Transaction) => {
    if (t.installments && t.installments.includes('/')) return true;
    if (t.subTransactions && t.subTransactions.some(st => st.installments && st.installments.includes('/'))) return true;
    return false;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isParcelada(transaction)) {
        const state = useFinanceStore.getState();
        const futureTxs = state.transactions.filter(t => 
          t.name === transaction.name &&
          t.monthKey >= transaction.monthKey &&
          isParcelada(t)
        );
        
        const promises = futureTxs.map(t => deleteTransaction(t.id));
        await Promise.all(promises);
      } else {
        await deleteTransaction(transaction.id);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isDeleting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ ...swipeToClose.style, textAlign: 'center' }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
        </div>

        {/* Ícone */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--red-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--red)',
        }}>
          <Trash2 size={24} strokeWidth={1.8} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Remover transação?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 6 }}>
          Você está prestes a remover
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          {transaction.name}
        </p>
        <p style={{ 
          fontSize: 22, 
          fontWeight: 700, 
          color: transaction.amount < 0 ? 'var(--green)' : 'var(--text-primary)', 
          marginBottom: 24 
        }}>
          {transaction.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 28 }}>
          Essa ação não pode ser desfeita.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
            style={{ flex: 1, padding: '14px', opacity: isDeleting ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '14px',
              background: 'var(--red)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 15,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s ease',
            }}
          >
            {isDeleting && <div className="btn-spinner" />}
            {isDeleting ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}
