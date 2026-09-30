'use client';

import { useEffect } from 'react';
import { useThemeStore, getLightColor } from '@/lib/themeStore';
import { usePathname } from 'next/navigation';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tintColor, isDarkMode, fetchFromServer } = useThemeStore();
  const pathname = usePathname();

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tint-color', tintColor);
    root.style.setProperty('--tint-color-light', getLightColor(tintColor));
    
    // Força o modo claro na página de login, independentemente da preferência do usuário
    if (pathname === '/login') {
      root.classList.remove('dark');
    } else if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [tintColor, isDarkMode, pathname]);

  return <>{children}</>;
}
