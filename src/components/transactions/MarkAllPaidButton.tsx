'use client';

import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { Transaction } from '@/lib/types';

/** Quanto tempo o pedido de confirmação fica no botão antes de voltar ao normal */
const CONFIRM_TIMEOUT_MS = 3000;

/**
 * Ação do cabeçalho de Transações: marca as pendentes como pagas. O primeiro
 * toque pede confirmação (o botão fica verde com a quantidade), como os botões
 * de ação em massa do iOS; some quando não há nada pendente.
 */
export default function MarkAllPaidButton({ transactions }: { transactions: Transaction[] }) {
  const markTransactionsPaid = useFinanceStore((state) => state.markTransactionsPaid);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const unpaidIds = transactions.filter((t) => !t.isPaid).map((t) => t.id);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (unpaidIds.length === 0 && !isSaving) return null;

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setIsSaving(true);
    try {
      await markTransactionsPaid(unpaidIds);
    } catch (err) {
      console.error(err);
      alert('Erro ao marcar as transações como pagas.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      className={`toolbar-button ${confirming ? 'confirming' : ''}`}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={isSaving}
    >
      {isSaving ? <span className="btn-spinner" /> : <CheckCheck size={14} strokeWidth={2.25} />}
      {isSaving
        ? 'Marcando…'
        : confirming
          ? `Marcar ${unpaidIds.length} como ${unpaidIds.length === 1 ? 'paga' : 'pagas'}?`
          : 'Marcar todas como pagas'}
    </button>
  );
}
