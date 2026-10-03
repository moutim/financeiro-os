import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { newRowId } from '@/lib/sheetRows';
import { getUserSheetsClient, isNoAccessError } from '@/lib/user-sheets';
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
      id: newRowId('t-shared'),
      author: session.user?.name || session.user?.email || null,
    };

    const sheets = getUserSheetsClient(session.accessToken);
    await sheets.spreadsheets.values.append({
      spreadsheetId: ownerSpreadsheetId,
      range: `${SHEET_TABS.TRANSACOES}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [transactionToRow(sharedTx)] },
    });

    return NextResponse.json(sharedTx, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transacoes/shared]', err);
    // needsAccess: o app ainda não pode abrir a planilha do dono por esta conta (ver src/lib/googlePicker.ts)
    if (isNoAccessError(err)) {
      return NextResponse.json({ error: 'Sem acesso à planilha do dono da meta.', needsAccess: true }, { status: 403 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
