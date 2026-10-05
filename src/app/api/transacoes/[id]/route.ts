import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { transactionToRow, rowToTransaction } from '@/lib/parsers';
import { readUserTab, deleteUserRowsByIds, updateUserRowById, appendUserRows } from '@/lib/user-sheets-helpers';
import { subTransactionCategory } from '@/lib/sheetRows';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES);
    const allTxs = rows.map(rowToTransaction);
    const subsToDelete = allTxs.filter(t => t.parentId === id).map(t => t.id);
    
    const idsToDelete = [id, ...subsToDelete];
    await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, idsToDelete);
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/transacoes/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json() as import('@/lib/types').Transaction;
    
    // Update macro row
    const macroRow = transactionToRow({ ...body, parentId: null });
    await updateUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, id, macroRow);

    // Sync sub-transactions
    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES);
    const allTxs = rows.map(rowToTransaction);
    const existingSubs = allTxs.filter(t => t.parentId === id).map(t => t.id);
    
    if (existingSubs.length > 0) {
      await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, existingSubs);
    }
    
    if (body.subTransactions && body.subTransactions.length > 0) {
      const newSubs = body.subTransactions.map((sub, idx) => {
        const subTx: import('@/lib/types').Transaction = {
          ...body,
          id: `${id}-sub-${Date.now()}-${idx}`,
          name: sub.name,
          amount: sub.amount,
          ...subTransactionCategory(body, sub),
          parentId: id,
          installments: sub.installments ?? null,
          subTransactions: null
        };
        return transactionToRow(subTx);
      });
      await appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, newSubs);
    }

    return NextResponse.json(body);
  } catch (err) {
    console.error('[PUT /api/transacoes/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
