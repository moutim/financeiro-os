import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { newRowId } from '@/lib/sheetRows';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToPlan, planToRow, rowToGoal } from '@/lib/parsers';
import { resolvePlanSheet } from '@/lib/planSheet';
import { readUserTab, appendUserRow, deleteUserRowById, syncUserSheetStructure } from '@/lib/user-sheets-helpers';
import type { ContributionPlan } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Planilha criada antes da aba PlanosAporte existir (o sync-headers ainda não rodou) */
const isMissingTab = (err: unknown) => err instanceof Error && err.message.includes('Unable to parse range');

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const readPlans = async (spreadsheetId: string) => {
      try {
        return (await readUserTab(session.accessToken, spreadsheetId, SHEET_TABS.PLANOS_APORTE)).filter(r => r[0] && r[1]).map(rowToPlan);
      } catch (err) {
        if (isMissingTab(err)) return [];
        throw err;
      }
    };

    const mine = await readPlans(session.spreadsheetId);

    // Metas de outra conta: o plano mora na planilha do dono
    const goals = (await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS)).filter(r => r[0]).map(rowToGoal);
    const shared = goals.filter(g => g.isShared && g.ownerSpreadsheetId && g.ownerSpreadsheetId !== session.spreadsheetId);
    const owners = [...new Set(shared.map(g => g.ownerSpreadsheetId as string))];
    const fromOwners: ContributionPlan[] = [];
    for (const owner of owners) {
      try {
        const sharedIds = new Set(shared.filter(g => g.ownerSpreadsheetId === owner).map(g => g.id));
        fromOwners.push(...(await readPlans(owner)).filter(p => sharedIds.has(p.goalId)));
      } catch (e) {
        console.error('[GET /api/planos-aporte] sem acesso ao plano de uma meta compartilhada', e);
      }
    }
    return NextResponse.json([...mine, ...fromOwners]);
  } catch (err) {
    console.error('[GET /api/planos-aporte]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ownerSpreadsheetId, ...body } = await req.json() as Omit<ContributionPlan, 'id'> & { ownerSpreadsheetId?: string | null };
    if (!body.goalId || !body.person?.trim() || !body.fromMonth || !(body.amount > 0)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }
    const plan: ContributionPlan = { ...body, person: body.person.trim(), id: newRowId('plan') };
    const spreadsheetId = await resolvePlanSheet(session.accessToken, session.spreadsheetId, plan.goalId, ownerSpreadsheetId);

    try {
      await appendUserRow(session.accessToken, spreadsheetId, SHEET_TABS.PLANOS_APORTE, planToRow(plan));
    } catch (err) {
      if (!isMissingTab(err)) throw err;
      await syncUserSheetStructure(session.accessToken, spreadsheetId);
      await appendUserRow(session.accessToken, spreadsheetId, SHEET_TABS.PLANOS_APORTE, planToRow(plan));
    }
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error('[POST /api/planos-aporte]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const goalId = url.searchParams.get('goalId');
    if (!id || !goalId) return NextResponse.json({ error: 'Plano não informado' }, { status: 400 });
    const spreadsheetId = await resolvePlanSheet(session.accessToken, session.spreadsheetId, goalId, url.searchParams.get('ownerSpreadsheetId'));
    await deleteUserRowById(session.accessToken, spreadsheetId, SHEET_TABS.PLANOS_APORTE, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/planos-aporte]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
