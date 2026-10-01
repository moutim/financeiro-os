import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { google as googleApis } from 'googleapis';
import { SHEET_TABS, SHEET_HEADERS } from '@/lib/sheets';

// ─── Helper: cria client do Sheets com token do usuário ──────────────────────
function getUserSheetsClient(accessToken: string) {
  const auth = new googleApis.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return googleApis.sheets({ version: 'v4', auth });
}

// ─── Helper: cria client do Drive com token do usuário ───────────────────────
function getUserDriveClient(accessToken: string) {
  const auth = new googleApis.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return googleApis.drive({ version: 'v3', auth });
}

// ─── Busca ou cria a planilha FinanceiroOS no Drive do usuário ───────────────
async function findOrCreateSpreadsheet(accessToken: string): Promise<string> {
  const drive = getUserDriveClient(accessToken);
  const sheets = getUserSheetsClient(accessToken);

  // 1. Busca uma planilha existente com o nome exato
  const searchRes = await drive.files.list({
    q: "name = 'FinanceiroOS' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const existing = searchRes.data.files?.[0];
  if (existing?.id) {
    console.log('[auth] Planilha existente encontrada:', existing.id);
    return existing.id;
  }

  // 2. Não encontrou — cria nova planilha
  console.log('[auth] Criando nova planilha FinanceiroOS...');
  const createRes = await drive.files.create({
    requestBody: {
      name: 'FinanceiroOS',
      mimeType: 'application/vnd.google-apps.spreadsheet',
    },
    fields: 'id',
  });

  const spreadsheetId = createRes.data.id!;

  // 3. Cria todas as abas definidas em SHEET_TABS
  const allTabs = Object.values(SHEET_TABS);

  // A planilha nova já tem uma aba "Sheet1" — vamos renomear para a primeira aba
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheetId = metaRes.data.sheets?.[0]?.properties?.sheetId ?? 0;
  const firstTab = allTabs[0]; // 'Transacoes'

  // Renomeia a aba padrão para o primeiro tab e cria o restante
  const renameAndCreate = [
    { updateSheetProperties: { properties: { sheetId: existingSheetId, title: firstTab }, fields: 'title' } },
    ...allTabs.slice(1).map(title => ({ addSheet: { properties: { title } } })),
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: renameAndCreate },
  });

  // 4. Escreve os headers canônicos em todas as abas
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

  console.log('[auth] Planilha criada e configurada:', spreadsheetId);
  return spreadsheetId;
}

// ─── Helper: renova o access token usando o refresh token ────────────────────
async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[auth] Falha ao renovar token:', data);
    throw new Error('RefreshAccessTokenError');
  }

  return {
    accessToken: data.access_token as string,
    accessTokenExpires: Date.now() + (data.expires_in as number) * 1000,
    refreshToken: (data.refresh_token as string) ?? refreshToken,
  };
}

import { authConfig } from './auth.config';

// ─── NextAuth config ──────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/spreadsheets',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // Primeiro login — guarda tokens e cria/busca a planilha
      if (account) {
        const spreadsheetId = await findOrCreateSpreadsheet(account.access_token!);
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
          spreadsheetId,
        };
      }

      // Token ainda válido
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Token expirado — renova
      try {
        const refreshed = await refreshAccessToken(token.refreshToken as string);
        return { ...token, ...refreshed };
      } catch {
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.spreadsheetId = token.spreadsheetId as string;
      session.error = token.error as string | undefined;
      return session;
    },

    // ── Middleware: redireciona para /login se não autenticado ─────────────
    authorized({ auth: session }) {
      return !!session;
    },
  },

  pages: {
    signIn: '/login',
  },
});
