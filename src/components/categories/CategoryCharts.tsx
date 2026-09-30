'use client';

import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { formatCurrency } from '@/lib/currency';
import { CATEGORY_CONFIG, getCategoryConfig } from '@/lib/categories';
import { PieChart, TrendingUp, Layers, BarChart3, ChevronRight, Sparkles } from 'lucide-react';
import type { Transaction } from '@/lib/types';

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
  const [activeTab, setActiveTab] = useState<'donut' | 'micros' | 'tree' | 'history'>('donut');
  const [hoveredMacro, setHoveredMacro] = useState<string | null>(null);

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

  // Coordenadas para o SVG Donut
  let cumulativeAngle = 0;
  const donutSlices = sortedMacros.map((item) => {
    const angle = item.pct * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const r = 40;
    const cx = 50;
    const cy = 50;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const pathData =
      angle >= 359.99
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      pathData,
      startAngle,
      endAngle,
    };
  });

  return (
    <GlassCard style={{ marginBottom: 24, padding: 20 }}>
      {/* Abas Superiores do Painel de Análises */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid var(--separator)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'var(--blue-light)',
            color: 'var(--blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <PieChart size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              Análise Avançada de Gastos
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
              Composição macro, micro e evolução temporal
            </p>
          </div>
        </div>

        {/* Botoes de visualizacao */}
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
          <button
            type="button"
            onClick={() => setActiveTab('donut')}
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
              background: activeTab === 'donut' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'donut' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'donut' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <PieChart size={14} />
            Distribuição
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('micros')}
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
              background: activeTab === 'micros' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'micros' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'micros' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={14} />
            Top Micros
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tree')}
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
              background: activeTab === 'tree' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'tree' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'tree' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={14} />
            Macro › Micro
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
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
              background: activeTab === 'history' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart3 size={14} />
            Evolução
          </button>
        </div>
      </div>

      {/* ── ABA 1: ROSCA DE DISTRIBUIÇÃO MACRO ── */}
      {activeTab === 'donut' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 24, alignItems: 'center' }}>
          {/* Donut SVG */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%', minWidth: 0 }}>
            <div style={{ width: 'min(220px, 68vw)', height: 'min(220px, 68vw)', position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {donutSlices.map((slice) => {
                  const isHovered = hoveredMacro === slice.cat;
                  return (
                    <path
                      key={slice.cat}
                      d={slice.pathData}
                      fill={slice.config.color}
                      opacity={hoveredMacro && !isHovered ? 0.4 : 1}
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                      style={{
                        cursor: 'pointer',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        transformOrigin: '50% 50%',
                        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      }}
                      onMouseEnter={() => setHoveredMacro(slice.cat)}
                      onMouseLeave={() => setHoveredMacro(null)}
                    />
                  );
                })}
                {/* Buraco do Donut (Apple Style Glass Center) */}
                <circle cx="50" cy="50" r="26" fill="var(--surface)" />
              </svg>

              {/* Informação no Centro do Donut */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  {hoveredMacro || 'Total'}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
                  {hoveredMacro
                    ? formatCurrency(macroMap[hoveredMacro]?.total || 0)
                    : formatCurrency(totalGastos)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>
                  {hoveredMacro
                    ? `${((macroMap[hoveredMacro]?.total || 0) / totalGastos * 100).toFixed(1)}%`
                    : `${sortedMacros.length} categorias`}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Passe o mouse sobre as fatias para inspecionar
            </p>
          </div>

          {/* Ranking com Barras Horizontais das Macros */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 0 }}>
            {sortedMacros.map((item) => {
              const isHovered = hoveredMacro === item.cat;
              return (
                <div
                  key={item.cat}
                  onMouseEnter={() => setHoveredMacro(item.cat)}
                  onMouseLeave={() => setHoveredMacro(null)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: isHovered ? item.config.bgColor : 'transparent',
                    border: isHovered ? `1px solid ${item.config.color}40` : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: item.config.color,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.cat}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        ({item.count} {item.count === 1 ? 'item' : 'itens'})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.config.color, whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.total)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 38, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {(item.pct * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Barra proporcional */}
                  <div className="progress-bar-track" style={{ height: 6 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(item.pct * 100, 100)}%`,
                        background: item.config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA 2: TOP 10 MAIORES MICRO-GASTOS ── */}
      {activeTab === 'micros' && (
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Ranking dos destinos específicos onde o seu dinheiro mais foi utilizado neste mês:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            {sortedMicros.slice(0, 10).map((micro, idx) => {
              const maxMicro = sortedMicros[0]?.total || 1;
              const barRelativePct = (micro.total / maxMicro) * 100;
              return (
                <div
                  key={`${micro.macro}-${micro.microName}-${idx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--separator)',
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 180px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-tertiary)',
                        width: 20,
                        flexShrink: 0,
                      }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {micro.microName}
                      </span>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: micro.config.bgColor,
                        color: micro.config.color,
                        fontWeight: 600,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}>
                        {micro.macro}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(micro.total)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ({(micro.pct * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Barra horizontal de proporção */}
                  <div className="progress-bar-track" style={{ height: 6 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(barRelativePct, 100)}%`,
                        background: micro.config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA 3: MATRIZ HIERÁRQUICA MACRO › MICRO ── */}
      {activeTab === 'tree' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Detalhamento da participação interna de cada micro-categoria dentro de suas respectivas macros:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
            {sortedMacros.map((macro) => {
              const sortedInternalMicros = Object.entries(macro.micros).sort((a, b) => b[1] - a[1]);
              return (
                <div
                  key={macro.cat}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--separator)',
                    borderRadius: 14,
                    padding: 16,
                    minWidth: 0,
                  }}
                >
                  {/* Macro Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: macro.config.color,
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <macro.config.icon size={16} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {macro.cat}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: macro.config.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {formatCurrency(macro.total)}
                    </span>
                  </div>

                  {/* Micros list with internal share bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                    {sortedInternalMicros.map(([subName, subVal]) => {
                      const internalPct = macro.total > 0 ? (subVal / macro.total) * 100 : 0;
                      return (
                        <div key={subName} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, gap: 8, minWidth: 0 }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                              {subName}
                            </span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {formatCurrency(subVal)}
                              </span>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                ({internalPct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="progress-bar-track" style={{ height: 4 }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${Math.min(internalPct, 100)}%`,
                                background: macro.config.color,
                                opacity: 0.85,
                              }}
                            />
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

      {/* ── ABA 4: EVOLUÇÃO COMPARATIVA MENSAL ── */}
      {activeTab === 'history' && (
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Comparativo de gastos das principais categorias ao longo dos últimos meses:
            </p>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 420 }}>
              {sortedMacros.slice(0, 6).map((macro) => {
                const maxValAllMonths = Math.max(
                  ...allMonthsData.map((m) => m.byCat[macro.cat] ?? 0),
                  1
                );

                return (
                  <div
                    key={macro.cat}
                    style={{
                      padding: 12,
                      background: 'var(--surface)',
                      borderRadius: 12,
                      border: '1px solid var(--separator)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: macro.config.color,
                        }} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{macro.cat}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: macro.config.color }}>
                        Mês Atual: {formatCurrency(macro.total)}
                      </span>
                    </div>

                    {/* Linha com barras por mês */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 48 }}>
                      {allMonthsData.slice(-8).map((m) => {
                        const val = m.byCat[macro.cat] ?? 0;
                        const heightPct = (val / maxValAllMonths) * 100;
                        const isCurrent = m.monthKey === selectedMonth;

                        const [yr, mo] = m.monthKey.split('-');
                        const d = new Date(Number(yr), Number(mo) - 1, 1);
                        const labelShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

                        return (
                          <div
                            key={m.monthKey}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                              {val > 0 ? (val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)) : ''}
                            </span>
                            <div
                              style={{
                                width: '100%',
                                height: `${Math.max(heightPct, 6)}%`,
                                borderRadius: 4,
                                background: isCurrent ? macro.config.color : `${macro.config.color}55`,
                                border: isCurrent ? `1.5px solid ${macro.config.color}` : 'none',
                                transition: 'all 0.2s ease',
                              }}
                              title={`${m.monthKey}: ${formatCurrency(val)}`}
                            />
                            <span style={{
                              fontSize: 10,
                              fontWeight: isCurrent ? 700 : 500,
                              color: isCurrent ? 'var(--blue)' : 'var(--text-tertiary)',
                              marginTop: 4,
                              textTransform: 'capitalize',
                            }}>
                              {labelShort}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
