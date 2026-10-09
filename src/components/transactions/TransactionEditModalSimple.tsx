'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Category, Transaction } from '@/lib/types';
import { CATEGORY_NAMES } from '@/lib/categories';
import { SIMPLE_TAXONOMY } from '@/lib/taxonomy';
import { formatMask, parseMask, formatCurrency, splitInstallments } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { triggerSuccessConfetti } from '@/lib/confetti';
import { isFixedTransaction, hasRepeatingInstallments, LEGACY_FIXED_CATEGORY } from '@/lib/fixedTransactions';
import { addSubsToMonthGroup, installmentsToRelink, newInstallmentCount, spreadSubTransactions } from '@/lib/installments';
import FixedToggle from './FixedToggle';
import SubTransactionsPanel, { SubTransactionsSummary, draftCategoryFields, toSubTransactionDraft, useSubTransactionsView, type SubTransactionDraft } from './SubTransactionsPanel';
import SwitchField from '@/components/ui/SwitchField';

const CATEGORIES = CATEGORY_NAMES as Category[];

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

interface TransactionEditModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function TransactionEditModalSimple({ transaction, onClose }: TransactionEditModalProps) {
  const { updateTransaction, addEntriesBatch, setTransactionsCard, transactions, cards } = useFinanceStore();
  const [name, setName] = useState(transaction.name);
  const [rawAmount, setRawAmount] = useState(String(Math.round(Math.abs(transaction.amount) * 100)));
  // Transações lançadas no modo detalhado aparecem com a categoria simples
  // equivalente. Se o usuário não trocar a categoria, a Macro › Micro original
  // é preservada; se trocar, a micro deixa de fazer sentido e é limpa.
  // A categoria legada "Fixos" não é preservada: ao salvar, vira a categoria exibida.
  const initialCategory = SIMPLE_TAXONOMY.normalize(transaction).category;
  const [category, setCategory] = useState<Category>(initialCategory);
  const keepOriginalCategory = category === initialCategory && transaction.category !== LEGACY_FIXED_CATEGORY;
  const categoryFields = keepOriginalCategory
    ? { category: transaction.category, subcategory: transaction.subcategory ?? null }
    : { category, subcategory: null };
  const [cardId, setCardId] = useState(transaction.cardId || '');
  const [installments, setInstallments] = useState(transaction.installments || '');
  const [subTransactions, setSubTransactions] = useState<SubTransactionDraft[]>(
    transaction.subTransactions ? transaction.subTransactions.map(toSubTransactionDraft) : []
  );
  const subsView = useSubTransactionsView(subTransactions, setSubTransactions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(transaction.isPaid || false);
  const [isFixed, setIsFixed] = useState(isFixedTransaction(transaction));
  const swipeToClose = useSwipeToClose(onClose);

  const hasSubTxs = subTransactions.length > 0;
  const hasInstallments = hasRepeatingInstallments(hasSubTxs ? null : installments, subTransactions);
  const fixedRecurrency = isFixed && !hasInstallments ? 'Fixo' as const : null;
  const subInputs = subTransactions.map(s => ({ name: s.name.trim(), amount: parseInt(s.rawAmount || '0', 10) / 100, installments: s.installments, ...draftCategoryFields(s) }));
  const totalSubAmount = subInputs.reduce((acc, s) => acc + s.amount, 0);
  // Valor deste mês: das subs com parcelas novas entra só a 1ª parcela, igual ao que é gravado
  const monthSubAmount = (spreadSubTransactions(subInputs)[0] ?? []).reduce((acc, s) => acc + s.amount, 0);

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

    // O cartão vale para a compra toda: as parcelas seguintes acompanham a escolha,
    // senão só a parcela editada entra no limite usado do cartão
    const relinkIds = installmentsToRelink(transactions, transaction, cardId || null).map((t) => t.id);

    setIsSubmitting(true);
    try {
      if (maxMonths > 1) {
        // Só as parcelas vão para os meses seguintes: fixas e salário entram pelo "Iniciar mês"
        const newTransactions: Omit<Transaction, 'id'>[] = [];
        const monthGroupUpdates: NonNullable<ReturnType<typeof addSubsToMonthGroup>>[] = [];
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

          if (i === 0) {
            firstInstallment = {
              name: name.trim(),
              amount: currentParentAmount,
              ...categoryFields,
              subTransactions: currentSubs,
              isPaid,
              cardId: cardId || null,
              installments: installmentLabel,
              recurrency: fixedRecurrency,
            };
          } else {
            const monthGroup = currentSubs && addSubsToMonthGroup(transactions, transaction, nextMonthKey, currentSubs);
            if (monthGroup) {
              monthGroupUpdates.push(monthGroup);
              continue;
            }
            newTransactions.push({
              name: name.trim(),
              amount: currentParentAmount,
              ...categoryFields,
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
        for (const { id, updates } of monthGroupUpdates) await updateTransaction(id, updates);
        await addEntriesBatch({ transactions: newTransactions });
      } else {
        const currentSubs = hasValidSubTxs ? subsByMonth[0] : null;

        await updateTransaction(transaction.id, { 
          name: name.trim(), 
          amount: numAmount, 
          ...categoryFields,
          subTransactions: currentSubs,
          isPaid,
          cardId: cardId || null,
          installments: installments || null,
          recurrency: fixedRecurrency,
        });
      }
      
      await setTransactionsCard(relinkIds, cardId || null);

      if (isPaid && !transaction.isPaid) {
        triggerSuccessConfetti();
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar a transação.');
      setIsSubmitting(false);
    }
  };

  const showCard = !!cards && cards.length > 0;
  // Sem cartão, a coluna da direita fica com uma linha a menos: a das subs passa para lá
  // (no celular as colunas empilham e a ordem dos campos não muda)
  const subsSummary = (
    <div className="form-group">
      <SubTransactionsSummary
        count={subTransactions.length}
        total={totalSubAmount}
        onOpen={subsView.open}
        disabled={isSubmitting}
      />
    </div>
  );

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
            parentCategory={categoryFields}
            disabled={isSubmitting}
          />
        ) : (
          // Sem rolagem: campos em pares e sub-transações numa tela própria. No desktop, duas colunas
          <form onSubmit={handleSubmit} className={subsView.formClassName}>
            <div className="tx-form-columns">
              {/* ── O que é e quanto custa ── */}
              <div>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input
                    className="form-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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

                {showCard && subsSummary}
              </div>

              {/* ── Categoria, cartão e situação: no desktop, Categoria e Cartão empilham para esta
                  coluna ter a altura da esquerda (no celular continuam lado a lado) ── */}
              <div>
                {!showCard && subsSummary}

                <div className={showCard ? 'tx-form-row tx-form-row-stack' : undefined}>
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showCard && (
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
                </div>

                <div className="tx-form-row tx-switch-row form-group">
                  <FixedToggle
                    checked={isFixed}
                    onChange={setIsFixed}
                    disabled={isSubmitting}
                    hasInstallments={hasInstallments}
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
