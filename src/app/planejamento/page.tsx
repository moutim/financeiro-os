'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PlanningSection from '@/components/planning/PlanningSection';
import TransactionForm from '@/components/transactions/TransactionForm';
import type { TransactionFormPrefill } from '@/components/transactions/formPrefill';
import { useFinanceStore } from '@/lib/store';

export default function PlanejamentoPage() {
  const { loadingState, error, loadAll } = useFinanceStore();
  const [prefill, setPrefill] = useState<TransactionFormPrefill | null>(null);

  if (loadingState === 'loading' || loadingState === 'idle') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <LoadingSpinner message="Sincronizando com Google Sheets..." />
        </main>
      </>
    );
  }

  if (loadingState === 'error') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--orange)' }}><AlertTriangle size={48} /></div>
            <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Erro ao carregar dados</h2>
            <p style={{ color: 'var(--text-tertiary)', maxWidth: 400, margin: '0 auto 24px' }}>
              {error ?? 'Não foi possível conectar ao Google Sheets.'}
            </p>
            <button className="btn-primary" onClick={() => loadAll()}>Tentar novamente</button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Cartões, parcelas e gastos ao longo do tempo
            </p>
            <h1 className="text-title-1">Planejamento</h1>
          </div>
        </div>

        <PlanningSection onConfirmPurchase={setPrefill} />
      </main>

      {prefill && <TransactionForm initial={prefill} onClose={() => setPrefill(null)} />}
    </>
  );
}
