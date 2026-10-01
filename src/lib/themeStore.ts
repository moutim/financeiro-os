import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  tintColor: string;
  setTintColor: (color: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isLoaded: boolean;
  fetchFromServer: () => Promise<void>;
}

// Helpers to generate light version of hex color
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      tintColor: '#007AFF',
      isDarkMode: false,
      isLoaded: false,
      setTintColor: (color) => {
        set({ tintColor: color });
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'tintColor', value: color })
        }).catch(console.error);
      },
      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.isDarkMode;
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'isDarkMode', value: String(newDarkMode) })
          }).catch(console.error);
          return { isDarkMode: newDarkMode };
        });
      },
      fetchFromServer: async () => {
        if (get().isLoaded) return;
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            if (data.tintColor || data.isDarkMode !== undefined) {
              set({
                tintColor: data.tintColor || get().tintColor,
                isDarkMode: data.isDarkMode === 'true',
                isLoaded: true
              });
            } else {
              set({ isLoaded: true });
            }
          }
        } catch (e) {
          console.error('Failed to load theme from server', e);
        }
      }
    }),
    {
      name: 'finance-os-theme',
      // isLoaded fica só na memória: a cada abertura do app a planilha é lida de novo,
      // então mudanças feitas em outro dispositivo chegam aqui
      partialize: (state) => ({ tintColor: state.tintColor, isDarkMode: state.isDarkMode }),
      // ignora o isLoaded que versões anteriores gravaram no localStorage
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<ThemeState>), isLoaded: false }),
    }
  )
);

export const getLightColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 122, 255, 0.12)`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
};
