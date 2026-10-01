import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'simple' | 'detailed';

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'simple', // Padrão será o modo simples
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'finance-os-mode',
    }
  )
);

// Helper hook para facilitar o uso nos componentes
export function useAppMode() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  
  return {
    mode,
    setMode,
    isSimple: mode === 'simple',
    isDetailed: mode === 'detailed',
  };
}
