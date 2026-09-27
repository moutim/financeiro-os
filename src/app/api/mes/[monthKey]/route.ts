import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { deleteUserRowsByIds, readUserTab } from '@/lib/user-sheets-helpers';
import { rowToTransaction, rowToIncome } from '@/lib/parsers';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ monthKey: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { monthKey } = await params;
    const body = await req.json();
    const { transactionIds, incomeIds } = body as { transactionIds: string[], incomeIds: string[] };

    if (transactionIds?.length > 0) {
      const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES);
      const allTxs = rows.map(rowToTransaction);
      const subsToDelete = allTxs.filter(t => t.parentId && transactionIds.includes(t.parentId)).map(t => t.id);
      const allIds = [...transactionIds, ...subsToDelete];
      await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, allIds);
    }

    if (incomeIds?.length > 0) {
      const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS);
      const allIncomes = rows.map(rowToIncome);
      const subsToDelete = allIncomes.filter(i => i.parentId && incomeIds.includes(i.parentId)).map(i => i.id);
      const allIds = [...incomeIds, ...subsToDelete];
      await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, allIds);
    }

    return NextResponse.json({
      ok: true,
      monthKey,
      deletedTransactions: transactionIds?.length ?? 0,
      deletedIncomes: incomeIds?.length ?? 0,
    });
  } catch (err) {
    console.error('[DELETE /api/mes/[monthKey]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
