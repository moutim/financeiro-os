'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useFinanceStore } from '@/lib/store';
import { useAppConfigStore } from '@/lib/appConfigStore';

/**
 * Mounts once at the app root and loads all data from Google Sheets.
 * Subsequent navigations use the in-memory Zustand store.
 */
export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { loadAll, loadingState } = useFinanceStore();

  useEffect(() => {
    // Only load if authenticated and not already loaded/loading
    if (status === 'authenticated' && loadingState === 'idle') {
      loadAll();
    }
  }, [status, loadingState, loadAll]);

  // Modo simples/detalhado salvo na planilha (acompanha o usuário entre dispositivos)
  useEffect(() => {
    if (status === 'authenticated') {
      useAppConfigStore.getState().fetchFromServer();
    }
  }, [status]);

  return <>{children}</>;
}
