import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARD_SORT_OPTIONS, type CardSortOption } from '@/lib/creditCards';

export type AppMode = 'simple' | 'detailed';

export const DEFAULT_APP_MODE: AppMode = 'simple';

/** Chave do modo na aba _Config da planilha do usuário */
const MODE_CONFIG_KEY = 'appMode';

/** Chave na aba _Config que marca que o usuário já fechou o modal de boas-vindas */
const WELCOME_TOUR_CONFIG_KEY = 'hasSeenWelcomeTour';

/** Chave na aba _Config do mês inicial do Histórico de Investimentos (Metas); vazio = desde o 1º aporte */
const GOALS_HISTORY_START_CONFIG_KEY = 'goalsHistoryStartMonth';

/** Chave na aba _Config da ordenação dos cartões (Cartões, modo detalhado) */
const CARDS_SORT_CONFIG_KEY = 'cardsSort';

const DEFAULT_CARDS_SORT: CardSortOption = 'priority';

// Onde as preferências ficavam antes de ir para a planilha (valiam só para o navegador)
const LEGACY_GOALS_HISTORY_START_KEY = 'finance-os-goals-start-month';
const LEGACY_CARDS_SORT_KEY = 'financeiro_cards_sort';

/** Valor salvo neste navegador antes da sincronização (e apaga a cópia local); null se não houver */
function takeLegacyLocalValue(storageKey: string): string | null {
  try {
    const legacy = localStorage.getItem(storageKey);
    localStorage.removeItem(storageKey);
    return legacy || null;
  } catch {
    // localStorage indisponível (modo privado)
    return null;
  }
}

const isAppMode = (value: unknown): value is AppMode => value === 'simple' || value === 'detailed';

const isCardSortOption = (value: unknown): value is CardSortOption =>
  CARD_SORT_OPTIONS.some((o) => o.id === value);

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
  /** Mês inicial do Histórico de Investimentos (Metas); vazio = desde o 1º aporte */
  goalsHistoryStartMonth: string;
  setGoalsHistoryStartMonth: (monthKey: string) => void;
  /** Ordenação dos cartões escolhida no modo detalhado */
  cardsSort: CardSortOption;
  setCardsSort: (option: CardSortOption) => void;
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
      goalsHistoryStartMonth: '',
      setGoalsHistoryStartMonth: (monthKey) => {
        set({ goalsHistoryStartMonth: monthKey });
        saveConfigToServer(GOALS_HISTORY_START_CONFIG_KEY, monthKey);
      },
      cardsSort: DEFAULT_CARDS_SORT,
      setCardsSort: (option) => {
        set({ cardsSort: option });
        saveConfigToServer(CARDS_SORT_CONFIG_KEY, option);
      },
      fetchFromServer: async () => {
        const { mode: modeBeforeFetch, goalsHistoryStartMonth: startBeforeFetch, cardsSort: sortBeforeFetch } = get();
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

          // não sobrescreve uma troca feita enquanto a planilha respondia
          if (get().goalsHistoryStartMonth === startBeforeFetch) {
            const savedStart = config[GOALS_HISTORY_START_CONFIG_KEY];
            if (savedStart !== undefined) {
              set({ goalsHistoryStartMonth: savedStart });
            } else {
              // planilha ainda sem o mês (escolhido antes da sincronização): sobe o deste navegador
              const legacyStart = takeLegacyLocalValue(LEGACY_GOALS_HISTORY_START_KEY);
              if (legacyStart) get().setGoalsHistoryStartMonth(legacyStart);
            }
          }

          if (get().cardsSort === sortBeforeFetch) {
            const savedSort = config[CARDS_SORT_CONFIG_KEY];
            if (isCardSortOption(savedSort)) {
              set({ cardsSort: savedSort });
            } else {
              // planilha ainda sem a ordenação (escolhida antes da sincronização): sobe a deste navegador
              const legacySort = takeLegacyLocalValue(LEGACY_CARDS_SORT_KEY);
              if (isCardSortOption(legacySort)) get().setCardsSort(legacySort);
            }
          }
        } catch (e) {
          console.error('Failed to load app mode from server', e);
        }
      },
    }),
    {
      name: 'financeiro-os-app-config',
      // localStorage é só cache do modo para a 1ª renderização; a fonte da verdade é a planilha.
      // as demais preferências ficam de fora: outra conta no mesmo navegador herdaria o valor
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
