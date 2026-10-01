import { getUserSheetsClient } from '@/lib/user-sheets';

/** Lê todas as linhas de uma aba (exceto o header) */
export async function readUserTab(
  accessToken: string,
  spreadsheetId: string,
  tab: string
): Promise<string[][]> {
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A2:Z`,
  });
  return (res.data.values ?? []) as string[][];
}

/** Append de uma linha */
export async function appendUserRow(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  values: (string | number | null)[]
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Append de múltiplas linhas (batch) */
export async function appendUserRows(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  values: (string | number | null)[][]
): Promise<void> {
  if (!values.length) return;
  const sheets = getUserSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/** Deleta uma linha pelo ID na coluna A */
export async function deleteUserRowById(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  id: string
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);

  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:A`,
  });
  const col = (colRes.data.values ?? []) as string[][];
  const rowIndex = col.findIndex(row => row[0]?.trim() === id.trim());
  if (rowIndex < 1) {
    throw new Error(`Row with ID ${id} not found in ${tab}`);
  }

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMeta = metaRes.data.sheets?.find(s => s.properties?.title === tab);
  const sheetId = sheetMeta?.properties?.sheetId;
  if (sheetId == null) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

/** Deleta múltiplas linhas pelos IDs (batch) */
export async function deleteUserRowsByIds(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const sheets = getUserSheetsClient(accessToken);

  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:A`,
  });
  const col = (colRes.data.values ?? []) as string[][];

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMeta = metaRes.data.sheets?.find(s => s.properties?.title === tab);
  const sheetId = sheetMeta?.properties?.sheetId;
  if (sheetId == null) return;

  const rowIndices = ids
    .map(id => col.findIndex(row => row[0] === id))
    .filter(idx => idx >= 1)
    .sort((a, b) => b - a); // descendente para não deslocar índices

  if (rowIndices.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: rowIndices.map(idx => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: idx,
            endIndex: idx + 1,
          },
        },
      })),
    },
  });
}

/** Atualiza uma linha inteira pelo ID */
export async function updateUserRowById(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  id: string,
  values: (string | number | null)[]
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);

  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:A`,
  });
  const col = (colRes.data.values ?? []) as string[][];
  const rowIndex = col.findIndex(row => row[0]?.trim() === id.trim());
  if (rowIndex < 1) {
    throw new Error(`Row with ID ${id} not found in ${tab}`);
  }

  const sheetRow = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}
