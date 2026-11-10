import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { newRowId } from '@/lib/sheetRows';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToBudget, budgetToRow } from '@/lib/parsers';
import {
  readUserTab,
  appendUserRow,
  deleteUserRowsByIds,
  syncUserSheetStructure,
} from '@/lib/user-sheets-helpers';
import type { CategoryBudget } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Planilha criada antes da aba Orcamentos existir (o sync-headers ainda não rodou) */
const isMissingTab = (err: unknown) => err instanceof Error && err.message.includes('Unable to parse range');

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const rows = await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.ORCAMENTOS);
      const budgets = rows.filter(r => r[0] && r[1]).map(rowToBudget);
      return NextResponse.json(budgets);
    } catch (err) {
      if (isMissingTab(err)) return NextResponse.json([]);
      throw err;
    }
  } catch (err) {
    console.error('[GET /api/orcamentos]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Omit<CategoryBudget, 'id'>;
    if (!body.category || !body.fromMonth || !(body.limit >= 0)) {
      return NextResponse.json({ error: 'Orçamento inválido' }, { status: 400 });
    }
    const budget: CategoryBudget = { ...body, id: newRowId('budget') };
    const row = budgetToRow(budget);

    try {
      await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.ORCAMENTOS, row);
    } catch (err) {
      if (!isMissingTab(err)) throw err;
      // cria a aba (com cabeçalho) e tenta de novo
      await syncUserSheetStructure(session.accessToken, session.spreadsheetId);
      await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.ORCAMENTOS, row);
    }
    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    console.error('[POST /api/orcamentos]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** Exclui várias versões de uma vez (ex: todo o histórico de uma categoria) */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ids } = await req.json() as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Nenhum orçamento informado' }, { status: 400 });
    }
    await deleteUserRowsByIds(session.accessToken, session.spreadsheetId, SHEET_TABS.ORCAMENTOS, ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/orcamentos]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
