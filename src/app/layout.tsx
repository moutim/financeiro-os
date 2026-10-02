import type { Metadata, Viewport } from 'next';
import './globals.css';
import DataProvider from '@/components/providers/DataProvider';
import { SessionProvider } from 'next-auth/react';
import ThemeProvider from '@/components/providers/ThemeProvider';
import { THEME_COLOR_LIGHT, THEME_INIT_SCRIPT } from '@/lib/themeInit';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'https://seudominio.com.br'),
  alternates: {
    canonical: '/',
  },
  title: 'Financeiro OS | Controle Financeiro Online e Pessoal',
  description: 'O melhor sistema de controle financeiro online. Gerencie suas finanças pessoais com uma planilha automática conectada ao seu próprio Google Drive.',
  keywords: ['controle financeiro online', 'finanças pessoais', 'planilha de gastos', 'gestão financeira', 'planejamento financeiro', 'planilha automática', 'controle de despesas', 'financeiro os'],
  openGraph: {
    title: 'Financeiro OS | Controle Financeiro Online',
    description: 'Sistema completo e seguro para gestão financeira pessoal. Seus dados ficam 100% privados no seu próprio Google Drive.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Financeiro OS'
  },
  robots: {
    index: true,
    follow: true,
  },
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
  themeColor: THEME_COLOR_LIGHT,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script do <head> pode pôr a classe "dark" antes da hidratação
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider>
            <DataProvider>
              {children}
            </DataProvider>
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
