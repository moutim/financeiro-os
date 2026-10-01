'use client';

import React, { useState } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import { buildRingSegments } from '@/lib/donut';
import { formatCurrency } from '@/lib/currency';
import { getCategoryConfig } from '@/lib/detailedCategories';
import { PieChart, Layers, BarChart3, Sparkles, ChevronDown } from 'lucide-react';
import type { Transaction } from '@/lib/types';

const TABS = [
  { id: 'donut', label: 'Distribuição', icon: PieChart },
  { id: 'micros', label: 'Top Micros', icon: Sparkles },
  { id: 'tree', label: 'Macro › Micro', icon: Layers },
  { id: 'history', label: 'Evolução', icon: BarChart3 },
] as const;

type ChartTab = (typeof TABS)[number]['id'];

// Anel da aba Distribuição (unidades do viewBox 100×100)
const RING_RADIUS = 44;
const RING_WIDTH = 7;
const RING_GAP = 0.6;
/** Categorias visíveis na lista antes do "Ver todas" */
const COLLAPSED_MACROS = 6;
/** Meses exibidos na aba Evolução */
const HISTORY_MONTHS = 8;

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
  const [hoveredMacro, setHoveredMacro] = useState<string | null>(null);
  const [showAllMacros, setShowAllMacros] = useState(false);

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

  const ringSegments = buildRingSegments(sortedMacros, (item) => item.pct, { radius: RING_RADIUS, gap: RING_GAP });
  // Só recolhe a lista quando sobram pelo menos 2 categorias escondidas
  const canCollapse = sortedMacros.length > COLLAPSED_MACROS + 1;
  const listedMacros = canCollapse && !showAllMacros ? sortedMacros.slice(0, COLLAPSED_MACROS) : sortedMacros;
  const hovered = hoveredMacro ? sortedMacros.find((m) => m.cat === hoveredMacro) : undefined;

  return (
    <SectionCard
      icon={PieChart}
      title="Análise Avançada de Gastos"
      description="Composição macro, micro e evolução temporal"
      style={{ marginBottom: 24 }}
      actions={
        // Abas de visualização: a selecionada usa a cor do usuário, como o seletor Saída/Entrada
        <div style={{
          display: 'flex',
          background: 'var(--bg-2, #E5E5EA)',
          padding: 3,
          borderRadius: 10,
          gap: 3,
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-pressed={isActive}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  background: isActive ? 'var(--blue)' : 'transparent',
                  color: isActive ? '#FFF' : 'var(--text-tertiary)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      }
    >
      {/* ── ABA 1: DISTRIBUIÇÃO MACRO (anel fino + lista estilo iOS) ── */}
      {activeTab === 'donut' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 32, alignItems: 'center' }}>
          {/* Anel: a cor das categorias fica só aqui e nos ícones da lista */}
          <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ width: '100%', maxWidth: 300, aspectRatio: '1 / 1', position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                {ringSegments.map((segment) => {
                  const isHovered = hoveredMacro === segment.cat;
                  return (
                    <circle
                      key={segment.cat}
                      cx="50"
                      cy="50"
                      r={RING_RADIUS}
                      fill="none"
                      stroke={segment.config.color}
                      strokeWidth={isHovered ? RING_WIDTH + 2 : RING_WIDTH}
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.dashOffset}
                      transform="rotate(-90 50 50)"
                      opacity={hoveredMacro && !isHovered ? 0.3 : 1}
                      style={{ cursor: 'pointer', transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
                      onMouseEnter={() => setHoveredMacro(segment.cat)}
                      onMouseLeave={() => setHoveredMacro(null)}
                    />
                  );
                })}
              </svg>

              {/* Centro: total do mês, ou a categoria em foco */}
              <div style={{
                position: 'absolute',
                inset: '18%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                pointerEvents: 'none',
                minWidth: 0,
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hovered ? hovered.cat : 'Total gasto'}
                </span>
                <span style={{ fontSize: 'clamp(22px, 7vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatCurrency(hovered ? hovered.total : totalGastos)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {hovered
                    ? `${(hovered.pct * 100).toFixed(1)}% do total`
                    : `${sortedMacros.length} ${sortedMacros.length === 1 ? 'categoria' : 'categorias'}`}
                </span>
              </div>
            </div>
          </div>

          {/* Lista no estilo iOS: ícone, nome e valor em texto neutro, separadores finos */}
          <div style={{ minWidth: 0 }}>
            {listedMacros.map((item, index) => {
              const isHovered = hoveredMacro === item.cat;
              const isLast = index === listedMacros.length - 1;
              return (
                <div
                  key={item.cat}
                  onMouseEnter={() => setHoveredMacro(item.cat)}
                  onMouseLeave={() => setHoveredMacro(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 8px',
                    borderRadius: 12,
                    background: isHovered ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'transparent',
                    cursor: 'default',
                    transition: 'background 0.15s ease',
                    minWidth: 0,
                  }}
                >
                  {/* Mesmo ícone da lista de transações do dashboard */}
                  <div
                    className="transaction-icon"
                    style={{ background: item.config.color, color: '#FFF', width: 28, height: 28, borderRadius: 8 }}
                  >
                    <item.config.icon size={14} />
                  </div>

                  {/* Separador começa depois do ícone, como nas listas do iOS */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--separator)',
                    minWidth: 0,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.cat}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {item.count} {item.count === 1 ? 'item' : 'itens'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.total)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {(item.pct * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {canCollapse && (
              <button
                type="button"
                onClick={() => setShowAllMacros((v) => !v)}
                aria-expanded={showAllMacros}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 8,
                  padding: '6px 8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--blue)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showAllMacros ? 'Mostrar menos' : `Ver todas (${sortedMacros.length})`}
                <ChevronDown
                  size={15}
                  style={{ transform: showAllMacros ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ABA 2: TOP 10 MAIORES MICRO-GASTOS (lista estilo iOS, como no ranking do Tempo de Uso) ── */}
      {activeTab === 'micros' && (
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 4px 8px' }}>
            Onde seu dinheiro mais foi neste mês
          </p>

          {sortedMicros.slice(0, 10).map((micro, idx, topMicros) => {
            const maxMicro = topMicros[0]?.total || 1;
            const barRelativePct = (micro.total / maxMicro) * 100;
            const isLast = idx === topMicros.length - 1;
            return (
              <div
                key={`${micro.macro}-${micro.microName}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px', minWidth: 0 }}
              >
                <span style={{
                  width: 18,
                  flexShrink: 0,
                  textAlign: 'right',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {idx + 1}
                </span>

                {/* Mesmo ícone da lista de transações do dashboard */}
                <div
                  className="transaction-icon"
                  style={{ background: micro.config.color, color: '#FFF', width: 28, height: 28, borderRadius: 8 }}
                >
                  <micro.config.icon size={14} />
                </div>

                {/* Separador começa depois do ícone, como nas listas do iOS */}
                <div style={{
                  flex: 1,
                  padding: '10px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--separator)',
                  minWidth: 0,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {micro.microName}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 2 }}>
                        {micro.macro}
                      </span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(micro.total)}
                    </span>
                  </div>

                  {/* Barra fina relativa ao maior gasto + % do total do mês */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <div className="progress-bar-track" style={{ flex: 1, height: 4 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(barRelativePct, 100)}%`,
                          background: micro.config.color,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 40, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {(micro.pct * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA 3: MATRIZ HIERÁRQUICA MACRO › MICRO ── */}
      {activeTab === 'tree' && (
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px 8px' }}>
            Como cada categoria se divide por dentro
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
            {sortedMacros.map((macro) => {
              const sortedInternalMicros = Object.entries(macro.micros).sort((a, b) => b[1] - a[1]);
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
                  {/* Cabeçalho da macro: mesmo ícone das transações, texto neutro */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, minWidth: 0 }}>
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
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {macro.count} {macro.count === 1 ? 'item' : 'itens'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(macro.total)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {(macro.pct * 100).toFixed(1)}% do mês
                      </div>
                    </div>
                  </div>

                  {/* Micros alinhadas ao texto do cabeçalho, com a fatia de cada uma dentro da macro */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 38, minWidth: 0 }}>
                    {sortedInternalMicros.map(([subName, subVal]) => {
                      const internalPct = macro.total > 0 ? (subVal / macro.total) * 100 : 0;
                      return (
                        <div key={subName} style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                              {subName}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(subVal)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
                            <div className="progress-bar-track" style={{ flex: 1, height: 4 }}>
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min(internalPct, 100)}%`, background: macro.config.color }}
                              />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 32, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                              {internalPct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
