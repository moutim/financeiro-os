import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToTransaction } from '@/lib/parsers';

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
    const transactions = rows.filter(r => r[0]).map(rowToTransaction);
    
    const nubank = transactions.filter(t => t.name.toLowerCase().includes('nubank'));

    return NextResponse.json({ nubank });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
