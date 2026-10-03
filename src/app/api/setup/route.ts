import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { SHEET_TABS, SHEET_HEADERS } from '@/lib/sheets';
import { transactionToRow, incomeToRow, pendingToRow, goalToRow } from '@/lib/parsers';
import { SEED_TRANSACTIONS, SEED_INCOMES, SEED_PENDING, SEED_GOALS } from '@/lib/seed';

export const dynamic = 'force-dynamic';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Missing credentials in .env.local');
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

/**
 * POST /api/setup
 *
 * Prerequisites:
 * 1. Create a blank Google Spreadsheet at sheets.google.com
 * 2. Share it with the service account email as Editor
 * 3. Set GOOGLE_SHEETS_ID in .env.local to the spreadsheet ID
 *
 * This endpoint will:
 * - Create all tabs defined in SHEET_TABS (idempotent — skips existing ones)
 * - Write canonical headers from SHEET_HEADERS to row 1 of each tab
 * - Seed with historical data only if the sheet is empty
 */
export async function POST() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      return NextResponse.json({
        error: 'GOOGLE_SHEETS_ID not set in .env.local. Create a blank Google Sheet, share it with the service account, and paste the ID.',
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      }, { status: 400 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // ── Step 1: Ensure all tabs exist (idempotent) ────────────────────────
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = metaRes.data.sheets?.map(s => s.properties?.title) ?? [];

    const allTabs = Object.values(SHEET_TABS);
    const tabsToCreate = allTabs.filter(t => !existingTabs.includes(t));

    if (tabsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: tabsToCreate.map(title => ({ addSheet: { properties: { title } } })),
        },
      });
    }

    // ── Step 2: Write canonical headers (SHEET_HEADERS is the source of truth) ──
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: allTabs.map(tab => ({
          range: `${tab}!A1`,
          values: [SHEET_HEADERS[tab]],
        })),
      },
    });

    // ── Step 3: Check if already seeded ───────────────────────────────────
    const existingCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TABS.TRANSACOES}!A2:A3`,
    });

    if (existingCheck.data.values && existingCheck.data.values.length > 0) {
      return NextResponse.json({
        ok: true,
        message: 'Abas já têm dados. Headers atualizados, seed pulado.',
        tabs: allTabs,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      });
    }

    // ── Step 4: Seed data via batch write ─────────────────────────────────
    // Cartoes, FaturasCartao e _Config começam vazios — populados pela UI
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `${SHEET_TABS.TRANSACOES}!A2`, values: SEED_TRANSACTIONS.map(transactionToRow) },
          { range: `${SHEET_TABS.RECEITAS}!A2`,   values: SEED_INCOMES.map(incomeToRow) },
          { range: `${SHEET_TABS.PENDENCIAS}!A2`, values: SEED_PENDING.map(pendingToRow) },
          { range: `${SHEET_TABS.METAS}!A2`,      values: SEED_GOALS.map(goalToRow) },
        ],
      },
    });

    return NextResponse.json({
      ok: true,
      message: '✅ Planilha configurada e populada com sucesso!',
      tabs: allTabs,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      seeded: {
        transacoes: SEED_TRANSACTIONS.length,
        receitas: SEED_INCOMES.length,
        pendencias: SEED_PENDING.length,
        metas: SEED_GOALS.length,
      },
    });
  } catch (err: unknown) {
    console.error('[POST /api/setup]', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
