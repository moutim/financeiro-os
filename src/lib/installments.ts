import { splitInstallments } from '@/lib/currency';
import type { SubTransaction, Transaction } from '@/lib/types';

/** Transação parcelada: ela mesma ou alguma das sub-transações tem parcela "x/y" */
export function isInstallmentTransaction(t: Transaction): boolean {
  if (t.installments?.includes('/')) return true;
  return !!t.subTransactions?.some((st) => st.installments?.includes('/'));
}

/**
 * Parcelas dos meses seguintes que devem acompanhar o cartão escolhido ao editar uma delas.
 * Cada parcela é uma linha própria na planilha, sem ID em comum: a compra é reconhecida
 * pelo nome, como na exclusão das parcelas. Só entram as que estão sem cartão ou no cartão
 * anterior; uma compra de mesmo nome em outro cartão é outra compra.
 */
export function installmentsToRelink(
  transactions: Transaction[],
  edited: Transaction,
  newCardId: string | null,
): Transaction[] {
  if (!isInstallmentTransaction(edited)) return [];
  const previousCardId = edited.cardId ?? null;

  return transactions.filter((t) => {
    if (t.id === edited.id || t.name !== edited.name || t.monthKey <= edited.monthKey) return false;
    if (!isInstallmentTransaction(t)) return false;
    const cardId = t.cardId ?? null;
    return cardId !== newCardId && (cardId === null || cardId === previousCardId);
  });
}

// ─── Parcelas na edição ──────────────────────────────────────────────────────

/** Número de parcelas digitado ("6" ou "6x"), e não a marcação "x/y" de uma parcela já gravada */
const INSTALLMENT_COUNT = /^(\d+)\s*x?$/i;

/**
 * Quantas parcelas criar a partir do campo de parcelas da edição. Só um número ("6") cria
 * parcelas, dividindo o valor como no cadastro. Uma parcela já gravada ("2/6", ou a data em
 * que a planilha às vezes a transforma) conta como 1: os outros meses dela já existem, e
 * recriá-los duplicaria as parcelas.
 */
export function newInstallmentCount(value: string | null | undefined): number {
  const match = (value ?? '').trim().match(INSTALLMENT_COUNT);
  return match ? Math.max(1, parseInt(match[1], 10)) : 1;
}

/** Marcação de uma parcela já gravada ("2/6"), mantida como está ao salvar a edição */
function existingInstallmentLabel(value: string): string | undefined {
  const label = value.trim();
  return label && !INSTALLMENT_COUNT.test(label) ? label : undefined;
}

/**
 * Sub-transações da edição distribuídas pelos meses, a partir do mês editado (índice 0).
 * Sub com número de parcelas: o valor digitado é o total da compra, dividido como no
 * cadastro (599,90 em 6 → 100,00 neste mês e 99,98 nos seguintes). Sub que já era uma
 * parcela: o valor já é o da parcela, e ela fica só no mês editado.
 */
export function spreadSubTransactions(
  subs: { name: string; amount: number; installments: string }[],
): SubTransaction[][] {
  const months: SubTransaction[][] = [];
  for (const sub of subs) {
    const count = newInstallmentCount(sub.installments);
    if (count === 1) {
      (months[0] ??= []).push({ name: sub.name, amount: sub.amount, installments: existingInstallmentLabel(sub.installments) });
      continue;
    }
    const { first, rest } = splitInstallments(sub.amount, count);
    for (let i = 0; i < count; i++) {
      (months[i] ??= []).push({ name: sub.name, amount: i === 0 ? first : rest, installments: `${i + 1}/${count}` });
    }
  }
  return months;
}
