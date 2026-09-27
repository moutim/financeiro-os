'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Income } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';

interface IncomeDeleteModalProps {
  income: Income;
  onClose: () => void;
}

export default function IncomeDeleteModal({ income, onClose }: IncomeDeleteModalProps) {
  const { deleteIncome } = useFinanceStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteIncome(income.id);
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
        style={{ padding: '32px 24px', maxWidth: 380, width: '90%', margin: 'auto', borderRadius: 24, marginTop: '28vh', textAlign: 'center' }}
      >
        <div className="modal-handle" />

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

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Remover entrada?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 6 }}>
          Você está prestes a remover
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          {income.name}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', marginBottom: 24 }}>
          +{formatCurrency(income.amount)}
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
