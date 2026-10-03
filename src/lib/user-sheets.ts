import { google } from 'googleapis';

/**
 * Retorna um client do Google Sheets autenticado com o token OAuth do usuário.
 * Usar no lugar de getSheetsClient() nas API routes autenticadas.
 */
export function getUserSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
}

export function getUserDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

/**
 * Erro do Google por falta de acesso à planilha. Com a permissão drive.file, a
 * planilha de outra conta que ainda não foi escolhida no seletor do Google
 * (src/lib/googlePicker.ts) responde 404 "Requested entity was not found".
 */
export function isNoAccessError(err: unknown): boolean {
  const e = err as { status?: number; code?: number | string; response?: { status?: number } } | null;
  const status = e?.status ?? e?.response?.status ?? Number(e?.code);
  return status === 403 || status === 404;
}
