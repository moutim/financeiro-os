import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SHEET_TABS } from '@/lib/sheets';
import { rowToGoal, goalToRow, rowToTransaction } from '@/lib/parsers';
import { readUserTab, appendUserRow, updateUserRowById, deleteUserRowById, readUserConfig, setUserConfigValue, USER_NAME_CONFIG_KEY } from '@/lib/user-sheets-helpers';
import { getUserSheetsClient, isNoAccessError } from '@/lib/user-sheets';
import type { SavingsGoal, Transaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SheetTransaction = { tx: Transaction; sheetRow: number };

/**
 * Cópias de aporte gravadas antes da coluna Autor: as que batem com um lançamento do usuário (mesma meta,
 * mês, valor e nome) são dele. O autor é gravado na planilha do dono, assim os dois lados passam a ver o nome.
 */
async function claimLegacyCopies(
  accessToken: string,
  ownerSpreadsheetId: string,
  goalId: string,
  copies: SheetTransaction[],
  myTxs: Transaction[],
  myName: string
): Promise<void> {
  const myGoalTxs = myTxs.filter(t => t.goalId === goalId);
  const claimed: SheetTransaction[] = [];
  for (const copy of copies) {
    const idx = myGoalTxs.findIndex(t =>
      t.monthKey === copy.tx.monthKey &&
      Math.abs(t.amount - copy.tx.amount) < 0.005 &&
      `${t.name} (Compartilhado)` === copy.tx.name
    );
    if (idx === -1) continue;
    myGoalTxs.splice(idx, 1); // cada lançamento responde por uma cópia só
    claimed.push(copy);
  }
  if (claimed.length === 0) return;

  // Q = coluna Autor (índice 16 em transactionToRow)
  await getUserSheetsClient(accessToken).spreadsheets.values.batchUpdate({
    spreadsheetId: ownerSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: claimed.map(c => ({ range: `${SHEET_TABS.TRANSACOES}!Q${c.sheetRow}`, values: [[myName]] })),
    },
  });
  claimed.forEach(c => { c.tx.author = myName; });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myName = session.user?.name || session.user?.email || null;
    const [rows, myConfig] = await Promise.all([
      readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS),
      readUserConfig(session.accessToken, session.spreadsheetId).catch(() => null),
    ]);

    // Nome exibido aos convidados nos aportes deste usuário (eles não enxergam o perfil Google dele).
    // Grava uma vez, e de novo só se o nome da conta mudar.
    if (myName && myConfig && myConfig[USER_NAME_CONFIG_KEY] !== myName) {
      await setUserConfigValue(session.accessToken, session.spreadsheetId, USER_NAME_CONFIG_KEY, myName)
        .catch(e => console.error('[GET /api/metas] falha ao gravar o nome do usuário', e));
    }

    const goals = rows.filter(r => r[0]).map(rowToGoal);
    const validGoals: SavingsGoal[] = [];
    let myTxs: Transaction[] | null = null; // lidas só se aparecer cópia antiga sem autor

    // Sync shared goals with their owners
    for (const g of goals) {
      // Linha da própria planilha marcada como compartilhada (um PUT antigo do convidado gravava assim): é meta do usuário
      if (g.isShared && g.ownerSpreadsheetId === session.spreadsheetId) {
        validGoals.push({ ...g, isShared: false, ownerSpreadsheetId: null });
        continue;
      }
      if (!g.isShared || !g.ownerSpreadsheetId) {
        validGoals.push(g);
        continue;
      }

      try {
        const ownerRows = await readUserTab(session.accessToken, g.ownerSpreadsheetId, SHEET_TABS.METAS);
        const ownerGoal = ownerRows.filter(r => r[0]).map(rowToGoal).find(og => og.id === g.id);

        if (!ownerGoal) {
          // The owner deleted this goal! We should auto-delete it from our local sheet.
          await deleteUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, g.id);
          continue;
        }

        // Os mesmos aportes que o dono vê no card dele: investimentos vinculados à meta (inclusive as cópias
        // gravadas pelos convidados), sem as linhas de sub-transação. O valor passa pelo parser da planilha,
        // que já está em reais e pode vir formatado ("1.500,50").
        const ownerTxRows = await readUserTab(session.accessToken, g.ownerSpreadsheetId, SHEET_TABS.TRANSACOES);
        const contributions: SheetTransaction[] = ownerTxRows
          .map((row, i) => ({ tx: rowToTransaction(row), sheetRow: i + 2 })) // readUserTab começa na linha 2
          .filter(({ tx }) => tx.id && tx.goalId === g.id && tx.category === 'Investimentos' && (!tx.parentId || tx.parentId === 'SHARED'));

        const legacyCopies = contributions.filter(({ tx }) => tx.parentId === 'SHARED' && !tx.author);
        if (myName && legacyCopies.length > 0) {
          try {
            myTxs ??= (await readUserTab(session.accessToken, session.spreadsheetId, SHEET_TABS.TRANSACOES)).map(rowToTransaction);
            await claimLegacyCopies(session.accessToken, g.ownerSpreadsheetId, g.id, legacyCopies, myTxs, myName);
          } catch (e) {
            console.error(`Failed to claim legacy contributions of shared goal ${g.id}`, e);
          }
        }

        // Lançamentos do próprio dono não têm autor: usa o nome que ele grava na _Config ao abrir o app
        const ownerConfig = await readUserConfig(session.accessToken, g.ownerSpreadsheetId).catch(() => ({} as Record<string, string>));
        const ownerName = ownerConfig[USER_NAME_CONFIG_KEY] || 'Dono da meta';
        const sharedContributions = contributions
          .map(({ tx }) => ({ ...tx, author: tx.author || (tx.parentId === 'SHARED' ? null : ownerName) }));

        validGoals.push({ ...ownerGoal, isShared: true, ownerSpreadsheetId: g.ownerSpreadsheetId, sharedContributions });
      } catch (e) {
        console.error(`Failed to sync shared goal ${g.id} from owner ${g.ownerSpreadsheetId}`, e);
        validGoals.push({ ...g, ownerAccessDenied: isNoAccessError(e) });
      }
    }

    return NextResponse.json(validGoals);
  } catch (err) {
    console.error('[GET /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID da meta é obrigatório' }, { status: 400 });

    // We always delete from the current user's spreadsheet.
    // If the user is the owner, it removes the goal for them (and guests will auto-remove on next fetch).
    // If the user is a guest, it removes their local link to the goal (they "leave" the goal).
    await deleteUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, id);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as SavingsGoal;
    await appendUserRow(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, goalToRow(body));
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    console.error('[POST /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as SavingsGoal;

    if (body.isShared && body.ownerSpreadsheetId) {
      // Meta de outra conta: grava na planilha do dono, com a linha no formato dele (meta própria, não compartilhada)
      const ownerRow = goalToRow({ ...body, isShared: false, ownerSpreadsheetId: null });
      await updateUserRowById(session.accessToken, body.ownerSpreadsheetId, SHEET_TABS.METAS, body.id, ownerRow);
    } else {
      await updateUserRowById(session.accessToken, session.spreadsheetId, SHEET_TABS.METAS, body.id, goalToRow(body));
    }

    return NextResponse.json(body);
  } catch (err) {
    console.error('[PUT /api/metas]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
