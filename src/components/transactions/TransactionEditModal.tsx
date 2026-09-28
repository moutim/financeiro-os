'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Category, Transaction } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { triggerSuccessConfetti } from '@/lib/confetti';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[];

interface TransactionEditModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function TransactionEditModal({ transaction, onClose }: TransactionEditModalProps) {
  const { updateTransaction } = useFinanceStore();
  const [name, setName] = useState(transaction.name);
  const [rawAmount, setRawAmount] = useState(String(Math.round(Math.abs(transaction.amount) * 100)));
  const [category, setCategory] = useState<Category>(transaction.category);
  const [subTransactions, setSubTransactions] = useState<{name: string, rawAmount: string, installments: string}[]>(
    transaction.subTransactions 
      ? transaction.subTransactions.map(st => ({ name: st.name, rawAmount: String(Math.round(st.amount * 100)), installments: st.installments || '' }))
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(transaction.isPaid || false);
  const swipeToClose = useSwipeToClose(onClose);

  const hasSubTxs = subTransactions.length > 0;
  const totalSubAmount = subTransactions.reduce((acc, sub) => acc + (parseInt(sub.rawAmount || '0', 10) / 100), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    let numAmount = hasSubTxs ? totalSubAmount : (parseInt(rawAmount || '0', 10) / 100);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    const parsedSubTxs = subTransactions.map(s => ({
      name: s.name.trim(),
      amount: parseInt(s.rawAmount || '0', 10) / 100,
      installments: s.installments || null
    })).filter(s => s.name && s.amount > 0);
    const finalSubTransactions = parsedSubTxs.length > 0 ? parsedSubTxs : null;

    setIsSubmitting(true);
    try {
      await updateTransaction(transaction.id, { 
        name: name.trim(), 
        amount: numAmount, 
        category,
        subTransactions: finalSubTransactions,
        isPaid
      });
      
      if (isPaid && !transaction.isPaid) {
        triggerSuccessConfetti();
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar a transação.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Editar Transação</h2>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 0 }}>
            Atualize os dados desta saída.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Nome</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Valor (R$)</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              value={hasSubTxs ? totalSubAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : formatMask(rawAmount)}
              onChange={(e) => {
                if (!hasSubTxs) setRawAmount(parseMask(e.target.value));
              }}
              disabled={hasSubTxs || isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Sub-transações (opcional)</label>
              <button
                type="button"
                onClick={() => setSubTransactions([...subTransactions, { name: '', rawAmount: '', installments: '' }])}
                style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                + Adicionar
              </button>
            </div>
            
            {subTransactions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                {subTransactions.map((sub, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ flex: 2, padding: '8px 12px', fontSize: 13 }}
                      placeholder="Nome"
                      value={sub.name}
                      onChange={(e) => {
                        const newSubs = [...subTransactions];
                        newSubs[idx].name = e.target.value;
                        setSubTransactions(newSubs);
                      }}
                    />
                    <input
                      className="form-input"
                      style={{ flex: 1, padding: '8px 12px', fontSize: 13, maxWidth: '60px' }}
                      placeholder="1x"
                      value={sub.installments}
                      onChange={(e) => {
                        const newSubs = [...subTransactions];
                        newSubs[idx].installments = e.target.value;
                        setSubTransactions(newSubs);
                      }}
                    />
                    <input
                      className="form-input"
                      style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                      placeholder="Valor"
                      inputMode="numeric"
                      value={formatMask(sub.rawAmount)}
                      onChange={(e) => {
                        const digits = parseMask(e.target.value);
                        const newSubs = [...subTransactions];
                        newSubs[idx].rawAmount = digits;
                        setSubTransactions(newSubs);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSubTransactions(subTransactions.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Categoria</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Marcar como pago</div>
            </div>
            <button
              type="button"
              onClick={() => setIsPaid(!isPaid)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: isPaid ? 'var(--green)' : 'var(--text-quaternary)',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                opacity: isSubmitting ? 0.5 : 1
              }}
              disabled={isSubmitting}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 2,
                left: isPaid ? 22 : 2,
                transition: 'left 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting} style={{ flex: 1, padding: '14px', opacity: isSubmitting ? 0.5 : 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 1, padding: '14px', opacity: isSubmitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isSubmitting && <div className="btn-spinner" />}
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
