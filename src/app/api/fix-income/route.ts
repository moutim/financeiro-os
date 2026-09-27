import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToIncome, incomeToRow } from '@/lib/parsers';
import { updateUserRowById } from '@/lib/user-sheets-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sheets = getUserSheetsClient(session.accessToken);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: session.spreadsheetId,
      range: `${SHEET_TABS.RECEITAS}!A2:Z`,
    });

    const rows = (res.data.values ?? []) as string[][];
    const incomes = rows.filter(r => r[0]).map(rowToIncome);
    
    // Auto-fix: Mover de 2025-01 para 2025-02
    let count = 0;
    for (const inc of incomes) {
      if (inc.monthKey === '2025-01') {
        inc.monthKey = '2025-02';
        // Se for o Salário Itaú e tiver vindo da planilha original, é só isso.
        await updateUserRowById(
          session.accessToken, 
          session.spreadsheetId, 
          SHEET_TABS.RECEITAS, 
          inc.id, 
          incomeToRow(inc)
        );
        count++;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `${count} receitas movidas de volta para Fevereiro (2025-02)!`,
      incomes 
    });
  } catch (err) {
    console.error('[GET /api/fix-income]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
