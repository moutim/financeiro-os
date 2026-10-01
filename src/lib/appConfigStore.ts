import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'simple' | 'detailed';

export const DEFAULT_APP_MODE: AppMode = 'simple';

/** Chave do modo na aba _Config da planilha do usuário */
const MODE_CONFIG_KEY = 'appMode';

const isAppMode = (value: unknown): value is AppMode => value === 'simple' || value === 'detailed';

function saveModeToServer(mode: AppMode) {
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: MODE_CONFIG_KEY, value: mode }),
  }).catch(console.error);
}

interface AppConfigState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  /** Aplica o modo salvo na planilha, para ele acompanhar o usuário entre dispositivos */
  fetchFromServer: () => Promise<void>;
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set, get) => ({
      mode: DEFAULT_APP_MODE,
      setMode: (mode) => {
        set({ mode });
        saveModeToServer(mode);
      },
      fetchFromServer: async () => {
        const modeBeforeFetch = get().mode;
        try {
          const res = await fetch('/api/settings');
          if (!res.ok) return;
          const config: Record<string, string> = await res.json();
          const saved = config[MODE_CONFIG_KEY];

          if (isAppMode(saved)) {
            // não sobrescreve uma troca feita enquanto a planilha respondia
            if (get().mode === modeBeforeFetch) set({ mode: saved });
          } else {
            // planilha ainda sem o modo (escolhido antes da sincronização): sobe o local
            saveModeToServer(get().mode);
          }
        } catch (e) {
          console.error('Failed to load app mode from server', e);
        }
      },
    }),
    {
      name: 'financeiro-os-app-config',
      // localStorage é só cache para a 1ª renderização; a fonte da verdade é a planilha
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);

// ─── Hooks de leitura do modo ────────────────────────────────────────────────
// Nos componentes, leia o modo SEMPRE por estes hooks (nunca via getState()).
// Eles usam um seletor do zustand, que no servidor e na 1ª renderização do
// cliente devolve o modo padrão — sem isso, um modo "detailed" salvo no
// localStorage gera erro de hidratação.

export const useAppMode = (): AppMode => useAppConfigStore((s) => s.mode);

export const useIsDetailedMode = (): boolean => useAppConfigStore((s) => s.mode === 'detailed');
