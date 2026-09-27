import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { deleteUserRowsByIds } from '@/lib/user-sheets-helpers';
import { rowToTransaction, transactionToRow, rowToIncome, incomeToRow } from '@/lib/parsers';
import type { Transaction, Income } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/import-batch
 * Body: { transactions: Transaction[], incomes: Income[] }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as {
      transactions?: Omit<Transaction, 'id'>[];
      incomes?: Omit<Income, 'id'>[];
    };

    const sheets = getUserSheetsClient(session.accessToken);
    const results = { transactions: 0, incomes: 0 };

    if (body.transactions?.length) {
      const rows = body.transactions.map((t, i) => {
        const tx: Transaction = { ...t, id: `t-batch-${Date.now()}-${i}` };
        return transactionToRow(tx);
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: session.spreadsheetId,
        range: `${SHEET_TABS.TRANSACOES}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      results.transactions = rows.length;
    }

    if (body.incomes?.length) {
      const rows = body.incomes.map((r, i) => {
        const income: Income = { ...r, id: `r-batch-${Date.now()}-${i}` };
        return incomeToRow(income);
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: session.spreadsheetId,
        range: `${SHEET_TABS.RECEITAS}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      results.incomes = rows.length;
    }

    return NextResponse.json({
      ok: true,
      inserted: results,
      message: `✅ ${results.transactions} transações e ${results.incomes} receitas inseridas.`,
    });
  } catch (err) {
    console.error('[POST /api/import-batch]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/import-batch?month=YYYY-MM
 */

/**
 * DELETE /api/import-batch?month=YYYY-MM
 * Deleta todas as transações e receitas de um mês em um único batchUpdate por aba.
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    if (!month) return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });

    const sheets = getUserSheetsClient(session.accessToken);

    // Busca todas as linhas das duas abas
    const [txRes, incRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: session.spreadsheetId, range: `${SHEET_TABS.TRANSACOES}!A2:Z` }),
      sheets.spreadsheets.values.get({ spreadsheetId: session.spreadsheetId, range: `${SHEET_TABS.RECEITAS}!A2:Z` }),
    ]);

    const txRows  = (txRes.data.values  ?? []) as string[][];
    const incRows = (incRes.data.values ?? []) as string[][];

    // Filtra IDs do mês alvo (coluna E = índice 4 para transações, D = índice 3 para receitas)
    const txIds  = txRows.filter(r  => r[4] === month).map(r => r[0]);
    const incIds = incRows.filter(r => r[3] === month).map(r => r[0]);

    // Deleta tudo em batch (sem race condition de índice)
    await Promise.all([
      txIds.length  ? deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, txIds)  : Promise.resolve(),
      incIds.length ? deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS,   incIds) : Promise.resolve(),
    ]);

    return NextResponse.json({
      ok: true,
      deleted: { transactions: txIds.length, incomes: incIds.length },
      message: `✅ ${txIds.length} transações e ${incIds.length} receitas de ${month} deletadas.`,
    });
  } catch (err) {
    console.error('[DELETE /api/import-batch]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
