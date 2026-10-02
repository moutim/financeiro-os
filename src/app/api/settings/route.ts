import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readUserConfig, setUserConfigValue } from '@/lib/user-sheets-helpers';

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session?.spreadsheetId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // If the tab doesn't exist, readUserConfig returns empty
    const config = await readUserConfig(session.accessToken, session.spreadsheetId);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || !session?.spreadsheetId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 });

    await setUserConfigValue(session.accessToken, session.spreadsheetId, key, String(value));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
