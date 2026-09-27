import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { transactionToRow } from '@/lib/parsers';
import type { Transaction } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ownerSpreadsheetId, transaction } = body;

    if (!ownerSpreadsheetId || !transaction) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Force parentId to SHARED so it doesn't mess up the owner's balance
    const sharedTx: Transaction = {
      ...transaction,
      parentId: 'SHARED',
      id: `t-shared-${Date.now()}`
    };

    const sheets = getUserSheetsClient(session.accessToken);
    await sheets.spreadsheets.values.append({
      spreadsheetId: ownerSpreadsheetId,
      range: `${SHEET_TABS.TRANSACOES}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [transactionToRow(sharedTx)] },
    });

    return NextResponse.json(sharedTx, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transacoes/shared]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
