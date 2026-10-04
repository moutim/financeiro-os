'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Transaction } from '@/lib/types';
import { 
  EXPENSE_MACROS, 
  getMicrosForMacro, 
  INVESTMENT_CATEGORIES, 
} from '@/lib/detailedCategories';
import { DETAILED_TAXONOMY } from '@/lib/taxonomy';
import { formatMask, parseMask, addMonths, parseMonthKey, formatCurrency, splitInstallments } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { triggerSuccessConfetti } from '@/lib/confetti';
import { isFixedTransaction, hasRepeatingInstallments } from '@/lib/fixedTransactions';
import { installmentsToRelink, newInstallmentCount, spreadSubTransactions } from '@/lib/installments';
import FixedToggle from './FixedToggle';
import MonthKeySelect from './MonthKeySelect';
import SubTransactionsPanel, { SubTransactionsSummary, useSubTransactionsView, type SubTransactionDraft } from './SubTransactionsPanel';
import SwitchField from '@/components/ui/SwitchField';

const CURRENT_YEAR = new Date().getFullYear();

const ALL_MACROS_EDIT = [
  ...EXPENSE_MACROS,
  'Investimentos',
] as const;

interface TransactionEditModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function TransactionEditModalDetailed({ transaction, onClose }: TransactionEditModalProps) {
  const { updateTransaction, addEntriesBatch, setTransactionsCard, transactions, cards, addAvailableMonth } = useFinanceStore();
  const [name, setName] = useState(transaction.name);
  const [rawAmount, setRawAmount] = useState(String(Math.round(Math.abs(transaction.amount) * 100)));

  // Data da Transação: mês e ano num único seletor ("Out 2026")
  const [monthKey, setMonthKey] = useState(() => {
    const initialDate = parseMonthKey(transaction.monthKey) || { year: CURRENT_YEAR, month: new Date().getMonth() + 1 };
    return `${initialDate.year}-${String(initialDate.month).padStart(2, '0')}`;
  });

  // Começa com a mesma Macro › Micro exibida na lista (categorias legadas são convertidas)
  const initialView = DETAILED_TAXONOMY.normalize(transaction);
  const [macro, setMacro] = useState<string>(initialView.category);
  const [micro, setMicro] = useState<string>(initialView.subcategory || '');

