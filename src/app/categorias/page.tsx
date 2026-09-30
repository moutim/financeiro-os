'use client';

import { useState, useMemo } from 'react';
import { Inbox, BarChart2, TrendingDown, Sparkles, Receipt, Search, ArrowUpDown, Filter } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import StatCard from '@/components/ui/StatCard';
import MonthSelector from '@/components/transactions/MonthSelector';
import CategoryCharts from '@/components/categories/CategoryCharts';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel, formatCurrency } from '@/lib/currency';
import { CATEGORY_CONFIG, getCategoryConfig } from '@/lib/categories';
import type { Category } from '@/lib/types';

type SortOption = 'total-desc' | 'total-asc' | 'name-asc' | 'count-desc';

export default function CategoriasPage() {
  const { selectedMonth, getMonthTransactions, setSelectedMonth, availableMonths } = useFinanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('total-desc');

  const transactions = getMonthTransactions(selectedMonth);

  // Group by category (apenas despesas de consumo e investimentos, excluindo transferências e receitas)
  const byCategory: Record<string, { total: number; count: number; micros: Record<string, number> }> = {};
  
  transactions
    .filter(t => t.transactionType !== 'transfer' && t.category !== 'Transferências' && t.transactionType !== 'income')
    .forEach((t) => {
      const cat = t.category || 'Outros';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, micros: {} };
      byCategory[cat].total += t.amount;
      byCategory[cat].count += 1;

      const sub = (t.subcategory && t.subcategory.trim()) || 'Geral';
      byCategory[cat].micros[sub] = (byCategory[cat].micros[sub] || 0) + t.amount;
    });

  const totalGastos = Object.values(byCategory).reduce((s, v) => s + v.total, 0);
  const totalItems = Object.values(byCategory).reduce((s, v) => s + v.count, 0);
  const ticketMedio = totalItems > 0 ? totalGastos / totalItems : 0;

  // Evolution: category spending per month
  const allMonthsByCategory = useMemo(() => {
    return availableMonths.map((mk) => {
      const txs = getMonthTransactions(mk);
      const byCat: Record<string, number> = {};
      txs
        .filter(t => t.transactionType !== 'transfer' && t.category !== 'Transferências' && t.transactionType !== 'income')
        .forEach((t) => {
          const c = t.category || 'Outros';
          byCat[c] = (byCat[c] ?? 0) + t.amount;
        });
      return { monthKey: mk, byCat };
    });
  }, [availableMonths, getMonthTransactions]);

  // Encontrar a maior Macro e o maior Micro individual
  let topMacro = { name: '-', amount: 0, pct: 0 };
  let topMicro = { name: '-', macro: '-', amount: 0 };

  Object.entries(byCategory).forEach(([cat, data]) => {
    if (data.total > topMacro.amount) {
      topMacro = { name: cat, amount: data.total, pct: totalGastos > 0 ? (data.total / totalGastos) * 100 : 0 };
    }
    Object.entries(data.micros).forEach(([sub, subAmt]) => {
      if (subAmt > topMicro.amount) {
        topMicro = { name: sub, macro: cat, amount: subAmt };
      }
    });
  });

  // Categorias ordenadas e filtradas
  const sortedCategories = useMemo(() => {
    let list = Object.entries(byCategory).map(([cat, { total, count, micros }]) => ({
      cat,
      total,
      count,
      pct: totalGastos > 0 ? total / totalGastos : 0,
      micros,
    }));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => {
        const matchesMacro = item.cat.toLowerCase().includes(term);
        const matchesMicro = Object.keys(item.micros).some(m => m.toLowerCase().includes(term));
        return matchesMacro || matchesMicro;
      });
    }

    switch (sortBy) {
      case 'total-desc':
        return list.sort((a, b) => b.total - a.total);
      case 'total-asc':
        return list.sort((a, b) => a.total - b.total);
      case 'name-asc':
        return list.sort((a, b) => a.cat.localeCompare(b.cat));
      case 'count-desc':
        return list.sort((a, b) => b.count - a.count);
      default:
        return list;
    }
  }, [byCategory, totalGastos, searchTerm, sortBy]);

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
              Análise de Despesas
            </p>
            <h1 className="text-title-1" style={{ textTransform: 'capitalize' }}>
              Categorias &bull; {monthKeyToLabel(selectedMonth)}
            </h1>
          </div>
        </div>

        {/* Month Selector Carousel (White cards) */}
        <div style={{ marginBottom: 24 }}>
          <MonthSelector />
        </div>

        {/* KPIs Ribbon */}
        <div className="stat-grid stagger" style={{ marginBottom: 24 }}>
          <StatCard
            icon={<Receipt size={18} />}
            label="Total de Gastos"
            value={totalGastos}
            delay={0}
          />
          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue)', marginBottom: 8 }}>
              <BarChart2 size={18} />
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Maior Macro</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topMacro.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatCurrency(topMacro.amount)} ({topMacro.pct.toFixed(1)}%)
            </div>
          </GlassCard>

          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)', marginBottom: 8 }}>
              <Sparkles size={18} />
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Maior Micro-Gasto</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topMicro.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatCurrency(topMicro.amount)} &bull; {topMicro.macro}
            </div>
          </GlassCard>

          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--purple)', marginBottom: 8 }}>
              <TrendingDown size={18} />
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Ticket Médio</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatCurrency(ticketMedio)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {totalItems} {totalItems === 1 ? 'gasto registrado' : 'gastos registrados'}
            </div>
          </GlassCard>
        </div>

        {/* ── Painel de Gráficos Analíticos Detalhados ── */}
        <CategoryCharts
          transactions={transactions}
          allMonthsData={allMonthsByCategory}
          selectedMonth={selectedMonth}
        />

        {/* ── Seção de Detalhamento por Cards de Categoria ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Abertura por Categoria
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
              Visualização detalhada de cada macro com subcategorias e tendências
            </p>
          </div>

          <div className="category-filter-bar">
            {/* Input de Busca */}
            <div className="category-search-input" style={{ position: 'relative', width: 200, minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 10,
                  border: '1px solid var(--separator)',
                  background: 'var(--surface)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>

            {/* Ordenação */}
            <div className="category-sort-group" style={{
              display: 'flex',
              background: 'var(--bg-2, #E5E5EA)',
              padding: 3,
              borderRadius: 8,
              gap: 2,
            }}>
              <button
                type="button"
                onClick={() => setSortBy('total-desc')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: sortBy === 'total-desc' ? 'var(--surface)' : 'transparent',
                  color: sortBy === 'total-desc' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
                title="Maior valor primeiro"
              >
                Maior valor
              </button>
              <button
                type="button"
                onClick={() => setSortBy('count-desc')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: sortBy === 'count-desc' ? 'var(--surface)' : 'transparent',
                  color: sortBy === 'count-desc' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
                title="Mais transações primeiro"
              >
                Qtd itens
              </button>
              <button
                type="button"
                onClick={() => setSortBy('name-asc')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: sortBy === 'name-asc' ? 'var(--surface)' : 'transparent',
                  color: sortBy === 'name-asc' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
                title="Ordem alfabética"
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Category Cards Grid */}
        <div className="category-cards-grid">
          {sortedCategories.map(({ cat, total, count, pct, micros }, i) => {
            const cfg = getCategoryConfig(cat);
            const sortedMicros = Object.entries(micros).sort((a, b) => b[1] - a[1]);

            return (
              <GlassCard
                key={cat}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms`, minWidth: 0 }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: cfg.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      boxShadow: `0 4px 10px ${cfg.bgColor}`,
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
                    <div style={{ fontWeight: 700, fontSize: 16, color: cfg.color, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                      {formatCurrency(total)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, whiteSpace: 'nowrap' }}>
                      {(pct * 100).toFixed(1)}% do total
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(pct * 100, 100)}%`, background: cfg.color }}
                  />
                </div>

                {/* Histórico mini-sparkline */}
                <div style={{ display: 'flex', gap: 3, marginTop: 12, alignItems: 'flex-end', height: 28, minWidth: 0 }}>
                  {allMonthsByCategory.map(({ monthKey, byCat }) => {
                    const maxInCat = Math.max(...allMonthsByCategory.map((m) => m.byCat[cat] ?? 0), 1);
                    const val = byCat[cat] ?? 0;
                    const height = (val / maxInCat) * 100;
                    const isSelected = monthKey === selectedMonth;
                    return (
                      <button
                        key={monthKey}
                        type="button"
                        onClick={() => setSelectedMonth(monthKey)}
                        style={{
                          flex: 1,
                          minWidth: 4,
                          padding: 0,
                          height: `${Math.max(height, 6)}%`,
                          minHeight: 4,
                          background: isSelected ? cfg.color : cfg.bgColor,
                          borderRadius: 3,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        title={`${monthKey}: ${formatCurrency(val)}`}
                      />
                    );
                  })}
                </div>

                {/* Abertura das micro-categorias */}
                {sortedMicros.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--separator)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Micro-categorias
                    </div>
                    {sortedMicros.map(([subName, subAmt], mIdx) => {
                      const isLastMicro = mIdx === sortedMicros.length - 1;
                      const subPct = total > 0 ? (subAmt / total) * 100 : 0;
                      return (
                        <div key={subName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, gap: 8, minWidth: 0 }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <span style={{ color: 'var(--text-quaternary)', fontFamily: 'monospace', fontSize: 11, flexShrink: 0 }}>
                              {isLastMicro ? '└──' : '├──'}
                            </span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {subName}
                            </span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(subAmt)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                              ({subPct.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>

        {sortedCategories.length === 0 && (
          <GlassCard>
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text-tertiary)' }}><Inbox size={48} strokeWidth={1.5} /></div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Nenhuma categoria encontrada</div>
              <div style={{ fontSize: 15, marginTop: 4 }}>
                {searchTerm ? 'Tente buscar com outro termo.' : 'Adicione transações para ver o breakdown de gastos.'}
              </div>
            </div>
          </GlassCard>
        )}
      </main>
    </>
  );
}
