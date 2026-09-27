import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToGoal, goalToRow } from '@/lib/parsers';
import { readUserTab, appendUserRow, updateUserRowById } from '@/lib/user-sheets-helpers';
import type { SavingsGoal } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS);
    const goals = rows.filter(r => r[0]).map(rowToGoal);
    return NextResponse.json(goals);
  } catch (err) {
    console.error('[GET /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as SavingsGoal;
    await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, goalToRow(body));
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    console.error('[POST /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as SavingsGoal;
    await updateUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, body.id, goalToRow(body));
    return NextResponse.json(body);
  } catch (err) {
    console.error('[PUT /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
