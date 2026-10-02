import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { appendUserRows } from '@/lib/user-sheets-helpers';
import { buildIncomeRows, buildTransactionRows } from '@/lib/sheetRows';
import type { Income, Transaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transacoes/batch
 * Body: { transactions?: Omit<Transaction, 'id'>[], incomes?: Omit<Income, 'id'>[] }
 *
 * Grava vários lançamentos de uma vez (ex: parcelas + cópias de fixos e receitas
 * para os meses seguintes) com um único append por aba. Appends paralelos na
 * mesma aba podiam cair na mesma linha, e um sobrescrevia o outro.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as {
      transactions?: Omit<Transaction, 'id'>[];
      incomes?: Omit<Income, 'id'>[];
    };
    const builtTransactions = (body.transactions ?? []).map((t) => buildTransactionRows(t));
    const builtIncomes = (body.incomes ?? []).map((i) => buildIncomeRows(i));

    // uma aba de cada vez: nunca dois appends simultâneos na planilha
    await appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, builtTransactions.flatMap((b) => b.rows));
    await appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, builtIncomes.flatMap((b) => b.rows));

    return NextResponse.json({
      transactions: builtTransactions.map((b) => b.transaction),
      incomes: builtIncomes.map((b) => b.income),
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transacoes/batch]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
