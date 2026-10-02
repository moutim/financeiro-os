import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS, SHEET_HEADERS } from '@/lib/sheets';

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

// INSERT_ROWS: o padrão (OVERWRITE) escreve na "próxima linha livre", e dois appends
// simultâneos podiam escolher a mesma linha, um apagando o outro

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
    insertDataOption: 'INSERT_ROWS',
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
    insertDataOption: 'INSERT_ROWS',
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

/** Limpa todas as linhas de dados de uma aba, preservando a linha 1 (cabeçalhos) */
export async function clearUserTab(
  accessToken: string,
  spreadsheetId: string,
  tab: string
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tab}!A2:Z`,
  });
}

// ─── Estrutura da planilha ────────────────────────────────────────────────────

/**
 * Deixa a planilha do usuário com todas as abas de SHEET_TABS e o cabeçalho de
 * SHEET_HEADERS na linha 1. O cabeçalho só é gravado quando a planilha é criada, então
 * nas planilhas antigas as colunas adicionadas depois ficavam sem título.
 * Só grava as abas que estiverem diferentes, para não encher o histórico de versões.
 * Retorna as abas cujo cabeçalho foi atualizado.
 */
export async function syncUserSheetStructure(
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> {
  const sheets = getUserSheetsClient(accessToken);
  const allTabs = Object.values(SHEET_TABS);

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const existingTabs = new Set(metaRes.data.sheets?.map(s => s.properties?.title));
  const missingTabs = allTabs.filter(tab => !existingTabs.has(tab));
  if (missingTabs.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: missingTabs.map(title => ({ addSheet: { properties: { title } } })) },
    });
  }

  // valueRanges volta na mesma ordem de ranges
  const headerRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: allTabs.map(tab => `${tab}!1:1`),
  });
  const outdatedTabs = allTabs.filter((tab, i) => {
    const current = (headerRes.data.valueRanges?.[i]?.values?.[0] ?? []) as string[];
    return SHEET_HEADERS[tab].some((header, col) => current[col] !== header);
  });
  if (outdatedTabs.length === 0) return [];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: outdatedTabs.map(tab => ({ range: `${tab}!A1`, values: [SHEET_HEADERS[tab]] })),
    },
  });
  return outdatedTabs;
}

// ─── _Config (chave → valor) ──────────────────────────────────────────────────

/** Nome do dono da planilha, exibido aos convidados nos aportes dele em metas compartilhadas */
export const USER_NAME_CONFIG_KEY = 'userName';

/** Lê a aba _Config como chave → valor (vazio se a aba ainda não existir) */
export async function readUserConfig(
  accessToken: string,
  spreadsheetId: string
): Promise<Record<string, string>> {
  const sheets = getUserSheetsClient(accessToken);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TABS.CONFIG}!A2:B`,
      // valor bruto: um booleano volta como true, e não como o texto formatado
      // "TRUE"/"VERDADEIRO" (que muda com o idioma da planilha)
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const config: Record<string, string> = {};
    for (const row of (res.data.values ?? []) as unknown[][]) {
      const key = row[0] == null ? '' : String(row[0]);
      // chave repetida: vale a 1ª linha, a mesma que setUserConfigValue atualiza
      if (key && !Object.prototype.hasOwnProperty.call(config, key)) {
        config[key] = row[1] == null ? '' : String(row[1]);
      }
    }
    return config;
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unable to parse range')) return {};
    throw e;
  }
}

/** Grava uma chave na aba _Config, atualizando a linha se ela já existir */
export async function setUserConfigValue(
  accessToken: string,
  spreadsheetId: string,
  key: string,
  value: string
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TABS.CONFIG}!A:B`,
  });
  const rowIndex = ((res.data.values ?? []) as string[][]).findIndex(row => row[0] === key);

  // RAW grava o texto como veio: com USER_ENTERED o Sheets converte "true" em booleano
  if (rowIndex !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TABS.CONFIG}!B${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TABS.CONFIG}!A:B`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[key, value]] },
    });
  }
}
