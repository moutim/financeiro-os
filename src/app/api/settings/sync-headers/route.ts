import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncUserSheetStructure } from '@/lib/user-sheets-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/sync-headers
 * Chamado a cada abertura do app: cria abas que faltarem e completa o cabeçalho
 * das planilhas criadas antes de alguma coluna existir.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.spreadsheetId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await syncUserSheetStructure(session.accessToken, session.spreadsheetId);
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error('[POST /api/settings/sync-headers]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
