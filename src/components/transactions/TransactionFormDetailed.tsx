'use client';

import { useState } from 'react';
import { Banknote, Sparkles, Trash2 } from 'lucide-react';
import type { 
  ExpenseMacro, 
  TransactionType,
  PaymentMethod,
  Transaction,
  Income
} from '@/lib/types';
import { useFinanceStore } from '@/lib/store';
import { 
  EXPENSE_MACROS, 
  getMicrosForMacro, 
  INCOME_CATEGORIES, 
  INVESTMENT_CATEGORIES, 
  INVESTMENT_TYPES 
} from '@/lib/detailedCategories';
import {
  monthKeyToShortLabel,
  formatMask,
  parseMask,
  parseMonthKey,
  addMonths,
  parseInstallmentInput,
} from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { isFixedTransaction, copyFixedToMonth, hasRepeatingInstallments } from '@/lib/fixedTransactions';
import FixedToggle from './FixedToggle';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i);

const MONTHS_LIST = [
  { num: 1, short: 'Jan', label: 'Janeiro' },
  { num: 2, short: 'Fev', label: 'Fevereiro' },
  { num: 3, short: 'Mar', label: 'Março' },
  { num: 4, short: 'Abr', label: 'Abril' },
  { num: 5, short: 'Mai', label: 'Maio' },
  { num: 6, short: 'Jun', label: 'Junho' },
  { num: 7, short: 'Jul', label: 'Julho' },
  { num: 8, short: 'Ago', label: 'Agosto' },
  { num: 9, short: 'Set', label: 'Setembro' },
  { num: 10, short: 'Out', label: 'Outubro' },
  { num: 11, short: 'Nov', label: 'Novembro' },
  { num: 12, short: 'Dez', label: 'Dezembro' },
];

interface TransactionFormProps {
  onClose: () => void;
}

