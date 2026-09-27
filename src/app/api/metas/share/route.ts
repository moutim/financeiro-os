import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserDriveClient } from '@/lib/user-sheets';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, goalId, goalName } = await req.json();

    if (!email || !goalId || !goalName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const drive = getUserDriveClient(session.accessToken);
    
    // Add the provided email as a writer to the spreadsheet
    await drive.permissions.create({
      fileId: session.spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: email,
      },
      sendNotificationEmail: false, // Don't spam them with google drive emails
    });

    // Create share payload
    const sharePayload = {
      ownerSpreadsheetId: session.spreadsheetId,
      goalId,
      goalName
    };

    // Encode to base64 for easy copying
    const shareCode = Buffer.from(JSON.stringify(sharePayload)).toString('base64');

    return NextResponse.json({ shareCode }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/metas/share]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
