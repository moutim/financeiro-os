'use client';
import { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import type { Pending } from '@/lib/types';

interface PendingEditModalProps {
  pending?: Pending | null;
  onClose: () => void;
}

export default function PendingEditModal({ pending, onClose }: PendingEditModalProps) {
  const { addPending, updatePending } = useFinanceStore();
  const [name, setName] = useState(pending?.name ?? '');
  const [amount, setAmount] = useState(pending ? String(pending.amount) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount)) return;

    setIsSubmitting(true);
    try {
      if (pending) {
        await updatePending(pending.id, { name, amount: numAmount });
      } else {
        await addPending({ name, amount: numAmount });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
      setIsSubmitting(false);
    }
  };

  const isEditing = !!pending;

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '32px 24px', maxWidth: 400, width: '90%', margin: 'auto', borderRadius: 24, marginTop: '20vh' }}
      >
        <div className="modal-handle" />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {isEditing ? 'Editar Pendência' : 'Nova Pendência'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          Valores positivos (ex: 1500) para recebimentos.<br/>Valores negativos (ex: -1500) para pagamentos.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Nome</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ex: Empréstimo João"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!isEditing}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Valor (R$)</label>
            <input
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 1500 ou -1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus={isEditing}
            />
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
