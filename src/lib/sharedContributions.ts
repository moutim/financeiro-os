import type { Transaction } from '@/lib/types';

/** Prefixo do ID das cópias que a rota /api/transacoes/shared grava na planilha do dono da meta */
export const GUEST_CONTRIBUTION_ID_PREFIX = 't-shared';

/**
 * Cópia de um aporte que um convidado fez numa meta compartilhada deste usuário. O dinheiro é
 * do convidado: entra no saldo e no histórico da meta, nunca nos gastos pessoais do dono.
 * O prefixo do ID reconhece também as cópias que perderam o ParentId "SHARED" ao serem
 * editadas pela lista de transações (o PUT grava ParentId vazio).
 */
export function isGuestContribution(t: Pick<Transaction, 'id' | 'parentId'>): boolean {
  return t.parentId === 'SHARED' || t.id.startsWith(`${GUEST_CONTRIBUTION_ID_PREFIX}-`);
}
