'use client';

import { useMemo, useState } from 'react';
import { Inbox, BarChart2, TrendingDown, Sparkles, Receipt, Search, LayoutGrid } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import CategoryCharts from '@/components/categories/CategoryCharts';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { groupByCategory } from '@/lib/taxonomy';
import { useCategorySpending } from '@/hooks/useCategorySpending';

type SortOption = 'total-desc' | 'count-desc' | 'name-asc';

const SORT_OPTIONS: { id: SortOption; label: string; title: string }[] = [
  { id: 'total-desc', label: 'Maior valor', title: 'Maior valor primeiro' },
  { id: 'count-desc', label: 'Qtd itens', title: 'Mais transações primeiro' },
  { id: 'name-asc', label: 'A-Z', title: 'Ordem alfabética' },
];

/**
 * Categorias no modo detalhado: KPIs, gráficos analíticos e a abertura
 * Macro › Micro de cada categoria, com busca e ordenação.
 */
export default function CategoriesDetailedView() {
  const { setSelectedMonth } = useFinanceStore();
  const { taxonomy, selectedMonth, transactions, total: totalGastos, monthly } = useCategorySpending();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('total-desc');

  const groups = useMemo(
    () => groupByCategory(transactions, { fallbackSubcategory: 'Geral' }),
    [transactions],
  );

  // ── KPIs ──
  const totalItems = transactions.length;
  const ticketMedio = totalItems > 0 ? totalGastos / totalItems : 0;

  const topMacro = groups[0]
    ? { name: groups[0].category, amount: groups[0].total, pct: totalGastos > 0 ? (groups[0].total / totalGastos) * 100 : 0 }
    : { name: '-', amount: 0, pct: 0 };

  let topMicro = { name: '-', macro: '-', amount: 0 };
  for (const group of groups) {
    for (const [sub, amount] of Object.entries(group.subcategories)) {
      if (amount > topMicro.amount) topMicro = { name: sub, macro: group.category, amount };
    }
  }

  // ── Abertura por categoria (busca + ordenação) ──
  const sortedCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = groups.filter((g) =>
      !term
      || g.category.toLowerCase().includes(term)
      || Object.keys(g.subcategories).some((sub) => sub.toLowerCase().includes(term)),
    );

    switch (sortBy) {
      case 'count-desc':
        return [...list].sort((a, b) => b.count - a.count);
      case 'name-asc':
        return [...list].sort((a, b) => a.category.localeCompare(b.category));
      default:
        return list; // groupByCategory já ordena por total
    }
  }, [groups, searchTerm, sortBy]);

  return (
    <>
      {/* KPIs */}
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

      {/* Gráficos analíticos */}
      <CategoryCharts
        transactions={transactions}
        allMonthsData={monthly}
        selectedMonth={selectedMonth}
      />

      {/* Abertura por categoria */}
      <SectionCard
        icon={LayoutGrid}
        title="Abertura por Categoria"
        description="Visualização detalhada de cada macro com subcategorias e tendências"
        actions={
          <div className="category-filter-bar">
            <div className="category-search-input" style={{ position: 'relative', width: 200, minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 10,
                  border: '1px solid var(--separator)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>

            <div className="category-sort-group">
              {SORT_OPTIONS.map((opt) => {
                const isActive = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    title={opt.title}
                    aria-pressed={isActive}
                    // mesmo visual das abas da Análise Avançada (selecionado na cor do usuário)
                    className={`segmented-tab ${isActive ? 'active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
      >
        <div className="category-cards-grid">
          {sortedCategories.map(({ category: cat, total, count, subcategories }, i) => {
            const cfg = taxonomy.getConfig(cat);
            const pct = totalGastos > 0 ? total / totalGastos : 0;
            const sortedMicros = Object.entries(subcategories).sort((a, b) => b[1] - a[1]);
            const maxInCat = Math.max(...monthly.map((m) => m.byCat[cat] ?? 0), 1);

            return (
              // dentro do SectionCard: contorno sutil em vez de outro card branco
              <div
                key={cat}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${i * 40}ms`,
                  minWidth: 0,
                  padding: 16,
                  border: '1px solid var(--separator-subtle)',
                  borderRadius: 'var(--radius-lg)',
                }}
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
                  {monthly.map(({ monthKey, byCat }) => {
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

                {/* Micro-categorias em árvore */}
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
              </div>
            );
          })}
        </div>

        {sortedCategories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text-tertiary)' }}><Inbox size={48} strokeWidth={1.5} /></div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Nenhuma categoria encontrada</div>
            <div style={{ fontSize: 15, marginTop: 4 }}>
              {searchTerm ? 'Tente buscar com outro termo.' : 'Adicione transações para ver o breakdown de gastos.'}
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}
