'use client';

import { useState } from 'react';
import { formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

export interface GoalData {
  id: string;
  name: string;
  current: number;
  target: number;
  monthlyPrediction: number;
}

interface GoalFormModalProps {
  initialData?: GoalData | null;
  onSave: (data: GoalData) => void | Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => void | Promise<void>;
}

export default function GoalFormModal({ initialData, onSave, onClose, onDelete }: GoalFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [target, setTarget] = useState(initialData?.target ? String(Math.round(initialData.target * 100)) : '');
  const [current, setCurrent] = useState(initialData?.current ? String(Math.round(initialData.current * 100)) : '');
  const [monthlyPrediction, setMonthlyPrediction] = useState(initialData?.monthlyPrediction ? String(Math.round(initialData.monthlyPrediction * 100)) : '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const goal: GoalData = {
      id: initialData?.id ?? Date.now().toString(),
      name,
      target: parseInt(target || '0', 10) / 100,
      current: parseInt(current || '0', 10) / 100,
      monthlyPrediction: parseInt(monthlyPrediction || '0', 10) / 100,
    };
    
    try {
      await onSave(goal);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(initialData.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={(!isSubmitting && !isDeleting) ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            {initialData ? 'Editar Meta' : 'Nova Meta'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Nome da Meta</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Reserva de Emergência, Viagem..."
              disabled={isSubmitting || isDeleting}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Valor Alvo (R$)</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="form-input" 
                required 
                placeholder="R$ 0,00"
                value={formatMask(target)} 
                onChange={e => setTarget(parseMask(e.target.value))} 
                disabled={isSubmitting || isDeleting}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Já Guardado (R$)</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="form-input" 
                required 
                placeholder="R$ 0,00"
                value={formatMask(current)} 
                onChange={e => setCurrent(parseMask(e.target.value))} 
                disabled={isSubmitting || isDeleting}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Previsão Mensal (R$/mês)</label>
            <input 
              type="text" 
              inputMode="numeric"
              className="form-input" 
              value={formatMask(monthlyPrediction)} 
              onChange={e => setMonthlyPrediction(parseMask(e.target.value))} 
              placeholder="R$ 0,00"
              disabled={isSubmitting || isDeleting}
            />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Usado para calcular quando você vai atingir essa meta.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {!initialData && (
              <button 
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                style={{ flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Cancelar
              </button>
            )}
            {initialData && onDelete && (
              <button 
                type="button"
                className="btn-ghost" 
                style={{ color: 'var(--red)', background: 'var(--red-light)', flex: 1, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting && <div className="btn-spinner" style={{ borderColor: 'rgba(255,59,48,0.3)', borderTopColor: 'var(--red)' }} />}
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} disabled={isSubmitting || isDeleting}>
              {isSubmitting && <div className="btn-spinner" />}
              {isSubmitting ? 'Salvando...' : (initialData ? 'Salvar' : 'Adicionar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
