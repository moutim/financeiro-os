'use client';

import { useState } from 'react';
import { Banknote, CheckCircle2, Sparkles } from 'lucide-react';
import type { 
  ExpenseMacro, 
  TransactionType,
  PaymentMethod,
  Transaction,
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
  formatCurrency,
  splitInstallments,
} from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { hasRepeatingInstallments } from '@/lib/fixedTransactions';
import FixedToggle from './FixedToggle';
import MonthKeySelect from './MonthKeySelect';
import SubTransactionsPanel, { SubTransactionsSummary, draftCategoryFields, useSubTransactionsView, type SubTransactionDraft } from './SubTransactionsPanel';
import SwitchField from '@/components/ui/SwitchField';

const CURRENT_YEAR = new Date().getFullYear();

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

  // Mês e ano num único seletor ("Out 2026")
  const [monthKey, setMonthKey] = useState(() => {
    const initialDate = parseMonthKey(selectedMonth) || { year: CURRENT_YEAR, month: new Date().getMonth() + 1 };
    return `${initialDate.year}-${String(initialDate.month).padStart(2, '0')}`;
  });

  const [installments, setInstallments] = useState('');
  const [goalId, setGoalId] = useState('');
  const [cardId, setCardId] = useState('');
  const [subTransactions, setSubTransactions] = useState<SubTransactionDraft[]>([]);
  const subsView = useSubTransactionsView(subTransactions, setSubTransactions);
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
  const getSubInstallments = (sub: { installments: string }) => parseInstallmentInput(sub.installments)?.total ?? 1;
  const totalSubAmount = subTransactions.reduce((acc, sub) => {
    const amt = parseInt(sub.rawAmount || '0', 10) / 100;
    return acc + amt;
  }, 0);
  // Valor deste mês: das sub-transações parceladas entra só a 1ª parcela, igual ao que é gravado no envio
  const monthSubAmount = subTransactions.reduce((acc, sub) => {
    const amt = parseInt(sub.rawAmount || '0', 10) / 100;
    return acc + splitInstallments(amt, getSubInstallments(sub)).first;
  }, 0);
  const displayAmount = hasSubTxs ? formatCurrency(monthSubAmount) : formatMask(rawDigits);

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
      const parsedInst = parseInstallmentInput(installments);

      if (movementType === 'expense') {
        // Caso de parcelas com cálculo retroativo/futuro (ex: "3/3", "2/5", "12x")
        if (!hasValidSubTxs && parsedInst && parsedInst.total > 1) {
          const { current, total } = parsedInst;
          // Só as parcelas vão para os outros meses: fixas e salário entram pelo "Iniciar mês"
          const newTransactions: Omit<Transaction, 'id'>[] = [];

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
          }
          await addEntriesBatch({ transactions: newTransactions });
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
                  installments: s.installments > 1 ? `${i + 1}/${s.installments}` : undefined,
                  ...s.categoryFields,
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
              installments: s.installments > 1 ? `1/${s.installments}` : undefined,
              ...s.categoryFields,
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
  const paidLabel = movementType === 'expense' ? 'Pago' : movementType === 'income' ? 'Recebido' : 'Executado';
  const showCard = movementType === 'expense' && cards.length > 0;
  const showGoal = movementType === 'investment' && goals.length > 0;

  // Investimento: com meta, Tipo de Ativo + Operação ficam à esquerda e Meta e Mês empilham
  // à direita (desktop); sem meta, ficam à direita. Nos dois casos as colunas têm alturas
  // parecidas, e no celular a ordem dos campos é a mesma
  const investmentFields = movementType === 'investment' && (
    <div className="tx-form-row">
      <div className="form-group">
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

      <div className="form-group">
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
  );

  // Uma linha só: o aviso não pode empurrar o formulário para fora da tela
  const installmentsHint = (() => {
    const p = showInstallments ? parseInstallmentInput(installments) : null;
    if (!p || p.total <= 1) return null;
    const startMonth = addMonths(monthKey, 1 - p.current);
    const endMonth = addMonths(monthKey, p.total - p.current);
    return p.current === 1
      ? `✨ ${p.total} parcelas, de ${monthKeyToShortLabel(startMonth)} a ${monthKeyToShortLabel(endMonth)}`
      : `✨ Parcela ${p.current} de ${p.total}: cria de ${monthKeyToShortLabel(startMonth)} a ${monthKeyToShortLabel(endMonth)}`;
  })();

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
              {movementType === 'expense' && 'Nova Despesa'}
              {movementType === 'income' && 'Nova Receita'}
              {movementType === 'investment' && 'Novo Investimento'}
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
            parentCategory={movementType === 'expense' ? { category: macro, subcategory: micro.trim() || null } : null}
            disabled={isSubmitting}
          />
        ) : (
          <div className={subsView.formClassName}>
            {/* ── Seletor de Tipo de Movimentação ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--bg-2)', padding: 4, borderRadius: 8, marginBottom: 12, gap: 4 }}>
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

            {/* Sem rolagem: campos em pares e sub-transações numa tela própria. No desktop, duas colunas */}
            <form onSubmit={handleSubmit}>
              <div className="tx-form-columns">
                {/* ── O que é e quanto custa ── */}
                <div>
                  <div className="form-group">
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

                    {/* Parcelas com preenchimento livre e suporte retroativo */}
                    {showInstallments && (
                      <div className="form-group">
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
                  {installmentsHint && <p className="tx-form-hint" title={installmentsHint}>{installmentsHint}</p>}

                  {movementType === 'expense' && (
                    <div className="form-group">
                      <SubTransactionsSummary
                        count={subTransactions.length}
                        total={totalSubAmount}
                        onOpen={subsView.open}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  {/* ── CAMPOS DE RECEITA ── */}
                  {movementType === 'income' && (
                    <div className="form-group">
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
                  )}
                  {showGoal && investmentFields}
                </div>

                {/* ── Categoria, onde, quando e situação: a categoria abre esta coluna para os dois lados terem
                    alturas parecidas no desktop (no celular as colunas empilham e a ordem não muda) ── */}
                <div>
                  {/* ── CAMPOS DE DESPESA: MACRO → MICRO DINÂMICO ── */}
                  {movementType === 'expense' && (
                    <div className="tx-form-row">
                      <div className="form-group">
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
                      <div className="form-group">
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
                  )}

                  {!showGoal && investmentFields}

                  {movementType === 'income' && (
                    <div className="form-group">
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
                  )}

                  {/* Cartão (despesa) ou Meta (investimento) dividem a linha com o mês */}
                  {(() => {
                    const rowClass = showCard ? 'tx-form-row' : showGoal ? 'tx-form-row tx-form-row-stack' : undefined;
                    return (
                      <div className={rowClass}>
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
                        <div className="form-group">
                          <label className="form-label">Mês</label>
                          <MonthKeySelect value={monthKey} onChange={setMonthKey} disabled={isSubmitting} />
                        </div>
                      </div>
                    );
                  })()}

                  <div className={movementType !== 'income' ? 'tx-form-row tx-switch-row form-group' : 'form-group'}>
                    {movementType !== 'income' && (
                      <FixedToggle
                        checked={isFixed}
                        onChange={setIsFixed}
                        disabled={isSubmitting}
                        hasInstallments={hasInstallments}
                        label={movementType === 'investment' ? 'Fixo mensal' : 'Despesa fixa'}
                      />
                    )}
                    <SwitchField
                      label={paidLabel}
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
