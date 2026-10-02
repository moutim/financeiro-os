import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToIncome } from '@/lib/parsers';
import { readUserTab, appendUserRows } from '@/lib/user-sheets-helpers';
import { buildIncomeRows } from '@/lib/sheetRows';
import type { Income } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS);
    const allIncomes = rows.filter(r => r[0]).map(rowToIncome);
    
    const macros = allIncomes.filter(i => !i.parentId);
    const subs = allIncomes.filter(i => i.parentId);
    
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
    console.error('[GET /api/receitas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Omit<Income, 'id'>;
    const { income, rows } = buildIncomeRows(body);
    await appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, rows);
    
    return NextResponse.json(income, { status: 201 });
  } catch (err) {
    console.error('[POST /api/receitas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
