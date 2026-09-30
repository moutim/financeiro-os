'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { 
  ExpenseMacro, 
  Transaction 
} from '@/lib/types';
import { 
  EXPENSE_MACROS, 
  getMicrosForMacro, 
  INVESTMENT_CATEGORIES, 
  migrateTransactionCategory
} from '@/lib/categories';
import { formatMask, parseMask, addMonths, parseInstallmentInput, parseMonthKey } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { triggerSuccessConfetti } from '@/lib/confetti';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i);

const MONTHS_LIST = [
  { num: 1, label: 'Janeiro' },
  { num: 2, label: 'Fevereiro' },
  { num: 3, label: 'Março' },
  { num: 4, label: 'Abril' },
  { num: 5, label: 'Maio' },
  { num: 6, label: 'Junho' },
  { num: 7, label: 'Julho' },
  { num: 8, label: 'Agosto' },
  { num: 9, label: 'Setembro' },
  { num: 10, label: 'Outubro' },
  { num: 11, label: 'Novembro' },
  { num: 12, label: 'Dezembro' },
];

const ALL_MACROS_EDIT = [
  ...EXPENSE_MACROS,
  'Investimentos',
] as const;

interface TransactionEditModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function TransactionEditModal({ transaction, onClose }: TransactionEditModalProps) {
  const { updateTransaction, addTransaction, addIncome, cards, addAvailableMonth } = useFinanceStore();
  const [name, setName] = useState(transaction.name);
  const [rawAmount, setRawAmount] = useState(String(Math.round(Math.abs(transaction.amount) * 100)));

  // Data da Transação (dois campos fechados: Ano e Mês)
  const initialDate = parseMonthKey(transaction.monthKey) || { year: CURRENT_YEAR, month: new Date().getMonth() + 1 };
  const [selectedYear, setSelectedYear] = useState<number>(initialDate.year);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(initialDate.month);
  const monthKey = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;

  // Migra com segurança os valores iniciais (Micro opcional)
  const initialMigrated = migrateTransactionCategory(transaction.category, transaction.subcategory, transaction.name);
  const [macro, setMacro] = useState<string>(initialMigrated.macro);
  const [micro, setMicro] = useState<string>(transaction.subcategory || '');

