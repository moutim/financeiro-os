import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { newRowId } from '@/lib/sheetRows';
import { getUserSheetsClient, isNoAccessError } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';
import { transactionToRow, rowToTransaction } from '@/lib/parsers';
import { readUserTab, deleteUserRowsByIds } from '@/lib/user-sheets-helpers';
import type { Transaction } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ownerSpreadsheetId, transaction } = body;

    if (!ownerSpreadsheetId || !transaction) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Force parentId to SHARED so it doesn't mess up the owner's balance
    const sharedTx: Transaction = {
      ...transaction,
      parentId: 'SHARED',
      id: newRowId('t-shared'),
      author: session.user?.name || session.user?.email || null,
    };

    const sheets = getUserSheetsClient(session.accessToken);
    await sheets.spreadsheets.values.append({
      spreadsheetId: ownerSpreadsheetId,
      range: `${SHEET_TABS.TRANSACOES}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [transactionToRow(sharedTx)] },
    });

    return NextResponse.json(sharedTx, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transacoes/shared]', err);
    // needsAccess: o app ainda não pode abrir a planilha do dono por esta conta (ver src/lib/googlePicker.ts)
    if (isNoAccessError(err)) {
      return NextResponse.json({ error: 'Sem acesso à planilha do dono da meta.', needsAccess: true }, { status: 403 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Reconcilia os aportes do convidado numa meta com as cópias gravadas na planilha do dono:
 * a cópia que bate com um aporte fica; as que sobraram são pareadas por mês e atualizadas
 * (aporte editado); cópia sem aporte correspondente é removida (aporte excluído ou movido de meta);
 * aporte sem cópia ganha uma. Não depende de saber como o aporte era antes da edição.
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ownerSpreadsheetId, goalId } = await req.json() as { ownerSpreadsheetId?: string; goalId?: string };
    if (!ownerSpreadsheetId || !goalId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const myName = session.user?.name || session.user?.email || null;
    if (!myName) return NextResponse.json({ error: 'Usuário sem nome' }, { status: 400 });

    const [ownerRows, myRows] = await Promise.all([
      readUserTab(session.accessToken, ownerSpreadsheetId, SHEET_TABS.TRANSACOES),
      readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES),
    ]);
    const copies = ownerRows
      .map((row, i) => ({ tx: rowToTransaction(row), sheetRow: i + 2 })) // readUserTab começa na linha 2
      .filter(({ tx }) => tx.id && tx.parentId === 'SHARED' && tx.goalId === goalId && tx.author === myName);
    const mine = myRows.map(rowToTransaction)
      .filter(t => t.id && !t.parentId && t.goalId === goalId && t.category === 'Investimentos');

    const asCopy = (t: Transaction, id: string): Transaction =>
      ({ ...t, id, name: `${t.name} (Compartilhado)`, parentId: 'SHARED', author: myName, subTransactions: null });

    // 1) cópia idêntica ao aporte: nada a fazer
    const sameAs = (c: Transaction, t: Transaction) =>
      c.monthKey === t.monthKey && Math.abs(c.amount - t.amount) < 0.005 && c.name === `${t.name} (Compartilhado)`;
    const freeCopies = [...copies];
    const unmatched = mine.filter(t => {
      const idx = freeCopies.findIndex(c => sameAs(c.tx, t));
      if (idx === -1) return true;
      freeCopies.splice(idx, 1);
      return false;
    });

    // 2) aporte editado: aproveita a cópia que sobrou no mesmo mês
    const updates: { sheetRow: number; tx: Transaction }[] = [];
    const toAppend: Transaction[] = [];
    for (const t of unmatched) {
      const idx = freeCopies.findIndex(c => c.tx.monthKey === t.monthKey);
      if (idx === -1) { toAppend.push(asCopy(t, newRowId('t-shared'))); continue; }
      const [c] = freeCopies.splice(idx, 1);
      updates.push({ sheetRow: c.sheetRow, tx: asCopy(t, c.tx.id) });
    }
    // 3) o que sobrou de cópia não tem aporte: foi excluído, ou ficou desatualizado
    const orphanIds = freeCopies.map(c => c.tx.id);

    const sheets = getUserSheetsClient(session.accessToken);
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: ownerSpreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updates.map(u => ({ range: `${SHEET_TABS.TRANSACOES}!A${u.sheetRow}`, values: [transactionToRow(u.tx)] })),
        },
      });
    }
    if (toAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: ownerSpreadsheetId,
        range: `${SHEET_TABS.TRANSACOES}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: toAppend.map(transactionToRow) },
      });
    }
    // por último: apagar desloca as linhas usadas acima
    await deleteUserRowsByIds(session.accessToken, ownerSpreadsheetId, SHEET_TABS.TRANSACOES, orphanIds);

    return NextResponse.json({ updated: updates.length, created: toAppend.length, removed: orphanIds.length });
  } catch (err) {
    console.error('[PUT /api/transacoes/shared]', err);
    if (isNoAccessError(err)) {
      return NextResponse.json({ error: 'Sem acesso à planilha do dono da meta.', needsAccess: true }, { status: 403 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
