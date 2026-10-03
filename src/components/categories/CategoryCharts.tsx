'use client';

import React, { useState } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { CategoryDistribution, CategoryRanking, MacroMicroGroups } from '@/components/charts/CategoryBreakdown';
import { formatCurrency } from '@/lib/currency';
import { getCategoryConfig } from '@/lib/detailedCategories';
import { PieChart, Layers, BarChart3, Sparkles } from 'lucide-react';
import type { Transaction } from '@/lib/types';

const TABS = [
  { id: 'donut', label: 'Distribuição', icon: PieChart },
  { id: 'micros', label: 'Top Micros', icon: Sparkles },
  { id: 'tree', label: 'Macro › Micro', icon: Layers },
  { id: 'history', label: 'Evolução', icon: BarChart3 },
] as const;

type ChartTab = (typeof TABS)[number]['id'];

/** Meses exibidos na aba Evolução */
const HISTORY_MONTHS = 8;

const formatItems = (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`;

/** `2026-10` → `out` */
function monthShortLabel(monthKey: string): string {
  const [yr, mo] = monthKey.split('-');
  return new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

interface CategoryChartsProps {
  transactions: Transaction[];
  allMonthsData: { monthKey: string; byCat: Record<string, number> }[];
  selectedMonth: string;
}

export default function CategoryCharts({
  transactions,
  allMonthsData,
  selectedMonth,
}: CategoryChartsProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('donut');

  // ── 1. Agrupamento Macro ───────────────────────────────────────────────
  const macroMap: Record<string, { total: number; count: number; micros: Record<string, number> }> = {};
  
  transactions
    .filter(t => t.transactionType !== 'transfer' && t.category !== 'Transferências' && t.transactionType !== 'income')
    .forEach((t) => {
      const cat = t.category || 'Outros';
      if (!macroMap[cat]) macroMap[cat] = { total: 0, count: 0, micros: {} };
      macroMap[cat].total += t.amount;
      macroMap[cat].count += 1;
      
      const sub = (t.subcategory && t.subcategory.trim()) || 'Geral / Não especificado';
      macroMap[cat].micros[sub] = (macroMap[cat].micros[sub] || 0) + t.amount;
    });

  const totalGastos = Object.values(macroMap).reduce((s, v) => s + v.total, 0);

  const sortedMacros = Object.entries(macroMap)
    .map(([cat, data]) => ({
      cat,
      total: data.total,
      count: data.count,
      pct: totalGastos > 0 ? data.total / totalGastos : 0,
      micros: data.micros,
      config: getCategoryConfig(cat),
    }))
    .sort((a, b) => b.total - a.total);

  // ── 2. Ranking Global de Micro-Gastos ──────────────────────────────────
  const globalMicrosMap: Record<string, { macro: string; total: number; count: number }> = {};
  transactions
    .filter(t => t.transactionType !== 'transfer' && t.category !== 'Transferências' && t.transactionType !== 'income')
    .forEach((t) => {
      const cat = t.category || 'Outros';
      const sub = (t.subcategory && t.subcategory.trim()) || `Geral (${cat})`;
      const key = `${cat}___${sub}`;
      if (!globalMicrosMap[key]) {
        globalMicrosMap[key] = { macro: cat, total: 0, count: 0 };
      }
      globalMicrosMap[key].total += t.amount;
      globalMicrosMap[key].count += 1;
    });

  const sortedMicros = Object.entries(globalMicrosMap)
    .map(([key, data]) => {
      const [_, microName] = key.split('___');
      return {
        microName,
        macro: data.macro,
        total: data.total,
        count: data.count,
        pct: totalGastos > 0 ? data.total / totalGastos : 0,
        config: getCategoryConfig(data.macro),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Se não houver gastos
  if (totalGastos === 0) {
    return null;
  }

  return (
    <SectionCard
      icon={PieChart}
      title="Análise Avançada de Gastos"
      description="Composição macro, micro e evolução temporal"
      style={{ marginBottom: 24 }}
      actions={<SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />}
    >
      {/* ── ABA 1: DISTRIBUIÇÃO MACRO (anel arredondado + lista estilo iOS) ── */}
      {activeTab === 'donut' && (
        <CategoryDistribution
          items={sortedMacros}
          total={totalGastos}
          totalLabel="Total gasto"
          formatCount={formatItems}
        />
      )}

      {/* ── ABA 2: TOP 10 MAIORES MICRO-GASTOS ── */}
      {activeTab === 'micros' && (
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 4px 8px' }}>
            Onde seu dinheiro mais foi neste mês
          </p>
          <CategoryRanking
            entries={sortedMicros.slice(0, 10).map((micro) => ({
              key: `${micro.macro}-${micro.microName}`,
              name: micro.microName,
              detail: micro.macro,
              total: micro.total,
              pct: micro.pct,
              config: micro.config,
            }))}
          />
        </div>
      )}

      {/* ── ABA 3: MATRIZ HIERÁRQUICA MACRO › MICRO ── */}
      {activeTab === 'tree' && (
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px 8px' }}>
            Como cada categoria se divide por dentro
          </p>
          <MacroMicroGroups
            groups={sortedMacros.map((macro) => ({
              ...macro,
              micros: Object.entries(macro.micros).sort((a, b) => b[1] - a[1]),
            }))}
            formatCount={formatItems}
            shareLabel="do mês"
          />
        </div>
      )}

      {/* ── ABA 4: EVOLUÇÃO MENSAL (barras como no Tempo de Uso / app Saúde) ── */}
      {activeTab === 'history' && (
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px 8px' }}>
            Últimos meses das suas maiores categorias
          </p>

          {/* Uma categoria por linha, ocupando toda a largura */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedMacros.slice(0, 6).map((macro) => {
              const months = allMonthsData.slice(-HISTORY_MONTHS);
              const values = months.map((m) => m.byCat[macro.cat] ?? 0);
              // escala só pelos meses exibidos
              const maxVal = Math.max(...values, 1);
              const average = values.reduce((sum, v) => sum + v, 0) / Math.max(values.length, 1);

              return (
                <div
                  key={macro.cat}
                  style={{
                    border: '1px solid var(--separator-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                    minWidth: 0,
                  }}
                >
                  {/* Cabeçalho: valor do mês em destaque, média como referência */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, minWidth: 0 }}>
                    <div
                      className="transaction-icon"
                      style={{ background: macro.config.color, color: '#FFF', width: 28, height: 28, borderRadius: 8 }}
                    >
                      <macro.config.icon size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {macro.cat}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1, whiteSpace: 'nowrap' }}>
                        Média {formatCurrency(average)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(macro.total)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        neste mês
                      </div>
                    </div>
                  </div>

                  {/* Barras: mês selecionado na cor da categoria, os demais em cinza, média tracejada */}
                  <div style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'flex-end', height: 72 }}>
                    {months.length > 1 && average > 0 && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: `${(average / maxVal) * 100}%`,
                          borderTop: '1px dashed var(--text-quaternary)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {months.map((m, i) => {
                      const val = values[i];
                      const isCurrent = m.monthKey === selectedMonth;
                      return (
                        <div
                          key={m.monthKey}
                          title={`${monthShortLabel(m.monthKey)}: ${formatCurrency(val)}`}
                          style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                        >
                          <div style={{
                            width: '100%',
                            maxWidth: 36,
                            // mês sem gasto vira só um traço na base
                            height: val > 0 ? `${Math.max((val / maxVal) * 100, 4)}%` : 2,
                            borderRadius: '4px 4px 0 0',
                            background: isCurrent ? macro.config.color : 'var(--bg-2)',
                            transition: 'height 0.3s ease',
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Meses */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {months.map((m) => {
                      const isCurrent = m.monthKey === selectedMonth;
                      return (
                        <span
                          key={m.monthKey}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: 11,
                            fontWeight: isCurrent ? 600 : 400,
                            color: isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {monthShortLabel(m.monthKey)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
