import { transactionToRow, incomeToRow } from '@/lib/parsers';
import type { Income, SubTransaction, Transaction } from '@/lib/types';

type SheetRow = (string | number | null)[];

/**
 * ID para uma linha nova da planilha. Só o timestamp colidia quando vários
 * lançamentos eram criados no mesmo milissegundo (ex: parcelas), e editar ou
 * excluir um deles acertava a linha errada.
 */
export function newRowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Categoria gravada na linha de uma sub-transação: a dela, quando escolhida, ou a da
 * transação. A leitura (GET /api/transacoes) devolve a categoria só quando difere da
 * transação, então mudar a categoria da transação leva junto as subs sem categoria própria.
 */
export function subTransactionCategory(
  parent: Pick<Transaction, 'category' | 'subcategory'>,
  sub: Pick<SubTransaction, 'category' | 'subcategory'>,
): Pick<Transaction, 'category' | 'subcategory'> {
  return sub.category
    ? { category: sub.category, subcategory: sub.subcategory ?? null }
    : { category: parent.category, subcategory: parent.subcategory ?? null };
}

/** Transação + sub-transações (linhas filhas com parentId) prontas para a planilha */
export function buildTransactionRows(body: Omit<Transaction, 'id'>): { transaction: Transaction; rows: SheetRow[] } {
  const id = newRowId('t');
  const transaction: Transaction = { ...body, id, parentId: null };
  const rows = [transactionToRow(transaction)];

  body.subTransactions?.forEach((sub, idx) => {
    rows.push(transactionToRow({
      ...transaction,
      id: `${id}-sub-${idx}`,
      name: sub.name,
      amount: sub.amount,
      ...subTransactionCategory(transaction, sub),
      parentId: id,
      installments: sub.installments ?? null,
      subTransactions: null,
    }));
  });

  return { transaction, rows };
}

/** Receita + sub-receitas (linhas filhas com parentId) prontas para a planilha */
export function buildIncomeRows(body: Omit<Income, 'id'>): { income: Income; rows: SheetRow[] } {
  const id = newRowId('r');
  const income: Income = { ...body, id, parentId: null };
  const rows = [incomeToRow(income)];

  body.subTransactions?.forEach((sub, idx) => {
    rows.push(incomeToRow({
      ...income,
      id: `${id}-sub-${idx}`,
      name: sub.name,
      amount: sub.amount,
      parentId: id,
      installments: sub.installments ?? null,
      subTransactions: null,
    }));
  });

  return { income, rows };
}
