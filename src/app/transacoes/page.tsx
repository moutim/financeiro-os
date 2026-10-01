'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import MonthSelector from '@/components/transactions/MonthSelector';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionForm from '@/components/transactions/TransactionForm';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel } from '@/lib/currency';
import { useCategoryTaxonomy } from '@/lib/taxonomy';
import type { Category } from '@/lib/types';

/* ── Tooltip ──────────────────────────────────────────────────────────────── */
interface TooltipState {
  label: string;
  x: number;
  y: number;
}

function TooltipPortal({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translateX(-50%)',
        background: 'rgba(30, 30, 35, 0.92)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        padding: '5px 10px',
        borderRadius: 8,
        pointerEvents: 'none',
        zIndex: 99999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        animation: 'tooltipFadeIn 0.12s ease forwards',
      }}
    >
      {tooltip.label}
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(30, 30, 35, 0.92)',
      }} />
    </div>,
    document.body
  );
}

/* ── Category Pill ────────────────────────────────────────────────────────── */
interface PillProps {
  cat: string;
  isActive: boolean;
  cfg: { color: string; icon: import('react').ElementType } | null;
  onSelect: () => void;
  onTooltipShow: (label: string, x: number, y: number) => void;
  onTooltipHide: () => void;
}

function CategoryPill({ cat, isActive, cfg, onSelect, onTooltipShow, onTooltipHide }: PillProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onTooltipShow(cat, rect.left + rect.width / 2, rect.top - 10);
  }, [cat, onTooltipShow]);

  return (
    <button
      ref={ref}
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onTooltipHide}
      onFocus={handleMouseEnter}
      onBlur={onTooltipHide}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.15s ease',
        background: isActive
          ? (cfg ? cfg.color : 'var(--blue)')
          : 'var(--surface)',
        color: isActive ? 'white' : 'var(--text-secondary)',
        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        outline: isActive ? 'none' : '1px solid var(--separator)',
        border: 'none',
      }}
    >
      {cfg && <span style={{ display: 'flex', alignItems: 'center' }}><cfg.icon size={14} /></span>}
      {cat}
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function TransacoesPage() {
  const [showForm, setShowForm] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { selectedMonth, getMonthTransactions, filterCategory, setFilterCategory } = useFinanceStore();

  const taxonomy = useCategoryTaxonomy();

  const allTransactions = getMonthTransactions(selectedMonth);

  // Filtros seguem as categorias do modo atual; um filtro escolhido no outro
  // modo que não exista neste é ignorado (mostra todas).
  const filterOptions = ['Todas', ...taxonomy.categories];
  const activeFilter = filterCategory && taxonomy.categories.includes(filterCategory) ? filterCategory : null;

  const filtered = activeFilter
    ? allTransactions.filter((t) => taxonomy.normalize(t).category === activeFilter)
    : allTransactions;

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const showTooltip = useCallback((label: string, x: number, y: number) => {
    setTooltip({ label, x, y });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

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
              Transações
            </p>
            <h1 className="text-title-1" style={{ textTransform: 'capitalize' }}>
              {monthKeyToLabel(selectedMonth)}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {filtered.length} {filtered.length === 1 ? 'transação' : 'transações'} · Total: <strong style={{ color: 'var(--text-primary)' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </strong>
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div style={{ marginBottom: 20 }}>
          <MonthSelector />
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {filterOptions.map((cat) => {
            const isActive = (activeFilter ?? 'Todas') === cat;
            const cfg = cat !== 'Todas' ? taxonomy.getConfig(cat) : null;
            return (
              <CategoryPill
                key={cat}
                cat={cat}
                isActive={isActive}
                cfg={cfg}
                onSelect={() => setFilterCategory(cat === 'Todas' ? null : cat as Category)}
                onTooltipShow={showTooltip}
                onTooltipHide={hideTooltip}
              />
            );
          })}
        </div>

        {/* Transactions */}
        <GlassCard>
          <TransactionList transactions={filtered} showDelete />
        </GlassCard>
      </main>

      <button className="fab" onClick={() => setShowForm(true)} aria-label="Nova transação">
        +
      </button>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}

      <TooltipPortal tooltip={tooltip} />
    </>
  );
}
