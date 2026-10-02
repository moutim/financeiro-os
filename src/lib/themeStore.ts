import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME_STORAGE_KEY } from '@/lib/themeInit';

/** Chaves do tema na aba _Config da planilha do usuário */
const TINT_CONFIG_KEY = 'tintColor';
const DARK_MODE_CONFIG_KEY = 'isDarkMode';

function saveConfigToServer(key: string, value: string) {
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  }).catch(console.error);
}

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
        saveConfigToServer(TINT_CONFIG_KEY, color);
      },
      toggleDarkMode: () => {
        const isDarkMode = !get().isDarkMode;
        set({ isDarkMode });
        saveConfigToServer(DARK_MODE_CONFIG_KEY, String(isDarkMode));
      },
      fetchFromServer: async () => {
        if (get().isLoaded) return;
        const { tintColor: tintBeforeFetch, isDarkMode: darkModeBeforeFetch } = get();
        try {
          const res = await fetch('/api/settings');
          if (!res.ok) return;
          const config: Record<string, string> = await res.json();
          const savedTint = config[TINT_CONFIG_KEY];
          const savedDarkMode = config[DARK_MODE_CONFIG_KEY]?.toLowerCase();

          // só aplica o que a planilha tem, e não sobrescreve uma troca feita enquanto ela respondia
          if (savedTint && get().tintColor === tintBeforeFetch) {
            set({ tintColor: savedTint });
          }
          if (savedDarkMode === 'true' || savedDarkMode === 'false') {
            if (get().isDarkMode === darkModeBeforeFetch) set({ isDarkMode: savedDarkMode === 'true' });
          } else {
            // planilha ainda sem o tema (escolhido antes da sincronização): sobe o local
            saveConfigToServer(DARK_MODE_CONFIG_KEY, String(get().isDarkMode));
          }
          set({ isLoaded: true });
        } catch (e) {
          console.error('Failed to load theme from server', e);
        }
      }
    }),
    {
      name: THEME_STORAGE_KEY,
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
