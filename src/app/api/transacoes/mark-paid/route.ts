import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { readUserTab } from '@/lib/user-sheets-helpers';

export const dynamic = 'force-dynamic';

/** Coluna IsPaid da aba de transações (ordem em transactionToRow, src/lib/parsers.ts) */
const IS_PAID_COLUMN = 'K';

/**
 * POST /api/transacoes/mark-paid
 * Body: { ids: string[] }
 *
 * Marca várias transações (e as sub-transações delas) como pagas numa única
 * gravação: só a célula IsPaid de cada linha, sem reescrever nem mover linhas.
 * Um PUT por transação, em paralelo, podia gravar na linha errada.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ids } = await req.json() as { ids?: string[] };
    if (!ids?.length) return NextResponse.json({ updated: 0 });

    const targets = new Set(ids);
    const tab = SHEET_TABS.TRANSACOES;
    const rows = await readUserTab(session.accessToken, session.spreadsheetId, tab);

    // linha da planilha = índice + 2 (a leitura começa na linha 2, abaixo do cabeçalho)
    const data = rows.flatMap((row, i) => (
      targets.has(row[0]) || targets.has(row[9])
        ? [{ range: `${tab}!${IS_PAID_COLUMN}${i + 2}`, values: [['true']] }]
        : []
    ));

    if (data.length > 0) {
      const sheets = getUserSheetsClient(session.accessToken);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: session.spreadsheetId,
        requestBody: { valueInputOption: 'USER_ENTERED', data },
      });
    }

    return NextResponse.json({ updated: data.length });
  } catch (err) {
    console.error('[POST /api/transacoes/mark-paid]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
