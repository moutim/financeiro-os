'use client';

import { useState, useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel, formatMask, parseMask } from '@/lib/currency';
import { Trash2 } from 'lucide-react';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

interface StartMonthWizardProps {
  onClose: () => void;
  targetMonth: string; // The month they are starting (e.g., '2025-10')
}

function getPrevMonth(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  let prevM = m - 1;
  let prevY = y;
  if (prevM < 1) {
    prevM = 12;
    prevY -= 1;
  }
  return `${prevY}-${prevM.toString().padStart(2, '0')}`;
}

export default function StartMonthWizard({ onClose, targetMonth }: StartMonthWizardProps) {
  const { getMonthIncomes, getMonthTransactions, addIncome, addTransaction } = useFinanceStore();
  const prevMonth = getPrevMonth(targetMonth);

  const [incomes, setIncomes] = useState<{ id: string; name: string; amount: string; isRecurring?: boolean }[]>([]);
  const [expenses, setExpenses] = useState<{ id: string; name: string; amount: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  useEffect(() => {
    // Receitas extras (não recorrentes) do mês anterior
    const prevIncomes = getMonthIncomes(prevMonth).filter(i => !i.isRecurring);
    
    // Para salários (recorrentes), procuramos na base inteira pelo último valor salvo antes ou no mês alvo
    const allIncomes = useFinanceStore.getState().incomes;
    const recurringMap = new Map<string, any>();
    allIncomes.forEach(inc => {
      if (inc.isRecurring && inc.monthKey < targetMonth) {
        recurringMap.set(inc.name, inc);
      }
    });
    
    const combinedIncomes = [...prevIncomes, ...Array.from(recurringMap.values())];

    // Apenas despesas "Fixos" do mês anterior
    const prevExpenses = getMonthTransactions(prevMonth).filter(t => t.category === 'Fixos');

    setIncomes(combinedIncomes.map(i => ({ id: i.id, name: i.name, amount: String(Math.round(i.amount * 100)), isRecurring: i.isRecurring })));
    setExpenses(prevExpenses.map(e => ({ id: e.id, name: e.name, amount: String(Math.round(e.amount * 100)) })));
  }, [prevMonth, targetMonth, getMonthIncomes, getMonthTransactions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      for (const inc of incomes) {
        const numAmount = parseInt(inc.amount || '0', 10) / 100;
        if (isNaN(numAmount) || numAmount <= 0) continue;
        await addIncome({ name: inc.name.trim(), amount: numAmount, monthKey: targetMonth, isRecurring: inc.isRecurring });
      }

      for (const exp of expenses) {
        const numAmount = parseInt(exp.amount || '0', 10) / 100;
        if (isNaN(numAmount) || numAmount <= 0) continue;
        await addTransaction({
          name: exp.name.trim(),
          amount: numAmount,
          category: 'Fixos',
          monthKey: targetMonth,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao importar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const removeIncome = (id: string) => setIncomes(prev => prev.filter(i => i.id !== id));
  const removeExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  const updateIncome = (id: string, amount: string) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, amount } : i));
  };
  const updateExpense = (id: string, amount: string) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, amount } : e));
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ ...swipeToClose.style, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <div style={{ flexShrink: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em' }}>
              Iniciar Mês
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Copie suas entradas e despesas fixas de <strong>{monthKeyToLabel(prevMonth)}</strong> para <strong>{monthKeyToLabel(targetMonth)}</strong>. Ajuste os valores se necessário.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)', marginBottom: 12 }}>Entradas & Receitas</h3>
            {incomes.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhuma entrada encontrada no mês anterior.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {incomes.map(inc => (
                  <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 2, fontSize: 14, fontWeight: 500 }}>{inc.name}</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      style={{ flex: 1, margin: 0, padding: '8px 12px' }}
                      value={formatMask(inc.amount)}
                      onChange={(e) => updateIncome(inc.id, parseMask(e.target.value))}
                    />
                    <button type="button" onClick={() => removeIncome(inc.id)} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--orange)', marginBottom: 12 }}>Despesas Fixas</h3>
            {expenses.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhuma despesa fixa encontrada no mês anterior.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {expenses.map(exp => (
                  <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 2, fontSize: 14, fontWeight: 500 }}>{exp.name}</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      style={{ flex: 1, margin: 0, padding: '8px 12px' }}
                      value={formatMask(exp.amount)}
                      onChange={(e) => updateExpense(exp.id, parseMask(e.target.value))}
                    />
                    <button type="button" onClick={() => removeExpense(exp.id)} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--separator)' }}>
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
              disabled={isSubmitting || (incomes.length === 0 && expenses.length === 0)}
              style={{ flex: 2, justifyContent: 'center', padding: '14px', opacity: isSubmitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isSubmitting && <div className="btn-spinner" />}
              {isSubmitting ? 'Importando...' : 'Iniciar Mês'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
