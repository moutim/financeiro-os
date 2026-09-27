import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToGoal, goalToRow } from '@/lib/parsers';
import { readUserTab, appendUserRow, updateUserRowById, deleteUserRowById } from '@/lib/user-sheets-helpers';
import type { SavingsGoal } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS);
    const goals = rows.filter(r => r[0]).map(rowToGoal);

    // Sync shared goals with their owners
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      if (g.isShared && g.ownerSpreadsheetId && g.ownerSpreadsheetId !== session.spreadsheetId) {
        try {
          const ownerRows = await readUserTab(session.accessToken, g.ownerSpreadsheetId, SHEET_TABS.METAS);
          const ownerGoals = ownerRows.filter(r => r[0]).map(rowToGoal);
          const ownerGoal = ownerGoals.find(og => og.id === g.id);
          
          if (ownerGoal) {
            // Fetch owner's transactions to calculate the real current amount
            const ownerTxsRes = await readUserTab(session.accessToken, g.ownerSpreadsheetId, SHEET_TABS.TRANSACOES);
            const ownerTxs = ownerTxsRes.filter(r => r[0]).map(r => ({ goalId: r[7] || null, amount: parseFloat(r[2] || '0') / 100 }));
            const linkedSum = ownerTxs.filter(t => t.goalId === g.id).reduce((sum, t) => sum + t.amount, 0);

            goals[i].current = ownerGoal.current + linkedSum;
            goals[i].target = ownerGoal.target;
            goals[i].name = ownerGoal.name; // Keep name in sync too
          } else {
            // The owner deleted this goal! We should auto-delete it from our local sheet.
            await deleteUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, g.id);
            goals[i] = null as any; // Mark for removal
          }
        } catch (e) {
          console.error(`Failed to sync shared goal ${g.id} from owner ${g.ownerSpreadsheetId}`, e);
        }
      }
    }

    const validGoals = goals.filter(g => g !== null);
    return NextResponse.json(validGoals);
  } catch (err) {
    console.error('[GET /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID da meta é obrigatório' }, { status: 400 });

    // We always delete from the current user's spreadsheet.
    // If the user is the owner, it removes the goal for them (and guests will auto-remove on next fetch).
    // If the user is a guest, it removes their local link to the goal (they "leave" the goal).
    await deleteUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, id);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/metas]', err);
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
    
    // Determine which spreadsheet to update
    const targetSpreadsheetId = (body.isShared && body.ownerSpreadsheetId) 
      ? body.ownerSpreadsheetId 
      : session.spreadsheetId;

    await updateUserRowById(session.accessToken, targetSpreadsheetId, SHEET_TABS.METAS, body.id, goalToRow(body));
    
    return NextResponse.json(body);
  } catch (err) {
    console.error('[PUT /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
