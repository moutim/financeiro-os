import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToTransaction, transactionToRow } from '@/lib/parsers';
import { updateUserRowById } from '@/lib/user-sheets-helpers';

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
    
    // Pattern to find dates in either the name or the installments column
    const datePattern = /(?:2025|2026)-(\d{2})-(\d{2})(?: 00:00:00)?/;
    
    let count = 0;
    const fixedItems: string[] = [];

    for (const tx of transactions) {
      let needsUpdate = false;
      let total = 0;
      let current = 0;

      // Check installments column first
      if (tx.installments && tx.installments.match(datePattern)) {
        const match = tx.installments.match(datePattern);
        if (match) {
          total = parseInt(match[1], 10);
          current = parseInt(match[2], 10);
          tx.installments = `${current}/${total}`;
          needsUpdate = true;
        }
      } 
      // Check name column
      else if (tx.name.match(datePattern)) {
        const match = tx.name.match(datePattern);
        if (match) {
          total = parseInt(match[1], 10);
          current = parseInt(match[2], 10);
          tx.name = tx.name.replace(/\(?(?:2025|2026)-\d{2}-\d{2}(?: 00:00:00)?\)?/, '').trim();
          tx.installments = `${current}/${total}`;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        tx.amount = Math.abs(tx.amount); // Fix possible negatives

        await updateUserRowById(
          session.accessToken, 
          session.spreadsheetId, 
          SHEET_TABS.TRANSACOES, 
          tx.id, 
          transactionToRow(tx)
        );
        count++;
        fixedItems.push(`${tx.monthKey}: ${tx.name} -> ${tx.installments}`);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `${count} transações corrigidas no banco!`,
      fixedItems 
    });
  } catch (err) {
    console.error('[GET /api/fix]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
