import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToTransaction } from '@/lib/parsers';
import { appendUserRows } from '@/lib/user-sheets-helpers';
import { buildTransactionRows } from '@/lib/sheetRows';
import type { Transaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sheets = getUserSheetsClient(session.accessToken);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: session.spreadsheetId,
      range: `${SHEET_TABS.TRANSACOES}!A2:Z`,
    });

    const rows = (res.data.values ?? []) as string[][];
    const allTxs = rows.filter(r => r[0]).map(rowToTransaction);
    
    const macros = allTxs.filter(t => !t.parentId || t.parentId === 'SHARED');
    const subs = allTxs.filter(t => t.parentId && t.parentId !== 'SHARED');
    
    macros.forEach(macro => {
      const children = subs.filter(sub => sub.parentId === macro.id);
      if (children.length > 0) {
        macro.subTransactions = children.map(c => ({
          id: c.id,
          name: c.name,
          amount: c.amount,
          installments: c.installments
        }));
      }
    });

    return NextResponse.json(macros);
  } catch (err) {
    console.error('[GET /api/transacoes]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Omit<Transaction, 'id'>;
    const { transaction, rows } = buildTransactionRows(body);
    await appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES, rows);

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transacoes]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
