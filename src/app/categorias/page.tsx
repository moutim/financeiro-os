'use client';

import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import MonthSelector from '@/components/transactions/MonthSelector';
import CategoriesSimpleView from '@/components/categories/CategoriesSimpleView';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ModeSwitch } from '@/components/mode/ModeSwitch';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel } from '@/lib/currency';

// Carregada só quando o modo detalhado está ativo (gráficos pesados)
const CategoriesDetailedView = dynamic(() => import('@/components/categories/CategoriesDetailedView'));

export default function CategoriasPage() {
  const { selectedMonth, loadingState } = useFinanceStore();

  if (loadingState === 'idle' || loadingState === 'loading') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <LoadingSpinner message="Sincronizando com Google Sheets..." />
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Categorias
            </p>
            <h1 className="text-title-1" style={{ textTransform: 'capitalize' }}>
              {monthKeyToLabel(selectedMonth)}
            </h1>
          </div>
        </div>

        {/* Month Selector */}
        <div style={{ marginBottom: 24 }}>
          <MonthSelector />
        </div>

        <ModeSwitch
          simple={<CategoriesSimpleView />}
          detailed={<CategoriesDetailedView />}
        />
      </main>
    </>
  );
}
