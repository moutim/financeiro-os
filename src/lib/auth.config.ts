import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], // Providers are added in auth.ts to avoid Edge runtime issues
} satisfies NextAuthConfig;
