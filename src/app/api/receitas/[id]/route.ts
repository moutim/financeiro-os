import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { incomeToRow, rowToIncome } from '@/lib/parsers';
import { readUserTab, deleteUserRowsByIds, updateUserRowById, appendUserRows } from '@/lib/user-sheets-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS);
    const allIncomes = rows.map(rowToIncome);
    const subsToDelete = allIncomes.filter(i => i.parentId === id).map(i => i.id);
    
    const idsToDelete = [id, ...subsToDelete];
    await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, idsToDelete);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/receitas/[id]]', err);
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
    const body = await req.json() as import('@/lib/types').Income;
    
    // Update macro row
    const macroRow = incomeToRow({ ...body, parentId: null });
    await updateUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, id, macroRow);

    // Sync sub-transactions
    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS);
    const allIncomes = rows.map(rowToIncome);
    const existingSubs = allIncomes.filter(i => i.parentId === id).map(i => i.id);
    
    if (existingSubs.length > 0) {
      await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, existingSubs);
    }
    
    if (body.subTransactions && body.subTransactions.length > 0) {
      const newSubs = body.subTransactions.map((sub, idx) => {
        const subTx: import('@/lib/types').Income = {
          ...body,
          id: `${id}-sub-${Date.now()}-${idx}`,
          name: sub.name,
          amount: sub.amount,
          parentId: id,
          installments: sub.installments ?? null,
          subTransactions: null
        };
        return incomeToRow(subTx);
      });
      await appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, newSubs);
    }

    return NextResponse.json(body);
  } catch (err) {
    console.error('[PUT /api/receitas/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
