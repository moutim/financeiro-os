import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToPending, pendingToRow } from '@/lib/parsers';
import { readUserTab, appendUserRow } from '@/lib/user-sheets-helpers';
import type { Pending } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.PENDENCIAS);
    const pending = rows.filter(r => r[0]).map(rowToPending);
    return NextResponse.json(pending);
  } catch (err) {
    console.error('[GET /api/pendencias]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Omit<Pending, 'id'>;
    const id = `pend-${Date.now()}`;
    const pending: Pending = { ...body, id };
    await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.PENDENCIAS, pendingToRow(pending));
    return NextResponse.json(pending, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pendencias]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
