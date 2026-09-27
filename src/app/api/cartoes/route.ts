import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToCard, cardToRow } from '@/lib/parsers';
import { readUserTab, appendUserRow } from '@/lib/user-sheets-helpers';
import type { CreditCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.CARTOES);
    const cards = rows.filter(r => r[0]).map(rowToCard);
    return NextResponse.json(cards);
  } catch (err) {
    console.error('[GET /api/cartoes]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Omit<CreditCard, 'id'>;
    const id = `card-${Date.now()}`;
    const card: CreditCard = { ...body, id };
    await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.CARTOES, cardToRow(card));
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error('[POST /api/cartoes]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
