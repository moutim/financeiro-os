// ─── Augment NextAuth types to include our custom session fields ──────────────
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    spreadsheetId: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    spreadsheetId?: string;
    error?: string;
  }
}
