import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToIncome, incomeToRow } from '@/lib/parsers';
import { readUserTab, appendUserRow } from '@/lib/user-sheets-helpers';
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
    const id = `r-${Date.now()}`;
    const income: Income = { ...body, id, parentId: null };
    
    const rowsToAppend = [incomeToRow(income)];
    
    if (body.subTransactions && body.subTransactions.length > 0) {
      body.subTransactions.forEach((sub, idx) => {
        const subTx: Income = {
          ...income,
          id: `${id}-sub-${idx}`,
          name: sub.name,
          amount: sub.amount,
          parentId: id,
          installments: sub.installments ?? null,
          subTransactions: null
        };
        rowsToAppend.push(incomeToRow(subTx));
      });
    }
    
    // Fallback to appendUserRow for a single, or create appendUserRows if missing in imports... wait, appendUserRows is in user-sheets-helpers! I'll just change the import.
    // wait, I need to add appendUserRows to import
    await import('@/lib/user-sheets-helpers').then(m => 
      m.appendUserRows(session.accessToken, session.spreadsheetId, SHEET_TABS.RECEITAS, rowsToAppend)
    );
    
    return NextResponse.json(income, { status: 201 });
  } catch (err) {
    console.error('[POST /api/receitas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
