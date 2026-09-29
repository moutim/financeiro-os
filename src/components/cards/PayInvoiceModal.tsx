'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Transaction, CreditCard } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { triggerSuccessConfetti } from '@/lib/confetti';

interface PayInvoiceModalProps {
  card: CreditCard;
  invoiceAmount: number;
  transactionsToPay: Transaction[];
  onClose: () => void;
}

export default function PayInvoiceModal({ card, invoiceAmount, transactionsToPay, onClose }: PayInvoiceModalProps) {
  const { updateTransaction } = useFinanceStore();
  const [isPaying, setIsPaying] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const promises = transactionsToPay.map(t => updateTransaction(t.id, { isPaid: true }));
      await Promise.all(promises);
      
      triggerSuccessConfetti();
      onClose();
    } catch (err) {
      console.error(err);
      setIsPaying(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isPaying ? onClose : undefined}>
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
          background: 'var(--green-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--green)',
        }}>
          <CheckCircle2 size={28} strokeWidth={2} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Pagar Fatura</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 6 }}>
          Deseja marcar como paga a fatura de
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          {card.name}
        </p>
        <p style={{ 
          fontSize: 26, 
          fontWeight: 700, 
          color: 'var(--text-primary)', 
          marginBottom: 16 
        }}>
          {formatCurrency(invoiceAmount)}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 28, padding: '0 20px' }}>
          {transactionsToPay.length} transações serão marcadas como pagas e o valor voltará para o limite disponível do cartão.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={isPaying}
            style={{ flex: 1, padding: '14px', opacity: isPaying ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={isPaying}
            style={{
              flex: 1,
              padding: '14px',
              background: 'var(--green)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 15,
              cursor: isPaying ? 'not-allowed' : 'pointer',
              opacity: isPaying ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s ease',
            }}
          >
            {isPaying && <div className="btn-spinner" />}
            {isPaying ? 'Pagando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
