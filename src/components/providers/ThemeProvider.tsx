'use client';

import { useEffect } from 'react';
import { useThemeStore, getLightColor } from '@/lib/themeStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tintColor, isDarkMode, fetchFromServer } = useThemeStore();

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tint-color', tintColor);
    root.style.setProperty('--tint-color-light', getLightColor(tintColor));
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [tintColor, isDarkMode]);

  return <>{children}</>;
}
