'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useThemeStore, getLightColor } from '@/lib/themeStore';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/lib/themeInit';
import { usePathname } from 'next/navigation';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tintColor, isDarkMode, fetchFromServer } = useThemeStore();
  const pathname = usePathname();

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  // useLayoutEffect aplica antes da pintura; no 1º carregamento o script do layout já adiantou o "dark"
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tint-color', tintColor);
    root.style.setProperty('--tint-color-light', getLightColor(tintColor));

    // Força o modo claro na página de login, independentemente da preferência do usuário
    const dark = pathname !== '/login' && isDarkMode;
    root.classList.toggle('dark', dark);
    // barra do navegador/status bar no celular acompanha o tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }, [tintColor, isDarkMode, pathname]);

  return <>{children}</>;
}