export default function TransactionFormDetailed({ onClose }: TransactionFormProps) {
  const { addTransaction, addIncome, addEntriesBatch, contributeToSharedGoal, selectedMonth, goals, cards } = useFinanceStore();
  
  // Tipo de movimentação: Despesa, Receita, Investimento
  const [movementType, setMovementType] = useState<TransactionType>('expense');

  // Campos gerais
  const [name, setName] = useState('');
  const [rawDigits, setRawDigits] = useState(''); // apenas dígitos, ex: "123456" = R$ 1.234,56

  // Categoria Macro e Micro para Despesas (Micro opcional)
  const [macro, setMacro] = useState<ExpenseMacro>('Alimentação');
  const [micro, setMicro] = useState<string>('');

  // Investimento
  const [investmentAsset, setInvestmentAsset] = useState<string>(INVESTMENT_CATEGORIES[0]);
  const [investmentOp, setInvestmentOp] = useState<string>(INVESTMENT_TYPES[0]); // Aporte, Resgate, Rendimento

  // Receita
  const [incomeCategory, setIncomeCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [incomeType, setIncomeType] = useState<'salary' | 'extra'>('salary');

  // Ano e Mês (dois campos normais de formulário)
  const initialDate = parseMonthKey(selectedMonth) || { year: CURRENT_YEAR, month: new Date().getMonth() + 1 };
  const [selectedYear, setSelectedYear] = useState<number>(initialDate.year);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(initialDate.month);
  const monthKey = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;

  const [installments, setInstallments] = useState('');
  const [goalId, setGoalId] = useState('');
  const [cardId, setCardId] = useState('');
  const [subTransactions, setSubTransactions] = useState<{name: string, rawAmount: string, installments: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const swipeToClose = useSwipeToClose(onClose);

  // Troca de Macro com limpeza dinâmica da Micro
  const handleMacroChange = (newMacro: ExpenseMacro) => {
    setMacro(newMacro);
    const validMicros = getMicrosForMacro(newMacro);
    if (!validMicros.includes(micro)) {
      setMicro('');
    }
  };

  const hasSubTxs = subTransactions.length > 0;
  const totalSubAmount = subTransactions.reduce((acc, sub) => {
    const amt = parseInt(sub.rawAmount || '0', 10) / 100;
    return acc + amt;
  }, 0);
  const displayAmount = hasSubTxs ? totalSubAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : formatMask(rawDigits);

  // investimentos não têm parcelas; nas despesas, parcelas já se repetem e não combinam com fixo
  const hasInstallments = movementType === 'expense' && hasRepeatingInstallments(hasSubTxs ? null : installments, subTransactions);
  const fixedRecurrency = isFixed && !hasInstallments ? 'Fixo' as const : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const numAmount = hasSubTxs ? totalSubAmount : parseInt(rawDigits, 10) / 100;
    if (!numAmount) return;

    setIsSubmitting(true);
    try {
      const state = useFinanceStore.getState();

      const parsedSubTxs = subTransactions.map(s => {
        const pInst = parseInstallmentInput(s.installments);
        const inst = pInst ? pInst.total : 1;
        
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
      const parsedInst = parseInstallmentInput(installments);

      if (movementType === 'expense') {
        // Caso de parcelas com cálculo retroativo/futuro (ex: "3/3", "2/5", "12x")
        if (!hasValidSubTxs && parsedInst && parsedInst.total > 1) {
          const { current, total } = parsedInst;
          const newTransactions: Omit<Transaction, 'id'>[] = [];
          const newIncomes: Omit<Income, 'id'>[] = [];
          const baseIncomes = state.getMonthIncomes(monthKey);
          const baseFixos = state.getMonthTransactions(monthKey).filter(isFixedTransaction);
          
          const amountPerInstallment = Math.floor((numAmount / total) * 100) / 100;
          const remainder = numAmount - (amountPerInstallment * total);
          const firstInstallmentAmount = Math.round((amountPerInstallment + remainder) * 100) / 100;

          for (let k = 1; k <= total; k++) {
            const offset = k - current; // Ex: se digitou 3/3, k=1 é -2 meses, k=2 é -1 mês, k=3 é 0 meses
            const targetMonthKey = addMonths(monthKey, offset);
            
            // Garante que o mês existe no store
            state.addAvailableMonth(targetMonthKey);

            const currentInstallmentAmount = (k === 1) ? firstInstallmentAmount : amountPerInstallment;
            const isInstallmentPaid = k < current ? true : (k === current ? isPaid : false);

            const finalSubcategory = micro.trim() || null;
            const finalPaymentMethod: PaymentMethod | null = cardId ? 'Crédito' : null;

            newTransactions.push({
              name: name.trim(),
              amount: currentInstallmentAmount,
              category: macro,
              subcategory: finalSubcategory,
              transactionType: 'expense',
              nature: null,
              recurrency: null,
              paymentMethod: finalPaymentMethod,
              monthKey: targetMonthKey,
              installments: `${k}/${total}`,
              goalId: goalId || null,
              cardId: cardId || null,
              subTransactions: null,
              isPaid: isInstallmentPaid,
            });

            // Para meses futuros criados e vazios, copia custos fixos e salários para facilitar o planejamento
            if (offset > 0) {
              const futureIncomes = state.getMonthIncomes(targetMonthKey);
              const futureFixos = state.getMonthTransactions(targetMonthKey).filter(isFixedTransaction);
               
              if (futureIncomes.length === 0 && futureFixos.length === 0) {
                for (const inc of baseIncomes) {
                  if (inc.isRecurring) {
                    newIncomes.push({ 
                      name: inc.name, 
                      amount: inc.amount, 
                      monthKey: targetMonthKey, 
                      isRecurring: true 
                    });
                  }
                }
                for (const fixo of baseFixos) {
                  newTransactions.push(copyFixedToMonth(fixo, targetMonthKey));
                }
              }
            }
          }
          await addEntriesBatch({ transactions: newTransactions, incomes: newIncomes });
        } else if (!hasValidSubTxs) {
          // Transação avulsa sem divisão em múltiplos meses
          state.addAvailableMonth(monthKey);
          const finalSubcategory = micro.trim() || null;
          const finalPaymentMethod: PaymentMethod | null = cardId ? 'Crédito' : null;
          const transactionData = {
            name: name.trim(),
            amount: numAmount,
            category: macro,
            subcategory: finalSubcategory,
            transactionType: 'expense' as const,
            nature: null,
            recurrency: fixedRecurrency,
            paymentMethod: finalPaymentMethod,
            monthKey,
            installments: installments.trim() || null,
            goalId: goalId || null,
            cardId: cardId || null,
            subTransactions: null,
            isPaid,
          };
          
          await addTransaction(transactionData);
        } else {
          // Transação com Subtransações
          state.addAvailableMonth(monthKey);
          let maxMonths = 1;
          parsedSubTxs.forEach(s => { if (s.installments > maxMonths) maxMonths = s.installments; });

          const finalSubcategory = micro.trim() || null;
          const finalPaymentMethod: PaymentMethod | null = cardId ? 'Crédito' : null;

          if (maxMonths > 1) {
            const newTransactions: Omit<Transaction, 'id'>[] = [];
            for (let i = 0; i < maxMonths; i++) {
              const nextMonthKey = addMonths(monthKey, i);
              state.addAvailableMonth(nextMonthKey);
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
                newTransactions.push({
                  name: name.trim(),
                  amount: currentParentAmount,
                  category: macro,
                  subcategory: finalSubcategory,
                  transactionType: 'expense',
                  nature: null,
                  recurrency: null,
                  paymentMethod: finalPaymentMethod,
                  monthKey: nextMonthKey,
                  installments: null,
                  goalId: goalId || null,
                  cardId: cardId || null,
                  subTransactions: subsForMonth,
                  isPaid: i === 0 ? isPaid : false,
                });
              }
            }
            await addEntriesBatch({ transactions: newTransactions });
          } else {
            const currentSubs = parsedSubTxs.map(s => ({
              name: s.name,
              amount: s.amount,
              installments: s.installments > 1 ? `1/${s.installments}` : undefined
            }));
            
            await addTransaction({
              name: name.trim(),
              amount: numAmount,
              category: macro,
              subcategory: finalSubcategory,
              transactionType: 'expense',
              nature: null,
              recurrency: fixedRecurrency,
              paymentMethod: finalPaymentMethod,
              monthKey,
              installments: installments.trim() || null,
              goalId: goalId || null,
              cardId: cardId || null,
              subTransactions: currentSubs,
              isPaid,
            });
          }
        }
      } else if (movementType === 'investment') {
        // Investimentos: Não contabilizado como despesa de consumo
        state.addAvailableMonth(monthKey);
        const transactionData = {
          name: name.trim(),
          amount: numAmount,
          category: 'Investimentos',
          subcategory: investmentAsset,
          transactionType: 'investment' as const,
          nature: null,
          recurrency: fixedRecurrency,
          paymentMethod: null,
          monthKey,
          installments: null,
          goalId: goalId || null,
          cardId: null,
          subTransactions: null,
          isPaid,
        };

        await addTransaction(transactionData);

        if (goalId) {
          try {
            // a marcação de fixo vale só para quem lançou: o dono da meta não deve copiá-la todo mês
            await contributeToSharedGoal(goalId, { ...transactionData, recurrency: null });
          } catch (err) {
            // o lançamento já está salvo aqui: avisar em vez de pedir para tentar de novo (duplicaria)
            alert(`O investimento foi salvo, mas não entrou na meta compartilhada. ${err instanceof Error ? err.message : err}`);
          }
        }
      } else {
        // Receitas
        state.addAvailableMonth(monthKey);
        await addIncome({
          name: name.trim(),
          amount: numAmount,
          monthKey,
          isRecurring: incomeType === 'salary',
          subTransactions: null,
          isPaid,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar os dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const availableMicros = getMicrosForMacro(macro);
  // parcelas dividem a linha com o valor; com sub-transações, cada item tem as suas
  const showInstallments = movementType === 'expense' && !hasSubTxs;
  const addSubTransaction = () => setSubTransactions([...subTransactions, { name: '', rawAmount: '', installments: '' }]);

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 12, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em' }}>
            {movementType === 'expense' && 'Nova Despesa'}
            {movementType === 'income' && 'Nova Receita'}
            {movementType === 'investment' && 'Novo Investimento'}
          </h2>
        </div>

        {/* ── Seletor de Tipo de Movimentação ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--bg-2)', padding: 4, borderRadius: 8, marginBottom: 16, gap: 4 }}>
          {([
            { id: 'expense', label: 'Despesa' },
            { id: 'income', label: 'Receita' },
            { id: 'investment', label: 'Investimento' },
          ] as const).map(tab => {
            const isActive = movementType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMovementType(tab.id)}
                disabled={isSubmitting}
                style={{
                  padding: '7px 0',
                  border: 'none',
                  background: isActive ? 'var(--blue)' : 'transparent',
                  borderRadius: 6,
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 12,
                  color: isActive ? '#FFF' : 'var(--text-tertiary)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.5 : 1,
                  textAlign: 'center',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* campos em pares (Valor + Parcelas, Macro + Micro, Mês + Ano) para a gaveta caber sem rolagem */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Descrição / Nome</label>
            <input
              className="form-input"
              type="text"
              placeholder={
                movementType === 'expense' ? 'Ex: Mercado Pão de Açúcar, Uber, Cinema...' :
                movementType === 'income' ? 'Ex: Salário, Dividendos Petrobras, Freelance...' :
                'Ex: CDB 120% CDI, Ações BBAS3, Reserva...'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* ── Valor + Parcelas ── */}
          <div style={{ display: 'grid', gridTemplateColumns: showInstallments ? '1fr 1fr' : '1fr', gap: '0 12px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Valor</label>
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

            {/* Parcelas com preenchimento livre e suporte retroativo */}
            {showInstallments && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Parcelas</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex: 3/3 ou 12"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          {showInstallments && installments && (() => {
            const p = parseInstallmentInput(installments);
            if (!p || p.total <= 1) return null;
            if (p.current === 1) {
              const endMonth = addMonths(monthKey, p.total - 1);
              return (
                <p style={{ fontSize: 12, color: 'var(--blue)', margin: '-4px 0 12px', fontWeight: 500 }}>
                  ✨ Serão criadas {p.total} parcelas consecutivas de {monthKeyToShortLabel(monthKey)} até {monthKeyToShortLabel(endMonth)}.
                </p>
              );
            }
            const startMonth = addMonths(monthKey, 1 - p.current);
            const endMonth = addMonths(monthKey, p.total - p.current);
            const backCount = p.current - 1;
            return (
              <p style={{ fontSize: 12, color: 'var(--blue)', margin: '-4px 0 12px', fontWeight: 500 }}>
                ✨ Parcela {p.current} de {p.total}. {backCount} parcela(s) retroativa(s) a partir de <strong>{monthKeyToShortLabel(startMonth)}</strong> até <strong>{monthKeyToShortLabel(endMonth)}</strong>. Meses faltantes serão criados automaticamente!
              </p>
            );
          })()}

          {/* Sub-transações (opcional) */}
          {movementType === 'expense' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasSubTxs ? 8 : 0 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Sub-transações (opcional)</label>
                <button
                  type="button"
                  onClick={addSubTransaction}
                  disabled={isSubmitting}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  + Adicionar
                </button>
              </div>

              {hasSubTxs && (
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
          )}

          {/* ── CAMPOS DE DESPESA: MACRO → MICRO DINÂMICO ── */}
          {movementType === 'expense' && (
            <>
              {/* alignItems end: se um rótulo quebrar linha (mobile), os selects seguem alinhados */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Categoria Macro</label>
                  <select
                    className="form-select"
                    value={macro}
                    onChange={(e) => handleMacroChange(e.target.value as ExpenseMacro)}
                    disabled={isSubmitting}
                  >
                    {EXPENSE_MACROS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* opcional: o padrão "Nenhuma / Geral" já indica isso, sem quebrar o rótulo */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Categoria Micro</label>
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

              {/* Cartão de Crédito (opcional) */}
              {cards.length > 0 && (
                <div className="form-group" style={{ marginBottom: 12 }}>
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
            </>
          )}

          {/* ── CAMPOS DE RECEITA ── */}
          {movementType === 'income' && (
            <>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Origem da Receita</label>
                <select
                  className="form-select"
                  value={incomeCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setIncomeCategory(cat);
                    if (cat === 'Salário' || cat === '13º salário' || cat === 'Férias') {
                      setIncomeType('salary');
                    } else {
                      setIncomeType('extra');
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Comportamento</label>
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
                          padding: '8px 0',
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
                          ? <><Banknote size={15} strokeWidth={1.8} /> Renda Mensal Fixa</>
                          : <><Sparkles size={15} strokeWidth={1.8} /> Recebimento Extra</>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── CAMPOS DE INVESTIMENTO ── */}
          {movementType === 'investment' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Tipo de Ativo</label>
                  <select
                    className="form-select"
                    value={investmentAsset}
                    onChange={(e) => setInvestmentAsset(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {INVESTMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Operação</label>
                  <select
                    className="form-select"
                    value={investmentOp}
                    onChange={(e) => setInvestmentOp(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {INVESTMENT_TYPES.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>

              {goals.length > 0 && (
                <div className="form-group" style={{ marginBottom: 12 }}>
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
            </>
          )}

          {/* ── Data da Transação: Mês + Ano ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
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

            <div className="form-group" style={{ marginBottom: 12 }}>
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
          </div>

          {movementType !== 'income' && (
            <FixedToggle
              checked={isFixed}
              onChange={setIsFixed}
              disabled={isSubmitting}
              hasInstallments={hasInstallments}
              label={movementType === 'investment' ? 'Investimento fixo' : 'Despesa fixa'}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {movementType === 'expense' ? 'Marcar como pago' : 
               movementType === 'income' ? 'Marcar como recebido' :
               movementType === 'investment' ? 'Marcar como executado' : 'Marcar como concluído'}
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
              {isSubmitting ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
