import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { goalToRow } from '@/lib/parsers';
import { appendUserRow } from '@/lib/user-sheets-helpers';
import type { SavingsGoal } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shareCode } = await req.json();

    if (!shareCode) {
      return NextResponse.json({ error: 'Missing share code' }, { status: 400 });
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(shareCode, 'base64').toString('utf-8'));
    } catch (e) {
      return NextResponse.json({ error: 'Invalid share code format' }, { status: 400 });
    }

    const { ownerSpreadsheetId, goalId, goalName } = payload;
    if (!ownerSpreadsheetId || !goalId || !goalName) {
       return NextResponse.json({ error: 'Invalid share code payload' }, { status: 400 });
    }

    // Create a local reference to this shared goal
    const sharedGoal: SavingsGoal = {
      id: goalId,
      name: `(Compartilhado) ${goalName}`,
      current: 0, // This will just be a proxy, actual value is fetched or synced later if needed
      target: 0,
      monthlyPrediction: 0,
      isShared: true,
      ownerSpreadsheetId
    };

    await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, goalToRow(sharedGoal));

    return NextResponse.json(sharedGoal, { status: 201 });
  } catch (err) {
    console.error('[POST /api/metas/accept]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
