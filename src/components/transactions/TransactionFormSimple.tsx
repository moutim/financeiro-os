'use client';

import { useState } from 'react';
import { Banknote, CheckCircle2, Sparkles } from 'lucide-react';
import type { Category, Income, Transaction } from '@/lib/types';
import { useFinanceStore } from '@/lib/store';
import { CATEGORY_NAMES } from '@/lib/categories';
import { formatMask, parseMask, formatCurrency, splitInstallments } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { hasRepeatingInstallments } from '@/lib/fixedTransactions';
import FixedToggle from './FixedToggle';
import MonthKeySelect from './MonthKeySelect';
import SubTransactionsPanel, { SubTransactionsSummary, draftCategoryFields, useSubTransactionsView, type SubTransactionDraft } from './SubTransactionsPanel';
import SwitchField from '@/components/ui/SwitchField';

const CATEGORIES = CATEGORY_NAMES as Category[];

interface TransactionFormProps {
  onClose: () => void;
}

export default function TransactionFormSimple({ onClose }: TransactionFormProps) {
  const { addTransaction, addIncome, addEntriesBatch, contributeToSharedGoal, selectedMonth, goals, availableMonths, cards } = useFinanceStore();
  const [name, setName] = useState('');
  const [rawDigits, setRawDigits] = useState(''); // apenas dígitos, ex: "123456" = R$ 1.234,56
  const [category, setCategory] = useState<Category>('Compras');
  const [monthKey, setMonthKey] = useState(selectedMonth);
  const [installments, setInstallments] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [incomeType, setIncomeType] = useState<'salary' | 'extra'>('salary');
  const [goalId, setGoalId] = useState('');
  const [cardId, setCardId] = useState('');
  const [subTransactions, setSubTransactions] = useState<SubTransactionDraft[]>([]);
  const subsView = useSubTransactionsView(subTransactions, setSubTransactions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const swipeToClose = useSwipeToClose(onClose);

  const hasSubTxs = subTransactions.length > 0;
  const hasInstallments = hasRepeatingInstallments(hasSubTxs ? null : installments, subTransactions);
  const fixedRecurrency = isFixed && !hasInstallments ? 'Fixo' as const : null;
  const getSubInstallments = (sub: { installments: string }) => {
    const inst = parseInt(sub.installments || '1', 10);
    return isNaN(inst) || inst < 1 ? 1 : inst;
  };
  const totalSubAmount = subTransactions.reduce((acc, sub) => {
    const amt = parseInt(sub.rawAmount || '0', 10) / 100;
    return acc + amt; // O usuário insere o valor total, a divisão ocorre na submissão
  }, 0);
  // Valor deste mês: das sub-transações parceladas entra só a 1ª parcela, igual ao que é gravado no envio
  const monthSubAmount = subTransactions.reduce((acc, sub) => {
    const amt = parseInt(sub.rawAmount || '0', 10) / 100;
    return acc + splitInstallments(amt, getSubInstallments(sub)).first;
  }, 0);
  const displayAmount = hasSubTxs ? formatCurrency(monthSubAmount) : formatMask(rawDigits);

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
        const inst = getSubInstallments(s);
        const totalSubAmt = parseInt(s.rawAmount || '0', 10) / 100;
        const { first: firstAmt, rest: subAmt } = splitInstallments(totalSubAmt, inst);

        return {
          name: s.name.trim(),
          amount: totalSubAmt,
          subAmt,
          firstAmt,
          installments: inst,
          categoryFields: draftCategoryFields(s),
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
          // Só as parcelas vão para os meses seguintes: fixas e salário entram pelo "Iniciar mês"
          const newTransactions: Omit<Transaction, 'id'>[] = [];

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
                  installments: s.installments > 1 ? `${i + 1}/${s.installments}` : undefined,
                  ...s.categoryFields,
                };
              });
              
              if (subsForMonth.length > 0) {
                currentSubs = subsForMonth;
                currentParentAmount = subsForMonth.reduce((acc, curr) => acc + curr.amount, 0);
              } else {
                continue; // no subtransactions in this month, skip
              }
            }

            newTransactions.push({
              name: name.trim(),
              amount: currentParentAmount,
              category,
              monthKey: nextMonthKey,
              installments: maxMonths > 1 && !hasValidSubTxs ? `${i + 1}/${maxMonths}` : null,
              goalId: goalId || null,
              cardId: cardId || null,
              subTransactions: currentSubs,
              isPaid: i === 0 ? isPaid : false,
            });
          }
          await addEntriesBatch({ transactions: newTransactions });
        } else {
          const currentSubs = hasValidSubTxs ? parsedSubTxs.map(s => ({
            name: s.name,
            amount: s.amount,
            installments: s.installments > 1 ? `1/${s.installments}` : undefined,
            ...s.categoryFields,
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
            recurrency: fixedRecurrency,
          };
          
          await addTransaction(transactionData);

          // If the goal is shared, we must also write this transaction to the owner's spreadsheet
          if (goalId && category === 'Investimentos') {
            try {
              // a marcação de fixo vale só para quem lançou: o dono da meta não deve copiá-la todo mês
              await contributeToSharedGoal(goalId, { ...transactionData, recurrency: null });
            } catch (err) {
              // o lançamento já está salvo aqui: avisar em vez de pedir para tentar de novo (duplicaria)
              alert(`O investimento foi salvo, mas não entrou na meta compartilhada. ${err instanceof Error ? err.message : err}`);
            }
          }
        }
      } else {
        // Receitas
        if (maxMonths > 1) {
          const newIncomes: Omit<Income, 'id'>[] = [];
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
              newIncomes.push({
                name: name.trim(),
                amount: currentParentAmount,
                monthKey: nextMonthKey,
                isRecurring: incomeType === 'salary',
                subTransactions: subsForMonth,
                isPaid: i === 0 ? isPaid : false,
              });
            }
          }
          await addEntriesBatch({ incomes: newIncomes });
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

  const showInstallments = type === 'expense' && !hasSubTxs;
  const showGoal = type === 'expense' && category === 'Investimentos';
  const showCard = type === 'expense' && cards.length > 0;

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className={`modal-sheet tx-modal animate-slide-in-sheet ${subsView.isOpen ? '' : 'tx-modal-columns'}`}
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} className="tx-modal-header">
          <div className="modal-handle" />
          {!subsView.isOpen && (
            <h2 className="tx-modal-title">
              {type === 'expense' ? 'Novo Gasto' : 'Novo Ganho'}
            </h2>
          )}
        </div>

        {subsView.isOpen ? (
          <SubTransactionsPanel
            subs={subTransactions}
            onChange={setSubTransactions}
            onDone={subsView.close}
            monthAmount={monthSubAmount}
            totalAmount={totalSubAmount}
            installmentsDigitsOnly
            parentCategory={type === 'expense' ? { category } : null}
            disabled={isSubmitting}
          />
        ) : (
          <div className={subsView.formClassName}>
            <div style={{ display: 'flex', background: 'var(--bg-2)', padding: 4, borderRadius: 8, marginBottom: 12 }}>
              {([
                { id: 'expense', label: 'Gasto' },
                { id: 'income', label: 'Ganho' },
              ] as const).map((tab) => {
                const isActive = type === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setType(tab.id)}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      border: 'none',
                      background: isActive ? 'var(--blue)' : 'transparent',
                      borderRadius: 6,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#FFF' : 'var(--text-tertiary)',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: isSubmitting ? 0.5 : 1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Sem rolagem: campos em pares e sub-transações numa tela própria. No desktop, duas colunas */}
            <form onSubmit={handleSubmit}>
              <div className="tx-form-columns">
                {/* ── O que é e quanto custa ── */}
                <div>
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

                  <div className={showInstallments ? 'tx-form-row' : undefined}>
                    <div className="form-group">
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

                    {showInstallments && (
                      <div className="form-group">
                        <label className="form-label">Parcelas</label>
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

                  <div className="form-group">
                    <SubTransactionsSummary
                      count={subTransactions.length}
                      total={totalSubAmount}
                      onOpen={subsView.open}
                      disabled={isSubmitting}
                    />
                  </div>

                </div>

                {/* ── Categoria, onde, quando e situação: a categoria abre esta coluna para os dois lados terem
                    alturas parecidas no desktop (no celular as colunas empilham e a ordem não muda) ── */}
                <div>
                  {type === 'income' && (
                    <div className="form-group">
                      <label className="form-label">Tipo de ganho</label>
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
                                ? <><Banknote size={15} strokeWidth={1.8} /> Salário</>
                                : <><Sparkles size={15} strokeWidth={1.8} /> Recebimento Extra</>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* a meta divide a linha com a categoria, para Investimentos não somar uma linha */}
                  {type === 'expense' && (
                    <div className={showGoal ? 'tx-form-row' : undefined}>
                      <div className="form-group">
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

                      {showGoal && (
                        <div className="form-group">
                          <label className="form-label">Meta (opcional)</label>
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
                    </div>
                  )}

                  <div className={showCard ? 'tx-form-row' : undefined}>
                    {showCard && (
                      <div className="form-group">
                        <label className="form-label">Cartão (opcional)</label>
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
                    <div className="form-group">
                      <label className="form-label">Mês</label>
                      <MonthKeySelect value={monthKey} onChange={setMonthKey} monthKeys={availableMonths} disabled={isSubmitting} />
                    </div>
                  </div>

                  <div className={type === 'expense' ? 'tx-form-row tx-switch-row form-group' : 'form-group'}>
                    {type === 'expense' && (
                      <FixedToggle
                        checked={isFixed}
                        onChange={setIsFixed}
                        disabled={isSubmitting}
                        hasInstallments={hasInstallments}
                      />
                    )}
                    <SwitchField
                      label={type === 'expense' ? 'Pago' : 'Recebido'}
                      icon={CheckCircle2}
                      checked={isPaid}
                      onChange={setIsPaid}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="tx-form-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ flex: 1, opacity: isSubmitting ? 0.5 : 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={{ flex: 2, opacity: isSubmitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {isSubmitting && <div className="btn-spinner" />}
                  {isSubmitting ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
