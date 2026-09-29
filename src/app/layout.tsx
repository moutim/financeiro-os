import type { Metadata, Viewport } from 'next';
import './globals.css';
import DataProvider from '@/components/providers/DataProvider';
import { SessionProvider } from 'next-auth/react';
import ThemeProvider from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Financeiro OS — Controle Financeiro',
  description: 'Plataforma de controle financeiro pessoal com identidade visual Apple',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Financeiro OS',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#F2F2F7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider>
            <DataProvider>
              {children}
            </DataProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
