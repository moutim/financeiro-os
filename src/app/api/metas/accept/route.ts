import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { goalToRow, rowToGoal } from '@/lib/parsers';
import { appendUserRow, readUserTab } from '@/lib/user-sheets-helpers';
import { isNoAccessError } from '@/lib/user-sheets';
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

    if (ownerSpreadsheetId === session.spreadsheetId) {
      return NextResponse.json({ error: 'Esta meta já é sua' }, { status: 400 });
    }

    const localRows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS);
    if (localRows.some(r => r[0]?.trim() === String(goalId).trim())) {
      return NextResponse.json({ error: 'Você já participa desta meta' }, { status: 409 });
    }

    // Confere agora o acesso à planilha do dono: sem ele a meta ficaria zerada sem nenhum aviso
    let ownerGoal: SavingsGoal | undefined;
    try {
      const ownerRows = await readUserTab(session.accessToken, ownerSpreadsheetId, SHEET_TABS.METAS);
      ownerGoal = ownerRows.filter(r => r[0]).map(rowToGoal).find(g => g.id === String(goalId));
    } catch (e) {
      console.error('[POST /api/metas/accept] sem acesso à planilha do dono', e);
      // needsAccess: a pessoa ainda precisa escolher a planilha do dono no seletor do Google (src/lib/googlePicker.ts)
      return NextResponse.json({
        error: 'Sem acesso à planilha do dono da meta. Confira se o convite foi gerado para o e-mail desta conta Google.',
        needsAccess: isNoAccessError(e),
        ownerSpreadsheetId,
      }, { status: 403 });
    }
    if (!ownerGoal) {
      return NextResponse.json({ error: 'Meta não encontrada. O dono pode tê-la excluído.' }, { status: 404 });
    }

    // Create a local reference to this shared goal (os valores são sincronizados com o dono a cada leitura)
    const sharedGoal: SavingsGoal = {
      ...ownerGoal,
      name: `(Compartilhado) ${ownerGoal.name}`,
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
