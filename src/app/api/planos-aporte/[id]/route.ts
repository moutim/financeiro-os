import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { planToRow } from '@/lib/parsers';
import { updateUserRowById } from '@/lib/user-sheets-helpers';
import { resolvePlanSheet } from '@/lib/planSheet';
import type { ContributionPlan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { ownerSpreadsheetId, ...body } = await req.json() as ContributionPlan & { ownerSpreadsheetId?: string | null };
    if (!body.goalId || !body.person?.trim() || !body.fromMonth || !(body.amount > 0)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }
    const plan: ContributionPlan = { ...body, id };
    const spreadsheetId = await resolvePlanSheet(session.accessToken, session.spreadsheetId, plan.goalId, ownerSpreadsheetId);
    await updateUserRowById(session.accessToken, spreadsheetId, SHEET_TABS.PLANOS_APORTE, id, planToRow(plan));
    return NextResponse.json(plan);
  } catch (err) {
    console.error('[PUT /api/planos-aporte/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
