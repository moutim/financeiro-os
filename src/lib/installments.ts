import type { Transaction } from '@/lib/types';
import { addMonths, parseInstallmentInput, toCanonicalMonthKey } from '@/lib/currency';

export interface InstallmentSlot {
  /** Número da parcela (1…total) */
  number: number;
  total: number;
  monthKey: string;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Parcelas de uma compra a partir da que foi informada no lançamento (ex: "3/6" em
 * outubro): ela fica no próprio mês, as seguintes vão para os meses à frente e as
 * anteriores para os meses de trás (na última, "6/6", todas vão para trás).
 *
 * `missing` traz só as que ainda não existem: uma parcela já lançada (mesmo nome,
 * mesmo cartão, mesmo número, no mês certo) nunca é criada de novo.
 */
export function planInstallments(
  parsed: { current: number; total: number },
  baseMonth: string,
  purchase: Pick<Transaction, 'name' | 'cardId'>,
  existing: Transaction[],
): { current: InstallmentSlot; missing: InstallmentSlot[] } {
  const base = toCanonicalMonthKey(baseMonth);
  const slots: InstallmentSlot[] = Array.from({ length: parsed.total }, (_, i) => ({
    number: i + 1,
    total: parsed.total,
    monthKey: addMonths(base, i + 1 - parsed.current),
  }));

  const name = normalizeName(purchase.name);
  const alreadyExists = (slot: InstallmentSlot) => existing.some((t) => {
    if (normalizeName(t.name) !== name || (t.cardId || null) !== (purchase.cardId || null)) return false;
    if (toCanonicalMonthKey(t.monthKey) !== slot.monthKey) return false;
    const p = parseInstallmentInput(t.installments ?? '');
    return !!p && p.current === slot.number && p.total === slot.total;
  });

  return {
    current: slots[parsed.current - 1],
    missing: slots.filter((slot) => slot.number !== parsed.current && !alreadyExists(slot)),
  };
}

/** Mesmas parcelas ("6/6", "6-6" e "6 de 6" são iguais; vazio é igual a vazio) */
export function sameInstallments(a: string | null | undefined, b: string | null | undefined): boolean {
  const pa = parseInstallmentInput(a ?? '');
  const pb = parseInstallmentInput(b ?? '');
  if (!pa || !pb) return (a ?? '').trim() === (b ?? '').trim();
  return pa.current === pb.current && pa.total === pb.total;
}

/**
 * Divide o valor total da compra entre as parcelas; a 1ª leva os centavos que sobram
 * (ex: R$ 100,00 em 3x = 33,34 + 33,33 + 33,33).
 */
export function installmentAmount(totalAmount: number, total: number, number: number): number {
  const perInstallment = Math.floor((totalAmount / total) * 100) / 100;
  if (number !== 1) return perInstallment;
  return Math.round((perInstallment + totalAmount - perInstallment * total) * 100) / 100;
}
