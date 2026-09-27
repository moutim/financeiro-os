import { google } from 'googleapis';

// ─── Tab names in the Google Sheet ────────────────────────────────────────────
// Convention: PascalCase, singular or domain name.
// Never rename these after going to production — use migrations instead.
export const SHEET_TABS = {
  // ── Dashboard / Transações ──────────────────────────────────────────────────
  TRANSACOES:      'Transacoes',      // /dashboard  + /transacoes
  RECEITAS:        'Receitas',        // /dashboard (receitas do mês)
  PENDENCIAS:      'Pendencias',      // sidebar / widget de pendências

  // ── Metas ────────────────────────────────────────────────────────────────────
  METAS:           'Metas',           // /metas

  // ── Cartões ──────────────────────────────────────────────────────────────────
  CARTOES:         'Cartoes',         // /cartoes  — cadastro dos cartões
  FATURAS_CARTAO:  'FaturasCartao',   // /cartoes  — faturas mensais por cartão

  // ── Configurações globais ─────────────────────────────────────────────────────
  CONFIG:          '_Config',         // chave/valor de configuração do app
} as const;

export type SheetTab = (typeof SHEET_TABS)[keyof typeof SHEET_TABS];

// ─── Canonical headers (source of truth for column order) ─────────────────────
// Keep these in sync with parsers.ts — column index === array index.
export const SHEET_HEADERS: Record<SheetTab, string[]> = {
  // ID | Nome | Valor | Categoria | MesKey | Parcelas | Data | GoalId | CardId | ParentId
  [SHEET_TABS.TRANSACOES]:     ['ID', 'Nome', 'Valor', 'Categoria', 'MesKey', 'Parcelas', 'Data', 'GoalId', 'CardId', 'ParentId'],

  // ID | Nome | Valor | MesKey | IsRecurring | ParentId | Parcelas
  [SHEET_TABS.RECEITAS]:       ['ID', 'Nome', 'Valor', 'MesKey', 'IsRecurring', 'ParentId', 'Parcelas'],

  // ID | Nome | Valor | DueDate | Notes
  [SHEET_TABS.PENDENCIAS]:     ['ID', 'Nome', 'Valor', 'DueDate', 'Notes'],

  // ID | Nome | Atual | Meta | Previsao | Deadline | Notes | IsShared | OwnerSpreadsheetId
  [SHEET_TABS.METAS]:          ['ID', 'Nome', 'Atual', 'Meta', 'Previsao', 'Deadline', 'Notes', 'IsShared', 'OwnerSpreadsheetId'],

  // ID | Nome | Limite | Usado | Cor | CorClara | Bandeira | DiaPagamento | DiaFechamento | Notes | FreedMonthKey | LastDigits
  [SHEET_TABS.CARTOES]:        ['ID', 'Nome', 'Limite', 'Usado', 'Cor', 'CorClara', 'Bandeira', 'DiaPagamento', 'DiaFechamento', 'Notes', 'FreedMonthKey', 'LastDigits'],

  // ID | CardId | MesKey | Valor | IsPaid | PaidAt
  [SHEET_TABS.FATURAS_CARTAO]: ['ID', 'CardId', 'MesKey', 'Valor', 'IsPaid', 'PaidAt'],

  // Key | Value
  [SHEET_TABS.CONFIG]:         ['Key', 'Value'],
};


// ─── Auth ─────────────────────────────────────────────────────────────────────
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error(
      'Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local'
    );
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) {
    throw new Error(
      'Missing GOOGLE_SHEETS_ID in .env.local'
    );
  }
  return id;
}

// ─── Get sheets client ────────────────────────────────────────────────────────
export async function getSheetsClient() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSheetId();
  return { sheets, spreadsheetId };
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

/** Read all rows from a tab (excluding header row) */
export async function readTab(tab: string): Promise<string[][]> {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A2:Z`,
  });
  return (res.data.values ?? []) as string[][];
}

/** Append a row to a tab */
export async function appendRow(tab: string, values: (string | number | null)[]): Promise<void> {
  const { sheets, spreadsheetId } = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Delete a row by finding the cell that matches an ID in column A */
export async function deleteRowById(tab: string, id: string): Promise<void> {
  const { sheets, spreadsheetId } = await getSheetsClient();

  // Get all rows to find the matching row index
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:A`,
  });
  const col = (res.data.values ?? []) as string[][];
  // Row index is 1-based; row 0 is header
  const rowIndex = col.findIndex((row) => row[0] === id);
  if (rowIndex < 1) return; // not found or is header

  // Get the sheet numeric ID for the batchUpdate
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMeta = metaRes.data.sheets?.find(
    (s) => s.properties?.title === tab
  );
  if (!sheetMeta?.properties?.sheetId) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetMeta.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,   // 0-based
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

/** Batch delete multiple rows by their IDs */
export async function deleteRowsByIds(tab: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { sheets, spreadsheetId } = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:A`,
  });
  const col = (res.data.values ?? []) as string[][];

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMeta = metaRes.data.sheets?.find(
    (s) => s.properties?.title === tab
  );
  if (!sheetMeta?.properties?.sheetId) return;

  const rowIndices = ids
    .map((id) => col.findIndex((row) => row[0] === id))
    .filter((idx) => idx >= 1)
    .sort((a, b) => b - a); // Sort descending to delete from bottom up

  if (rowIndices.length === 0) return;

  const requests = rowIndices.map((idx) => ({
    deleteDimension: {
      range: {
        sheetId: sheetMeta.properties?.sheetId,
        dimension: 'ROWS',
        startIndex: idx,
        endIndex: idx + 1,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

/** Update a specific row by ID — overwrites entire row */
export async function updateRowById(
  tab: string,
  id: string,
  values: (string | number | null)[]
): Promise<void> {
  const { sheets, spreadsheetId } = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:A`,
  });
  const col = (res.data.values ?? []) as string[][];
  const rowIndex = col.findIndex((row) => row[0] === id);
  if (rowIndex < 1) return;

  const sheetRow = rowIndex + 1; // 1-based for the range
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Ensure a tab with headers exists, creating it if not */
export async function ensureTabExists(
  tab: string,
  headers: string[]
): Promise<void> {
  const { sheets, spreadsheetId } = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
  }

  // Always write headers to row 1 (idempotent)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  });
}