  const [cardId, setCardId] = useState(transaction.cardId || '');
  const [installments, setInstallments] = useState(transaction.installments || '');
  const [subTransactions, setSubTransactions] = useState<SubTransactionDraft[]>(
    transaction.subTransactions 
      ? transaction.subTransactions.map(st => ({ name: st.name, rawAmount: String(Math.round(st.amount * 100)), installments: st.installments || '' }))
      : []
  );
  const subsView = useSubTransactionsView(subTransactions, setSubTransactions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(transaction.isPaid || false);
  const [isFixed, setIsFixed] = useState(isFixedTransaction(transaction));
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
  const subInputs = subTransactions.map(s => ({ name: s.name.trim(), amount: parseInt(s.rawAmount || '0', 10) / 100, installments: s.installments }));
  const totalSubAmount = subInputs.reduce((acc, s) => acc + s.amount, 0);
  // Valor deste mês: das subs com parcelas novas entra só a 1ª parcela, igual ao que é gravado
  const monthSubAmount = (spreadSubTransactions(subInputs)[0] ?? []).reduce((acc, s) => acc + s.amount, 0);
  const hasInstallments = hasRepeatingInstallments(hasSubTxs ? null : installments, subTransactions);
  const fixedRecurrency = isFixed && !hasInstallments ? 'Fixo' as const : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const numAmount = hasSubTxs ? monthSubAmount : (parseInt(rawAmount || '0', 10) / 100);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    const validSubs = subInputs.filter(s => s.name && s.amount > 0);
    const hasValidSubTxs = validSubs.length > 0;
    // Subs de cada mês a partir do editado. Só um número de parcelas digitado cria meses:
    // uma parcela já gravada ("2/6") fica no mês dela, sem duplicar as seguintes
    const subsByMonth = spreadSubTransactions(validSubs);
    const maxMonths = hasValidSubTxs ? subsByMonth.length : newInstallmentCount(installments);

    const txType = macro === 'Investimentos' ? 'investment' : 'expense';

    // O cartão vale para a compra toda: as parcelas seguintes acompanham a escolha,
    // senão só a parcela editada entra no limite usado do cartão
    const relinkIds = installmentsToRelink(transactions, transaction, cardId || null).map((t) => t.id);

    setIsSubmitting(true);
    try {
      if (maxMonths > 1) {
        // Só as parcelas vão para os meses seguintes: fixas e salário entram pelo "Iniciar mês"
        const newTransactions: Omit<Transaction, 'id'>[] = [];
        let firstInstallment: Partial<Omit<Transaction, 'id'>> | null = null;
        
        // Sem subs, o valor digitado é o total: dividido como no cadastro, centavos na 1ª parcela
        const { first: firstAmount, rest: restAmount } = splitInstallments(numAmount, maxMonths);

        for (let i = 0; i < maxMonths; i++) {
          const nextMonthKey = addMonths(transaction.monthKey, i);
          
          const currentSubs = hasValidSubTxs ? subsByMonth[i] : null;
          const currentParentAmount = currentSubs
            ? currentSubs.reduce((acc, curr) => acc + curr.amount, 0)
            : (i === 0 ? firstAmount : restAmount);

          const installmentLabel = hasValidSubTxs ? null : `${i + 1}/${maxMonths}`;

          const finalSubcategory = micro.trim() || null;
          const finalPaymentMethod = cardId ? ('Crédito' as const) : null;

          if (i === 0) {
            firstInstallment = {
              name: name.trim(),
              amount: currentParentAmount,
              category: macro,
              subcategory: finalSubcategory,
              transactionType: txType,
              nature: null,
              recurrency: fixedRecurrency,
              paymentMethod: finalPaymentMethod,
              subTransactions: currentSubs,
              isPaid,
              cardId: cardId || null,
              installments: installmentLabel
            };
          } else {
            newTransactions.push({
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
            });
          }
        }
        // em sequência: nunca duas gravações simultâneas na planilha
        if (firstInstallment) await updateTransaction(transaction.id, firstInstallment);
        await addEntriesBatch({ transactions: newTransactions });
      } else {
        const currentSubs = hasValidSubTxs ? subsByMonth[0] : null;

        addAvailableMonth(monthKey);
        await updateTransaction(transaction.id, { 
          name: name.trim(), 
          amount: numAmount, 
          category: macro,
          subcategory: micro.trim() || null,
          transactionType: txType,
          nature: null,
          recurrency: fixedRecurrency,
          paymentMethod: cardId ? 'Crédito' : null,
          monthKey,
          subTransactions: currentSubs,
          isPaid,
          cardId: cardId || null,
          installments: installments || null
        });
      }
      
      await setTransactionsCard(relinkIds, cardId || null);

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
        className={`modal-sheet tx-modal animate-slide-in-sheet ${subsView.isOpen ? '' : 'tx-modal-columns'}`}
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} className="tx-modal-header">
          <div className="modal-handle" />
          {!subsView.isOpen && <h2 className="tx-modal-title">Editar Transação</h2>}
        </div>

        {subsView.isOpen ? (
          <SubTransactionsPanel
            subs={subTransactions}
            onChange={setSubTransactions}
            onDone={subsView.close}
            monthAmount={monthSubAmount}
            totalAmount={totalSubAmount}
            disabled={isSubmitting}
          />
        ) : (
          // Sem rolagem: campos em pares e sub-transações numa tela própria. No desktop, duas colunas
          <form onSubmit={handleSubmit} className={subsView.formClassName}>
            <div className="tx-form-columns">
              {/* ── O que é e quanto custa ── */}
              <div>
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

                {/* com sub-transações, cada item tem as suas parcelas */}
                <div className={!hasSubTxs ? 'tx-form-row' : undefined}>
                  <div className="form-group">
                    <label className="form-label">Valor</label>
                    <input
                      className="form-input"
                      type="text"
                      inputMode="numeric"
                      value={hasSubTxs ? formatCurrency(monthSubAmount) : formatMask(rawAmount)}
                      onChange={(e) => {
                        if (!hasSubTxs) setRawAmount(parseMask(e.target.value));
                      }}
                      disabled={hasSubTxs || isSubmitting}
                    />
                  </div>

                  {!hasSubTxs && (
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
                {/* ── Macro e Micro ── */}
                <div className="tx-form-row">
                  <div className="form-group">
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

                <div className={cards && cards.length > 0 ? 'tx-form-row' : undefined}>
                  {cards && cards.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Cartão</label>
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
                    <MonthKeySelect value={monthKey} onChange={setMonthKey} disabled={isSubmitting} />
                  </div>
                </div>

                <div className="tx-form-row tx-switch-row form-group">
                  <FixedToggle
                    checked={isFixed}
                    onChange={setIsFixed}
                    disabled={isSubmitting}
                    hasInstallments={hasInstallments}
                    label={macro === 'Investimentos' ? 'Fixo mensal' : 'Despesa fixa'}
                  />
                  <SwitchField
                    label="Pago"
                    icon={CheckCircle2}
                    checked={isPaid}
                    onChange={setIsPaid}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="tx-form-actions">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting} style={{ flex: 1, opacity: isSubmitting ? 0.5 : 1 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 1, opacity: isSubmitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isSubmitting && <div className="btn-spinner" />}
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
