import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { clearUserTab } from '@/lib/user-sheets-helpers';

export const dynamic = 'force-dynamic';

export async function POST() {
  return DELETE();
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.spreadsheetId) {
      return NextResponse.json({
        ok: true,
        localOnly: true,
        message: 'Dados mockados desativados.',
      });
    }

    const tabsToClear = [
      SHEET_TABS.TRANSACOES,
      SHEET_TABS.RECEITAS,
      SHEET_TABS.PENDENCIAS,
      SHEET_TABS.METAS,
      SHEET_TABS.CARTOES,
    ];

    for (const tab of tabsToClear) {
      await clearUserTab(session.accessToken, session.spreadsheetId, tab);
    }

    return NextResponse.json({
      ok: true,
      message: '✅ Todos os dados mockados foram removidos da planilha.',
    });
  } catch (err: unknown) {
    console.error('[DELETE /api/seed-mock]', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
