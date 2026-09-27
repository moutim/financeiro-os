import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToTransaction, transactionToRow } from '@/lib/parsers';
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
    
    const macros = allTxs.filter(t => !t.parentId);
    const subs = allTxs.filter(t => t.parentId);
    
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
    const id = `t-${Date.now()}`;
    const transaction: Transaction = { ...body, id, parentId: null };

    const rowsToAppend = [transactionToRow(transaction)];
    
    if (body.subTransactions && body.subTransactions.length > 0) {
      body.subTransactions.forEach((sub, idx) => {
        const subTx: Transaction = {
          ...transaction,
          id: `${id}-sub-${idx}`,
          name: sub.name,
          amount: sub.amount,
          parentId: id,
          installments: sub.installments ?? null,
          subTransactions: null
        };
        rowsToAppend.push(transactionToRow(subTx));
      });
    }

    const sheets = getUserSheetsClient(session.accessToken);
    await sheets.spreadsheets.values.append({
      spreadsheetId: session.spreadsheetId,
      range: `${SHEET_TABS.TRANSACOES}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rowsToAppend },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transacoes]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
