import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSheetsClient } from '@/lib/user-sheets';
import { SHEET_TABS } from '@/lib/sheets';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.accessToken || !session?.spreadsheetId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheets = await getUserSheetsClient(session.accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: session.spreadsheetId,
      range: `${SHEET_TABS.CONFIG}!A2:B`,
    });

    const rows = response.data.values || [];
    const config: Record<string, string> = {};
    for (const row of rows) {
      if (row[0]) {
        config[row[0]] = row[1] ?? '';
      }
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching config:', error);
    // If the tab doesn't exist, ignore and return empty
    if (error.message?.includes('Unable to parse range')) {
       return NextResponse.json({});
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const sheets = await getUserSheetsClient(session.accessToken);
    const spreadsheetId = session.spreadsheetId;

    // First, get all current rows to find if key exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TABS.CONFIG}!A:B`,
    }).catch((e) => {
       // If it fails, we assume tab might not exist, but let's just rethrow or ignore
       throw e;
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === key) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (rowIndex !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_TABS.CONFIG}!B${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[String(value)]],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_TABS.CONFIG}!A:B`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[key, String(value)]],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
