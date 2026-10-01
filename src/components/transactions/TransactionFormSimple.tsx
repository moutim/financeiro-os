'use client';

import { useState } from 'react';
import { Banknote, Sparkles, Trash2 } from 'lucide-react';
import type { Category } from '@/lib/types';
import { useFinanceStore } from '@/lib/store';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { monthKeyToLabel, formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[];

interface TransactionFormProps {
  onClose: () => void;
}

export default function TransactionFormSimple({ onClose }: TransactionFormProps) {
  const { addTransaction, addIncome, selectedMonth, goals, availableMonths, cards } = useFinanceStore();
  const [name, setName] = useState('');
  const [rawDigits, setRawDigits] = useState(''); // apenas dígitos, ex: "123456" = R$ 1.234,56
  const [category, setCategory] = useState<Category>('Compras');
  const [monthKey, setMonthKey] = useState(selectedMonth);
  const [installments, setInstallments] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [incomeType, setIncomeType] = useState<'salary' | 'extra'>('salary');
  const [goalId, setGoalId] = useState('');
  const [cardId, setCardId] = useState('');
  const [subTransactions, setSubTransactions] = useState<{name: string, rawAmount: string, installments: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const swipeToClose = useSwipeToClose(onClose);

  const hasSubTxs = subTransactions.length > 0;
  const totalSubAmount = subTransactions.reduce((acc, sub) => {
    const amt = parseInt(sub.rawAmount || '0', 10) / 100;
    return acc + amt; // O usuário insere o valor total, a divisão ocorre na submissão
  }, 0);
  const displayAmount = hasSubTxs ? totalSubAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : formatMask(rawDigits);

  // Helper: adiciona N meses a uma chave 'YYYY-MM'
  function addMonths(monthKey: string, add: number): string {
    let [y, m] = monthKey.split('-').map(Number);
    m += add;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return `${y}-${m.toString().padStart(2, '0')}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const numAmount = hasSubTxs ? totalSubAmount : parseInt(rawDigits, 10) / 100;
    if (!numAmount) return;

    setIsSubmitting(true);
    try {
      const parsedSubTxs = subTransactions.map(s => {
        let inst = parseInt(s.installments || '1', 10);
        if (isNaN(inst) || inst < 1) inst = 1;
        
        const totalSubAmt = parseInt(s.rawAmount || '0', 10) / 100;
        let subAmt = totalSubAmt;
        let firstAmt = totalSubAmt;
        if (inst > 1) {
          subAmt = Math.floor((totalSubAmt / inst) * 100) / 100;
          const remainder = totalSubAmt - (subAmt * inst);
          firstAmt = Math.round((subAmt + remainder) * 100) / 100;
        }

        return {
          name: s.name.trim(),
          amount: totalSubAmt,
          subAmt,
          firstAmt,
          installments: inst
        };
      }).filter(s => s.name && s.amount > 0);
      
      const hasValidSubTxs = parsedSubTxs.length > 0;
      
      let maxMonths = 1;
      if (hasValidSubTxs) {
        parsedSubTxs.forEach(s => { if (s.installments > maxMonths) maxMonths = s.installments; });
      }

      if (type === 'expense') {
        const parsedInstallments = parseInt(installments, 10);
        if (!hasValidSubTxs && installments && !isNaN(parsedInstallments) && parsedInstallments > 1 && !installments.includes('/')) {
          maxMonths = parsedInstallments;
        }

        if (maxMonths > 1) {
          const promises = [];
          const state = useFinanceStore.getState();
          const baseIncomes = state.getMonthIncomes(monthKey);
          const baseFixos = state.getMonthTransactions(monthKey).filter(t => t.category === 'Fixos');
          
          let amountPerInstallment = 0;
          let firstInstallmentAmount = 0;
          if (!hasValidSubTxs) {
            amountPerInstallment = Math.floor((numAmount / maxMonths) * 100) / 100;
            const remainder = numAmount - (amountPerInstallment * maxMonths);
            firstInstallmentAmount = Math.round((amountPerInstallment + remainder) * 100) / 100;
          }
          
          for (let i = 0; i < maxMonths; i++) {
            const nextMonthKey = addMonths(monthKey, i);
            
            let currentSubs = null;
            let currentParentAmount = (i === 0) ? firstInstallmentAmount : amountPerInstallment;
            
            if (hasValidSubTxs) {
              const subsForMonth = parsedSubTxs.filter(s => i < s.installments).map(s => {
                const amountForThisMonth = (i === 0) ? s.firstAmt : s.subAmt;
                return {
                  name: s.name,
                  amount: amountForThisMonth,
                  installments: s.installments > 1 ? `${i + 1}/${s.installments}` : undefined
                };
              });
              
              if (subsForMonth.length > 0) {
                currentSubs = subsForMonth;
                currentParentAmount = subsForMonth.reduce((acc, curr) => acc + curr.amount, 0);
              } else {
                continue; // no subtransactions in this month, skip
              }
            }

            promises.push(addTransaction({
              name: name.trim(),
              amount: currentParentAmount,
              category,
              monthKey: nextMonthKey,
              installments: maxMonths > 1 && !hasValidSubTxs ? `${i + 1}/${maxMonths}` : null,
              goalId: goalId || null,
              cardId: cardId || null,
              subTransactions: currentSubs,
              isPaid: i === 0 ? isPaid : false,
            }));

            if (i > 0) {
              const futureIncomes = state.getMonthIncomes(nextMonthKey);
              const futureFixos = state.getMonthTransactions(nextMonthKey).filter(t => t.category === 'Fixos');
               
              if (futureIncomes.length === 0 && futureFixos.length === 0) {
                for (const inc of baseIncomes) {
                  promises.push(addIncome({ 
                    name: inc.name, 
                    amount: inc.amount, 
                    monthKey: nextMonthKey, 
                    isRecurring: inc.isRecurring 
                  }));
                }
                for (const fixo of baseFixos) {
                  promises.push(addTransaction({ 
                    name: fixo.name, 
                    amount: fixo.amount, 
                    category: fixo.category, 
                    monthKey: nextMonthKey 
                  }));
                }
              }
            }
          }
          await Promise.all(promises);
        } else {
          const currentSubs = hasValidSubTxs ? parsedSubTxs.map(s => ({
            name: s.name,
            amount: s.amount,
            installments: s.installments > 1 ? `1/${s.installments}` : undefined
          })) : null;
          
          const transactionData = {
            name: name.trim(),
            amount: numAmount,
            category,
            monthKey,
            installments: installments || null,
            goalId: goalId || null,
            cardId: cardId || null,
            subTransactions: currentSubs,
            isPaid,
          };
          
          await addTransaction(transactionData);

          // If the goal is shared, we must also write this transaction to the owner's spreadsheet
          if (goalId && category === 'Investimentos') {
            const goal = goals.find(g => g.id === goalId);
            if (goal && goal.isShared && goal.ownerSpreadsheetId) {
              await fetch('/api/transacoes/shared', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ownerSpreadsheetId: goal.ownerSpreadsheetId,
                  // Include the user's name in the transaction so the owner knows who deposited
                  transaction: {
                    ...transactionData,
                    name: `${transactionData.name} (Compartilhado)`
                  }
                })
              });
            }
          }
        }
      } else {
        // Receitas
        if (maxMonths > 1) {
          const promises = [];
          for (let i = 0; i < maxMonths; i++) {
            const nextMonthKey = addMonths(monthKey, i);
            
            const subsForMonth = parsedSubTxs.filter(s => i < s.installments).map(s => {
              const amountForThisMonth = (i === 0) ? s.firstAmt : s.subAmt;
              return {
                name: s.name,
                amount: amountForThisMonth,
                installments: s.installments > 1 ? `${i + 1}/${s.installments}` : undefined
              };
            });
            
            if (subsForMonth.length > 0) {
              const currentParentAmount = subsForMonth.reduce((acc, curr) => acc + curr.amount, 0);
              promises.push(addIncome({
                name: name.trim(),
                amount: currentParentAmount,
                monthKey: nextMonthKey,
                isRecurring: incomeType === 'salary',
                subTransactions: subsForMonth,
                isPaid: i === 0 ? isPaid : false,
              }));
            }
          }
          await Promise.all(promises);
        } else {
          const currentSubs = hasValidSubTxs ? parsedSubTxs.map(s => ({
            name: s.name,
            amount: s.amount,
            installments: s.installments > 1 ? `1/${s.installments}` : undefined
          })) : null;
          
          await addIncome({
            name: name.trim(),
            amount: numAmount,
            monthKey,
            isRecurring: incomeType === 'salary',
            subTransactions: currentSubs,
            isPaid,
          });
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar os dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em' }}>
              {type === 'expense' ? 'Nova Saída' : 'Nova Entrada'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {type === 'expense' ? 'Adicione um novo gasto ou investimento' : incomeType === 'salary' ? 'Salário ou renda fixa mensal' : 'Dividendos, freelance ou renda extra'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-2)', padding: 4, borderRadius: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setType('expense')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              background: type === 'expense' ? 'var(--blue)' : 'transparent',
              borderRadius: 6,
              fontWeight: type === 'expense' ? 600 : 500,
              color: type === 'expense' ? '#FFF' : 'var(--text-tertiary)',
              boxShadow: type === 'expense' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              background: type === 'income' ? 'var(--blue)' : 'transparent',
              borderRadius: 6,
              fontWeight: type === 'income' ? 600 : 500,
              color: type === 'income' ? '#FFF' : 'var(--text-tertiary)',
              boxShadow: type === 'income' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            Entrada
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input
              className="form-input"
              type="text"
              placeholder={type === 'expense' ? 'Ex: Spotify, Almoço...' : 'Ex: Salário, Freelance...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">
              Valor
            </label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={displayAmount}
              onChange={(e) => {
                if (hasSubTxs) return;
                const digits = parseMask(e.target.value);
                setRawDigits(digits);
              }}
              disabled={isSubmitting || hasSubTxs}
              required={!hasSubTxs}
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
                      inputMode="numeric"
                      value={sub.installments}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const newSubs = [...subTransactions];
                        newSubs[idx].installments = val;
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
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right', marginTop: 4 }}>
                  Total: {displayAmount}
                </div>
              </div>
            )}
          </div>
          
          {type === 'income' && (
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Tipo de entrada</label>
              <div style={{ display: 'flex', background: 'var(--bg-2)', padding: 4, borderRadius: 8, gap: 4 }}>
                {(['salary', 'extra'] as const).map((opt) => {
                  const isActive = incomeType === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIncomeType(opt)}
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: isActive ? 600 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: isActive ? 'var(--blue)' : 'transparent',
                        color: isActive ? '#FFF' : 'var(--text-tertiary)',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        opacity: isSubmitting ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {opt === 'salary'
                        ? <><Banknote size={15} strokeWidth={1.8} /> Salário</>
                        : <><Sparkles size={15} strokeWidth={1.8} /> Recebimento Extra</>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            {type === 'expense' && (
              <div className="form-group" style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label className="form-label">Categoria</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  disabled={isSubmitting}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label className="form-label">Mês</label>
              <select
                className="form-select"
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                disabled={isSubmitting}
              >
                {availableMonths.map((mk) => (
                  <option key={mk} value={mk}>
                    {monthKeyToLabel(mk)}
                  </option>
                ))}
              </select>
            </div>

            {type === 'expense' && category === 'Investimentos' && (
              <div className="form-group" style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label className="form-label">Meta Vinculada (opcional)</label>
                <select
                  className="form-select"
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Nenhuma</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === 'expense' && cards.length > 0 && (
              <div className="form-group" style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label className="form-label">Cartão de Crédito (opcional)</label>
                <select
                  className="form-select"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Nenhum</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === 'expense' && !hasSubTxs && (
              <div className="form-group" style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label className="form-label">Parcelas (opcional)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex: 12"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{type === 'expense' ? 'Marcar como pago' : 'Marcar como recebido'}</div>
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

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
              {isSubmitting ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
