'use client';

import { Inbox, BarChart2 } from 'lucide-react';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import MonthSelector from '@/components/transactions/MonthSelector';
import TransactionForm from '@/components/transactions/TransactionForm';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel, formatCurrency } from '@/lib/currency';
import { CATEGORY_CONFIG, getCategoryConfig } from '@/lib/categories';
import type { Category } from '@/lib/types';

export default function CategoriasPage() {
  const [showForm, setShowForm] = useState(false);
  const { selectedMonth, getMonthTransactions, setSelectedMonth, availableMonths } = useFinanceStore();
  const transactions = getMonthTransactions(selectedMonth);

  // Group by category
  const byCategory: Record<string, { total: number; count: number }> = {};
  transactions.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = { total: 0, count: 0 };
    byCategory[t.category].total += t.amount;
    byCategory[t.category].count += 1;
  });

  const totalGastos = Object.values(byCategory).reduce((s, v) => s + v.total, 0);

  const sorted = Object.entries(byCategory)
    .map(([cat, { total, count }]) => ({ cat, total, count, pct: total / totalGastos }))
    .sort((a, b) => b.total - a.total);

  // Evolution: category spending per month
  const allMonthsByCategory = availableMonths.map((mk) => {
    const txs = getMonthTransactions(mk);
    const byCat: Record<string, number> = {};
    txs.forEach((t) => {
      byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
    });
    return { monthKey: mk, byCat };
  });

  return (
    <>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>
                Categorias
              </p>
              <h1 className="text-title-1" style={{ textTransform: 'capitalize' }}>
                {monthKeyToLabel(selectedMonth)}
              </h1>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div style={{ marginBottom: 24 }}>
          <MonthSelector />
        </div>

        {/* Total */}
        <GlassCard style={{ marginBottom: 20 }} glass>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Total do mês</p>
              <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>
                {formatCurrency(totalGastos)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--blue)' }}><BarChart2 size={40} strokeWidth={1.5} /></div>
          </div>
        </GlassCard>

        {/* Category Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sorted.map(({ cat, total, count, pct }, i) => {
            const cfg = getCategoryConfig(cat);
            return (
              <GlassCard
                key={cat}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: cfg.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: cfg.color,
                    }}>
                      <cfg.icon size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {count} {count === 1 ? 'item' : 'itens'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: cfg.color, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                      {formatCurrency(total)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, whiteSpace: 'nowrap' }}>
                      {(pct * 100).toFixed(1)}% do total
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(pct * 100, 100)}%`, background: cfg.color }}
                  />
                </div>

                {/* Trend across months */}
                <div style={{ display: 'flex', gap: 3, marginTop: 12, alignItems: 'flex-end', height: 32 }}>
                  {allMonthsByCategory.map(({ monthKey, byCat }, mi) => {
                    const maxInCat = Math.max(...allMonthsByCategory.map((m) => m.byCat[cat] ?? 0));
                    const val = byCat[cat] ?? 0;
                    const height = maxInCat > 0 ? (val / maxInCat) * 100 : 0;
                    const isSelected = monthKey === selectedMonth;
                    return (
                      <button
                        key={monthKey}
                        onClick={() => setSelectedMonth(monthKey)}
                        style={{
                          flex: 1,
                          minWidth: 4,
                          padding: 0,
                          height: `${Math.max(height, 4)}%`,
                          minHeight: 4,
                          background: isSelected ? cfg.color : cfg.bgColor,
                          borderRadius: 3,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        title={monthKey}
                      />
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <GlassCard>
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text-tertiary)' }}><Inbox size={48} strokeWidth={1.5} /></div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Sem dados este mês</div>
              <div style={{ fontSize: 15, marginTop: 4 }}>Adicione transações para ver o breakdown</div>
            </div>
          </GlassCard>
        )}
      </main>

      <button className="fab" onClick={() => setShowForm(true)} aria-label="Nova transação">+</button>
      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </>
  );
}