  const [cardId, setCardId] = useState(transaction.cardId || '');
  const [installments, setInstallments] = useState(transaction.installments || '');
  const [subTransactions, setSubTransactions] = useState<{name: string, rawAmount: string, installments: string}[]>(
    transaction.subTransactions 
      ? transaction.subTransactions.map(st => ({ name: st.name, rawAmount: String(Math.round(st.amount * 100)), installments: st.installments || '' }))
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(transaction.isPaid || false);
  const swipeToClose = useSwipeToClose(onClose);

  // Retorna as micros disponíveis de acordo com a macro
  const getAvailableMicros = (m: string): readonly string[] => {
    if (m === 'Investimentos') return INVESTMENT_CATEGORIES;
    return getMicrosForMacro(m);
  };

  const handleMacroChange = (newMacro: string) => {
    setMacro(newMacro);
    const validMicros = getAvailableMicros(newMacro);
    if (!validMicros.includes(micro)) {
      setMicro('');
    }
  };

  const hasSubTxs = subTransactions.length > 0;
  const totalSubAmount = subTransactions.reduce((acc, sub) => acc + (parseInt(sub.rawAmount || '0', 10) / 100), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    let numAmount = hasSubTxs ? totalSubAmount : (parseInt(rawAmount || '0', 10) / 100);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    const parsedSubTxs = subTransactions.map(s => {
      let inst = parseInt(s.installments || '1', 10);
      if (isNaN(inst) || inst < 1) inst = 1;
      return {
        name: s.name.trim(),
        amount: parseInt(s.rawAmount || '0', 10) / 100,
        installments: inst
      };
    }).filter(s => s.name && s.amount > 0);
    const hasValidSubTxs = parsedSubTxs.length > 0;

    let maxMonths = 1;
    if (hasValidSubTxs) {
      parsedSubTxs.forEach(s => { if (s.installments > maxMonths) maxMonths = s.installments; });
    }
    
    const parsedInst = parseInstallmentInput(installments);
    if (!hasValidSubTxs && parsedInst && parsedInst.total > 1) {
      maxMonths = parsedInst.total;
    }

    const txType = macro === 'Investimentos' ? 'investment' : 'expense';

    setIsSubmitting(true);
    try {
      if (maxMonths > 1) {
        const promises = [];
        const state = useFinanceStore.getState();
        const baseIncomes = state.getMonthIncomes(transaction.monthKey);
        const baseFixos = state.getMonthTransactions(transaction.monthKey).filter(t => t.category === 'Fixos' || t.recurrency === 'Fixo');
        
        const amountPerInstallment = hasValidSubTxs ? 0 : numAmount;

        for (let i = 0; i < maxMonths; i++) {
          const nextMonthKey = addMonths(transaction.monthKey, i);
          
          let currentSubs = null;
          let currentParentAmount = amountPerInstallment;
          
          if (hasValidSubTxs) {
            const subsForMonth = parsedSubTxs.filter(s => i < s.installments).map(s => {
              const subAmt = s.amount;
              return {
                name: s.name,
                amount: subAmt,
                installments: s.installments > 1 ? `${i + 1}/${s.installments}` : undefined
              };
            });
            if (subsForMonth.length > 0) {
              currentSubs = subsForMonth;
              currentParentAmount = subsForMonth.reduce((acc, curr) => acc + curr.amount, 0);
            } else {
              continue;
            }
          }

          const installmentLabel = maxMonths > 1 && !hasValidSubTxs ? `${i + 1}/${maxMonths}` : null;

          const finalSubcategory = micro.trim() || null;
          const finalPaymentMethod = cardId ? ('Crédito' as const) : null;

          if (i === 0) {
            promises.push(updateTransaction(transaction.id, {
              name: name.trim(),
              amount: currentParentAmount,
              category: macro,
              subcategory: finalSubcategory,
              transactionType: txType,
              nature: null,
              recurrency: null,
              paymentMethod: finalPaymentMethod,
              subTransactions: currentSubs,
              isPaid,
              cardId: cardId || null,
              installments: installmentLabel
            }));
          } else {
            promises.push(addTransaction({
              name: name.trim(),
              amount: currentParentAmount,
              category: macro,
              subcategory: finalSubcategory,
              transactionType: txType,
              nature: null,
              recurrency: null,
              paymentMethod: finalPaymentMethod,
              monthKey: nextMonthKey,
              installments: installmentLabel,
              goalId: transaction.goalId || null,
              cardId: cardId || null,
              subTransactions: currentSubs,
              isPaid: false,
            }));

            const futureIncomes = state.getMonthIncomes(nextMonthKey);
            const futureFixos = state.getMonthTransactions(nextMonthKey).filter(t => t.category === 'Fixos' || t.recurrency === 'Fixo');
            if (futureIncomes.length === 0 && futureFixos.length === 0) {
              for (const inc of baseIncomes) {
                promises.push(addIncome({ 
                  name: inc.name, amount: inc.amount, monthKey: nextMonthKey, isRecurring: inc.isRecurring 
                }));
              }
              for (const fixo of baseFixos) {
                promises.push(addTransaction({ 
                  name: fixo.name, 
                  amount: fixo.amount, 
                  category: fixo.category, 
                  subcategory: fixo.subcategory || null,
                  transactionType: 'expense',
                  nature: fixo.nature || 'Essencial',
                  recurrency: 'Fixo',
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

        addAvailableMonth(monthKey);
        await updateTransaction(transaction.id, { 
          name: name.trim(), 
          amount: numAmount, 
          category: macro,
          subcategory: micro.trim() || null,
          transactionType: txType,
          nature: null,
          recurrency: null,
          paymentMethod: cardId ? 'Crédito' : null,
          monthKey,
          subTransactions: currentSubs,
          isPaid,
          cardId: cardId || null,
          installments: installments || null
        });
      }
      
      if (isPaid && !transaction.isPaid) {
        triggerSuccessConfetti();
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar a transação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableMicros = getAvailableMicros(macro);

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em' }}>
            Editar Transação
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Atualize os dados e a categorização da transação
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome / Descrição</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Valor</label>
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

          {/* ── Macro e Micro ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoria Macro</label>
              <select
                className="form-select"
                value={macro}
                onChange={(e) => handleMacroChange(e.target.value)}
                disabled={isSubmitting}
              >
                {ALL_MACROS_EDIT.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoria Micro (opcional)</label>
              <select
                className="form-select"
                value={micro}
                onChange={(e) => setMicro(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Nenhuma / Geral</option>
                {availableMicros.map((mic) => (
                  <option key={mic} value={mic}>
                    {mic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Data da Transação (Ano e Mês) ── */}
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Data da Transação
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ano</label>
                <select
                  className="form-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  disabled={isSubmitting}
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mês</label>
                <select
                  className="form-select"
                  value={selectedMonthNum}
                  onChange={(e) => setSelectedMonthNum(Number(e.target.value))}
                  disabled={isSubmitting}
                >
                  {MONTHS_LIST.map(m => (
                    <option key={m.num} value={m.num}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cards && cards.length > 0 ? '1fr 1fr' : '1fr', gap: '0 12px', marginBottom: 24 }}>
            {cards && cards.length > 0 && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: 0 }}>
                <label className="form-label">Cartão de Crédito</label>
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

            {!hasSubTxs && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: 0 }}>
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
