'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { isSettled, monthPaymentStatus, newlySettledMonths, useSettledMonths, type SettledMonth } from '@/lib/monthSettled';
import { holdSuccessConfetti, triggerMonthSettledConfetti } from '@/lib/confetti';
import { addMonths, formatCurrency, monthKeyToLabel } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

/**
 * O pagamento que quita o mês costuma sair de outro modal (edição, fatura do
 * cartão): este espera ele fechar, até esse limite, para não abrir por cima
 */
const WAIT_FOR_OTHER_MODALS_MS = 5000;
const WAIT_STEP_MS = 150;

const monthName = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
};

/**
 * Comemora quando um pagamento quita o mês, venha de onde vier (marcar todas,
 * uma por uma na edição, fatura do cartão): confete em ondas e o resumo do mês,
 * com o atalho para o seguinte. Montado uma vez na raiz do app.
 */
export default function MonthSettledModal() {
  const { selectedMonth, setSelectedMonth, addAvailableMonth } = useFinanceStore();
  const settledMonths = useSettledMonths();
  const [settled, setSettled] = useState<SettledMonth | null>(null);
  const close = () => setSettled(null);
  const swipeToClose = useSwipeToClose(close);

  // escuta o store direto: compara as transações de antes e depois de cada mudança
  useEffect(() => {
    let waitTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = useFinanceStore.subscribe((state, prev) => {
      if (state.transactions === prev.transactions) return;
      const months = newlySettledMonths(prev.transactions, state.transactions);
      if (months.length === 0) return;
      // vários de uma vez (ex: fatura que cobre meses diferentes): prefere o mês aberto
      const monthKey = months.includes(state.selectedMonth) ? state.selectedMonth : months[0];
      holdSuccessConfetti();

      const deadline = Date.now() + WAIT_FOR_OTHER_MODALS_MS;
      const open = () => {
        if (document.querySelector('.modal-overlay') && Date.now() < deadline) {
          waitTimer = setTimeout(open, WAIT_STEP_MS);
          return;
        }
        // a planilha pode ter recusado a gravação enquanto esperava
        const status = monthPaymentStatus(useFinanceStore.getState().transactions).get(monthKey);
        if (!status || !isSettled(status)) return;
        setSettled({ monthKey, ...status });
        triggerMonthSettledConfetti();
      };
      clearTimeout(waitTimer);
      open();
    });

    return () => {
      unsubscribe();
      clearTimeout(waitTimer);
    };
  }, []);

  // pagamento desfeito (ou a planilha recusou a gravação): o mês deixou de estar quitado
  if (!settled || !settledMonths.has(settled.monthKey)) return null;

  const name = monthName(settled.monthKey);
  const nextMonth = addMonths(settled.monthKey, 1);

  const goToNextMonth = () => {
    addAvailableMonth(nextMonth);
    setSelectedMonth(nextMonth);
    close();
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={close}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-settled-title"
        onClick={(e) => e.stopPropagation()}
        style={{ ...swipeToClose.style, textAlign: 'center' }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
        </div>

        {/* Ícone */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--green-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--green)',
        }}>
          <PartyPopper size={24} strokeWidth={1.8} />
        </div>

        <h2 id="month-settled-title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {name.charAt(0).toUpperCase() + name.slice(1)} finalizado!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 20 }}>
          Todas as despesas de {monthKeyToLabel(settled.monthKey)} estão pagas. Parabéns pela disciplina:
          manter as contas em dia deixa o próximo mês bem mais tranquilo. Continue assim!
        </p>

        <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {formatCurrency(settled.amount)}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 28 }}>
          {settled.count} {settled.count === 1 ? 'despesa paga' : 'despesas pagas'}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          {nextMonth !== selectedMonth ? (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={close}
                style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={goToNextMonth}
                style={{ flex: 2, justifyContent: 'center', padding: '14px', gap: 8 }}
              >
                Ir para {monthName(nextMonth)}
                <ArrowRight size={16} strokeWidth={2.25} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={close}
              style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
