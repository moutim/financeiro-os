import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { newRowId } from '@/lib/sheetRows';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { transactionToRow } from '@/lib/parsers';
import { GUEST_CONTRIBUTION_ID_PREFIX } from '@/lib/sharedContributions';
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

    // ParentId SHARED + prefixo do ID: o app do dono separa a cópia dos gastos pessoais dele (isGuestContribution)
    const sharedTx: Transaction = {
      ...transaction,
      parentId: 'SHARED',
      id: newRowId(GUEST_CONTRIBUTION_ID_PREFIX),
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
