import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/google-picker
 * Configuração do seletor de arquivos do Google (src/lib/googlePicker.ts), lida
 * em tempo de execução para a chave poder mudar sem novo build.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GOOGLE_PICKER_API_KEY;
  // O App ID do seletor é o número do projeto no Google Cloud, que abre o Client ID OAuth ("123456-abc.apps…")
  const appId = process.env.GOOGLE_CLIENT_ID?.split('-')[0];
  if (!apiKey || !appId) {
    return NextResponse.json({ error: 'Seletor do Google não configurado (GOOGLE_PICKER_API_KEY).' }, { status: 503 });
  }

  return NextResponse.json({ apiKey, appId });
}
