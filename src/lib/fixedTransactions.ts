import type { Transaction } from '@/lib/types';
import { migrateTransactionCategory } from '@/lib/detailedCategories';
import { parseInstallmentInput } from '@/lib/currency';

/**
 * "Fixo" é uma marcação da transação (coluna Recorrencia = "Fixo"), e não uma categoria:
 * uma conta de casa ou uma assinatura são fixas e continuam na sua própria categoria.
 *
 * Planilhas antigas têm a categoria "Fixos": essas linhas contam como fixas e são
 * exibidas com a categoria real inferida pelo nome (ver taxonomy.ts).
 */
export const LEGACY_FIXED_CATEGORY = 'Fixos';

export function isFixedTransaction(t: Pick<Transaction, 'category' | 'recurrency'>): boolean {
  return t.recurrency === 'Fixo' || t.category === LEGACY_FIXED_CATEGORY;
}

/**
 * Parcelas já se repetem nos meses seguintes, então não combinam com a marcação de fixo
 * (o Iniciar Mês copiaria a parcela como se fosse uma conta nova).
 */
export function hasRepeatingInstallments(
  installments: string | null | undefined,
  subTransactions: { installments?: string | null }[] = [],
): boolean {
  const repeats = (value?: string | null) => (parseInstallmentInput(value ?? '')?.total ?? 1) > 1;
  return repeats(installments) || subTransactions.some((s) => repeats(s.installments));
}

/**
 * Cópia de uma transação fixa para outro mês (Iniciar Mês e meses criados por parcelas).
 * Uma linha da categoria legada "Fixos" é gravada já com a categoria real equivalente.
 */
export function copyFixedToMonth(t: Transaction, monthKey: string, amount = t.amount): Omit<Transaction, 'id'> {
  const legacy = t.category === LEGACY_FIXED_CATEGORY
    ? migrateTransactionCategory(t.category, t.subcategory, t.name)
    : null;

  return {
    name: t.name,
    amount,
    category: legacy ? legacy.macro : t.category,
    subcategory: legacy ? legacy.micro : t.subcategory ?? null,
    transactionType: t.transactionType ?? legacy?.transactionType,
    nature: t.nature ?? null,
    recurrency: 'Fixo',
    paymentMethod: t.paymentMethod ?? null,
    cardId: t.cardId ?? null,
    monthKey,
    isPaid: false,
  };
}
