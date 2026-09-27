import type { Metadata } from 'next';
import './globals.css';
import DataProvider from '@/components/providers/DataProvider';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  title: 'Financeiro OS — Controle Financeiro',
  description: 'Plataforma de controle financeiro pessoal com identidade visual Apple',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <SessionProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
