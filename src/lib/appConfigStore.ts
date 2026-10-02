import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'simple' | 'detailed';

export const DEFAULT_APP_MODE: AppMode = 'simple';

/** Chave do modo na aba _Config da planilha do usuário */
const MODE_CONFIG_KEY = 'appMode';

/** Chave na aba _Config que marca que o usuário já fechou o modal de boas-vindas */
const WELCOME_TOUR_CONFIG_KEY = 'hasSeenWelcomeTour';

const isAppMode = (value: unknown): value is AppMode => value === 'simple' || value === 'detailed';

function saveConfigToServer(key: string, value: string) {
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  }).catch(console.error);
}

function saveModeToServer(mode: AppMode) {
  saveConfigToServer(MODE_CONFIG_KEY, mode);
}

interface AppConfigState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  /** Se o usuário já viu o tour de boas-vindas; null enquanto a planilha não respondeu */
  hasSeenWelcomeTour: boolean | null;
  markWelcomeTourSeen: () => void;
  /** Aplica a configuração salva na planilha, para ela acompanhar o usuário entre dispositivos */
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
      hasSeenWelcomeTour: null,
      markWelcomeTourSeen: () => {
        set({ hasSeenWelcomeTour: true });
        saveConfigToServer(WELCOME_TOUR_CONFIG_KEY, 'true');
      },
      fetchFromServer: async () => {
        const modeBeforeFetch = get().mode;
        try {
          const res = await fetch('/api/settings');
          if (!res.ok) return;
          const config: Record<string, string> = await res.json();
          const saved = config[MODE_CONFIG_KEY];

          // fica na planilha (e não no localStorage) para valer por usuário, e não por navegador
          set({ hasSeenWelcomeTour: config[WELCOME_TOUR_CONFIG_KEY] === 'true' });

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
      // localStorage é só cache do modo para a 1ª renderização; a fonte da verdade é a planilha.
      // hasSeenWelcomeTour fica de fora: outra conta no mesmo navegador herdaria o valor
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
