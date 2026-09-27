import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { pendingToRow } from '@/lib/parsers';
import { deleteUserRowById, updateUserRowById } from '@/lib/user-sheets-helpers';
import type { Pending } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json() as Pending;
    await updateUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.PENDENCIAS, id, pendingToRow(body));
    return NextResponse.json(body);
  } catch (err) {
    console.error('[PUT /api/pendencias/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await deleteUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.PENDENCIAS, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/pendencias/[id]]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
