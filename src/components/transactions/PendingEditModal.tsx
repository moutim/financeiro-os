'use client';
import { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import type { Pending } from '@/lib/types';
import { formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

interface PendingEditModalProps {
  pending?: Pending | null;
  onClose: () => void;
}

export default function PendingEditModal({ pending, onClose }: PendingEditModalProps) {
  const { addPending, updatePending, goals } = useFinanceStore();
  const [name, setName] = useState(pending?.name ?? '');
  
  const [type, setType] = useState<'payable' | 'receivable'>(
    pending ? (pending.amount >= 0 ? 'receivable' : 'payable') : 'payable'
  );
  const [rawAmount, setRawAmount] = useState(pending ? String(Math.round(Math.abs(pending.amount) * 100)) : '');
  const [person, setPerson] = useState(pending?.person ?? '');
  const [dueDate, setDueDate] = useState(pending?.dueDate?.slice(0, 10) ?? '');
  const [goalId, setGoalId] = useState(pending?.goalId ?? '');
  const [notes, setNotes] = useState(pending?.notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const baseAmount = parseInt(rawAmount || '0', 10) / 100;
    if (isNaN(baseAmount) || baseAmount === 0) return;

    const numAmount = type === 'payable' ? -baseAmount : baseAmount;

    setIsSubmitting(true);
    try {
      const details = { person: person.trim() || null, dueDate: dueDate || null, goalId: goalId || null, notes: notes.trim() || null };
      if (pending) {
        await updatePending(pending.id, { name: name.trim(), amount: numAmount, ...details });
      } else {
        await addPending({ name: name.trim(), amount: numAmount, status: 'open', ...details });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
      setIsSubmitting(false);
    }
  };

  const isEditing = !!pending;
  const swipeToClose = useSwipeToClose(onClose);

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {isEditing ? 'Editar Pendência' : 'Nova Pendência'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 0 }}>
            Controle o que você tem a receber ou a pagar.
          </p>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-2)', padding: 4, borderRadius: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setType('payable')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              background: type === 'payable' ? 'var(--blue)' : 'transparent',
              borderRadius: 6,
              fontWeight: type === 'payable' ? 600 : 500,
              color: type === 'payable' ? '#FFF' : 'var(--text-tertiary)',
              boxShadow: type === 'payable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            A Pagar
          </button>
          <button
            type="button"
            onClick={() => setType('receivable')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              background: type === 'receivable' ? 'var(--blue)' : 'transparent',
              borderRadius: 6,
              fontWeight: type === 'receivable' ? 600 : 500,
              color: type === 'receivable' ? '#FFF' : 'var(--text-tertiary)',
              boxShadow: type === 'receivable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            A Receber
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Nome</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ex: Empréstimo João"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Valor (R$)</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={formatMask(rawAmount)}
              onChange={(e) => setRawAmount(parseMask(e.target.value))}
              disabled={isSubmitting}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">{type === 'payable' ? 'Pagar para' : 'Receber de'}</label>
              <input className="form-input" type="text" placeholder="Opcional" value={person} onChange={(e) => setPerson(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Data prevista</label>
              <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          {goals.length > 0 && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Meta relacionada</label>
              <select className="form-input" value={goalId} onChange={(e) => setGoalId(e.target.value)} disabled={isSubmitting}>
                <option value="">Nenhuma</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Só organiza a pendência: o saldo da meta muda quando você lança o aporte ou o resgate.
              </p>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Observações</label>
            <input className="form-input" type="text" placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSubmitting} />
          </div>

          {/* mesmo padrão dos botões da Nova Transação */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ flex: 1, justifyContent: 'center', padding: '14px', opacity: isSubmitting ? 0.5 : 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ flex: 2, justifyContent: 'center', padding: '14px', opacity: isSubmitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isSubmitting && <div className="btn-spinner" />}
              {isSubmitting ? 'Salvando...' : (pending ? 'Salvar' : 'Adicionar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
