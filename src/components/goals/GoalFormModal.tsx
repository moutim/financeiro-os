'use client';

import { useState } from 'react';
import { formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { GOAL_ICONS, getGoalIconDef } from '@/lib/goalIcons';

export interface GoalData {
  id: string;
  name: string;
  current: number;
  target: number;
  monthlyPrediction: number;
  icon?: string | null;
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
  const [current, setCurrent] = useState(initialData?.current ? String(Math.round(initialData.current * 100)) : '0');
  const [monthlyPrediction, setMonthlyPrediction] = useState(initialData?.monthlyPrediction ? String(Math.round(initialData.monthlyPrediction * 100)) : '0');
  const [selectedIcon, setSelectedIcon] = useState<string>(
    initialData?.icon || (initialData?.name ? getGoalIconDef(null, initialData.name).id : 'target')
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  const handleNameChange = (val: string) => {
    setName(val);
    // If user hasn't explicitly changed from default target, auto-suggest icon
    if (!initialData?.icon && (selectedIcon === 'target' || !selectedIcon)) {
      const suggested = getGoalIconDef(null, val);
      if (suggested.id !== 'target') {
        setSelectedIcon(suggested.id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const goal: GoalData = {
      id: initialData?.id ?? Date.now().toString(),
      name,
      target: parseInt(target || '0', 10) / 100,
      current: parseInt(current || '0', 10) / 100,
      monthlyPrediction: parseInt(monthlyPrediction || '0', 10) / 100,
      icon: selectedIcon || 'target',
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

  const currentIconDef = getGoalIconDef(selectedIcon, name);

  return (
    <div className="modal-overlay animate-fade-in" onClick={(!isSubmitting && !isDeleting) ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ ...swipeToClose.style, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: currentIconDef.bgColor,
              color: currentIconDef.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}>
              <currentIconDef.icon size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                {initialData ? 'Editar Meta' : 'Nova Meta'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                Defina o objetivo, ícone e o valor planejado
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nome da Meta */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Nome da Meta</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={name} 
              onChange={e => handleNameChange(e.target.value)} 
              placeholder="Ex: Troca de Carro, Reforma da Casa, Cirurgia..."
              disabled={isSubmitting || isDeleting}
            />
          </div>

          {/* Seletor de Ícones */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ícone do Objetivo</span>
              <span style={{ fontSize: 12, color: currentIconDef.color, fontWeight: 600 }}>
                {currentIconDef.label}
              </span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
              gap: 8,
              padding: 10,
              background: 'var(--bg-2, #E5E5EA)',
              borderRadius: 14,
            }}>
              {GOAL_ICONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    title={item.label}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? item.color : 'var(--surface)',
                      color: isSelected ? '#FFFFFF' : item.color,
                      border: isSelected ? `2px solid ${item.color}` : '1px solid rgba(0,0,0,0.06)',
                      boxShadow: isSelected ? `0 4px 12px ${item.bgColor}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    <IconComponent size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Valor Alvo (R$)</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="form-input" 
                required 
                value={formatMask(target)} 
                onChange={e => setTarget(parseMask(e.target.value))} 
                placeholder="R$ 0,00"
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
                value={formatMask(current)} 
                onChange={e => setCurrent(parseMask(e.target.value))} 
                placeholder="R$ 0,00"
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
              Usado para estimar em quantos meses você alcançará o valor alvo.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {initialData && onDelete && (
              <button 
                type="button"
                className="btn-ghost" 
                style={{ color: 'var(--red)', background: 'var(--red-light)', flex: 1, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? <div className="btn-spinner" style={{ borderColor: 'var(--red)', borderTopColor: 'transparent' }} /> : 'Excluir'}
              </button>
            )}
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={isSubmitting || isDeleting}>
              {isSubmitting ? <div className="btn-spinner" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
