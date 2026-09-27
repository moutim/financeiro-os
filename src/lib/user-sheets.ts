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
