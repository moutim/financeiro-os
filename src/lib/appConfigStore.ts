import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'simple' | 'detailed';

export const DEFAULT_APP_MODE: AppMode = 'simple';

interface AppConfigState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set) => ({
      mode: DEFAULT_APP_MODE,
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'financeiro-os-app-config',
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
