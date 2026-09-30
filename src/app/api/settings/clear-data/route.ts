import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { clearUserTab } from '@/lib/user-sheets-helpers';

export const dynamic = 'force-dynamic';

const VALID_TABS: Record<string, string[]> = {
  [SHEET_TABS.TRANSACOES]: [SHEET_TABS.TRANSACOES],
  [SHEET_TABS.RECEITAS]: [SHEET_TABS.RECEITAS],
  [SHEET_TABS.PENDENCIAS]: [SHEET_TABS.PENDENCIAS],
  [SHEET_TABS.METAS]: [SHEET_TABS.METAS],
  [SHEET_TABS.CARTOES]: [SHEET_TABS.CARTOES, SHEET_TABS.FATURAS_CARTAO],
  [SHEET_TABS.FATURAS_CARTAO]: [SHEET_TABS.FATURAS_CARTAO],
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.spreadsheetId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const requestedTabs = Array.isArray(body?.tabs) ? (body.tabs as string[]) : [];

    if (requestedTabs.length === 0) {
      return NextResponse.json({ error: 'Nenhuma aba selecionada para exclusão.' }, { status: 400 });
    }

    const tabsToClear = new Set<string>();
    for (const tab of requestedTabs) {
      const mapped = VALID_TABS[tab];
      if (mapped) {
        mapped.forEach(t => tabsToClear.add(t));
      }
    }

    if (tabsToClear.size === 0) {
      return NextResponse.json({ error: 'Abas informadas inválidas.' }, { status: 400 });
    }

    const cleared: string[] = [];
    for (const tab of Array.from(tabsToClear)) {
      await clearUserTab(session.accessToken, session.spreadsheetId, tab);
      cleared.push(tab);
    }

    return NextResponse.json({
      ok: true,
      message: 'Abas limpas com sucesso mantendo os cabeçalhos.',
      cleared,
    });
  } catch (err) {
    console.error('[POST /api/settings/clear-data]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
