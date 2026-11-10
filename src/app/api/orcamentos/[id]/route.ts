import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { budgetToRow } from '@/lib/parsers';
import { updateUserRowById } from '@/lib/user-sheets-helpers';
import type { CategoryBudget } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json() as CategoryBudget;
    const budget: CategoryBudget = { ...body, id };
    await updateUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.ORCAMENTOS, id, budgetToRow(budget));
    return NextResponse.json(budget);
  } catch (err) {
    console.error('[PUT /api/orcamentos/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
