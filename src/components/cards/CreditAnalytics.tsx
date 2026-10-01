'use client';

import React, { useState } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import { buildDonutSlices } from '@/lib/donut';
import { formatCurrency } from '@/lib/currency';
import { useCategoryTaxonomy } from '@/lib/taxonomy';
import {
  Wallet,
  AlertCircle,
  TrendingDown,
  PieChart,
  BarChart3,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { Transaction } from '@/lib/types';

interface CardWithRealData {
  id: string;
  name: string;
  limit: number;
  used: number;
  realUsed: number;
  currentInvoiceAmount: number;
  unpaidCurrentMonth: Transaction[];
  color: string;
  brand: string;
  priority?: number | null;
  bankId?: string | null;
}

interface CreditAnalyticsProps {
  cards: CardWithRealData[];
  salary: number;
  transactions: Transaction[];
  selectedMonth: string;
}

export default function CreditAnalytics({
  cards,
  salary,
  transactions,
  selectedMonth,
}: CreditAnalyticsProps) {
  const [categoryTab, setCategoryTab] = useState<'donut' | 'bars' | 'micro'>('donut');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const taxonomy = useCategoryTaxonomy();
  const getCategoryConfig = taxonomy.getConfig;

  // Cálculos globais
  const totalUsed = cards.reduce((sum, c) => sum + c.realUsed, 0);
  const totalMonthInvoices = cards.reduce((sum, c) => sum + c.currentInvoiceAmount, 0);

  // Comprometimento com o Salário
  const invoiceSalaryPct = salary > 0 ? (totalMonthInvoices / salary) * 100 : 0;
  const totalDebtSalaryPct = salary > 0 ? (totalUsed / salary) * 100 : 0;

  // Gastos no Crédito por Categoria Macro e Micro
  const creditTxs = transactions
    .filter((t) => t.monthKey === selectedMonth && t.cardId && (!t.parentId || t.parentId === 'SHARED'))
    .map(taxonomy.normalize);

  const creditMacroMap: Record<string, { total: number; count: number; micros: Record<string, { total: number; count: number }> }> = {};
  creditTxs.forEach((t) => {
    const cat = t.category || 'Outros';
    if (!creditMacroMap[cat]) {
      creditMacroMap[cat] = { total: 0, count: 0, micros: {} };
    }
    creditMacroMap[cat].total += t.amount;
    creditMacroMap[cat].count += 1;

    const sub = (t.subcategory && t.subcategory.trim()) || `Geral (${cat})`;
    if (!creditMacroMap[cat].micros[sub]) {
      creditMacroMap[cat].micros[sub] = { total: 0, count: 0 };
    }
    creditMacroMap[cat].micros[sub].total += t.amount;
    creditMacroMap[cat].micros[sub].count += 1;
  });

  const sortedCreditCategories = Object.entries(creditMacroMap)
    .map(([cat, info]) => ({
      cat,
      total: info.total,
      count: info.count,
      pct: totalMonthInvoices > 0 ? (info.total / totalMonthInvoices) * 100 : 0,
      config: getCategoryConfig(cat),
    }))
    .sort((a, b) => b.total - a.total);

  // Coordenadas para o SVG Donut
  const donutSlices = buildDonutSlices(sortedCreditCategories, (item) => item.pct / 100);

  // Status de saúde financeira do comprometimento
  const getSalaryCommitmentBadge = () => {
    if (salary === 0) {
      return {
        label: 'Salário não informado',
        color: 'var(--text-tertiary)',
        bg: 'var(--bg-2)',
        icon: Info,
        desc: 'Cadastre suas receitas para calcular o comprometimento exato.',
      };
    }
    if (invoiceSalaryPct <= 30) {
      return {
        label: 'Comprometimento Saudável',
        color: 'var(--green)',
        bg: 'var(--green-light)',
        icon: ShieldCheck,
        desc: 'Faturas consom até 30% da sua renda. Padrão recomendado por consultores.',
      };
    }
    if (invoiceSalaryPct <= 50) {
      return {
        label: 'Comprometimento Moderado',
        color: 'var(--orange)',
        bg: 'var(--orange-light)',
        icon: AlertCircle,
        desc: 'Faturas entre 30% e 50% da renda. Monitore novas compras parceladas.',
      };
    }
    return {
      label: 'Comprometimento Elevado',
      color: 'var(--red)',
      bg: 'var(--red-light)',
      icon: ShieldAlert,
      desc: 'Faturas acima de 50% da sua renda. Risco alto de rolamento de dívida.',
    };
  };

  const statusBadge = getSalaryCommitmentBadge();
  const StatusIcon = statusBadge.icon;

  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── 1. Comprometimento da Renda (a Composição de Limite fica no topo da página) ── */}
      <SectionCard
        icon={Wallet}
        title="Impacto na Renda"
        description="Fatura do mês vs salário líquido"
        actions={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            background: statusBadge.bg,
            color: statusBadge.color,
            fontSize: 11,
            fontWeight: 700,
          }}>
            <StatusIcon size={13} />
            <span>{statusBadge.label}</span>
          </div>
        }
      >
        {/* Percentual em destaque e valores */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>COMPROMETIMENTO DA RENDA</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: statusBadge.color, letterSpacing: '-0.02em', marginTop: 2 }}>
              {salary > 0 ? `${invoiceSalaryPct.toFixed(1)}%` : '—'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FATURAS DO MÊS / SALÁRIO</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              {formatCurrency(totalMonthInvoices)} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>/ {salary > 0 ? formatCurrency(salary) : 'R$ 0'}</span>
            </div>
          </div>
        </div>

        {/* Barra de comprometimento do salário */}
        <div style={{ height: 8, borderRadius: 4, background: 'var(--separator)', overflow: 'hidden', marginBottom: 10 }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(invoiceSalaryPct, 100)}%`,
              background: statusBadge.color,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
          {statusBadge.desc}
        </p>
      </SectionCard>

      {/* ── 2. Ranking de Cartões: Peso no Salário ── */}
      <SectionCard
        icon={BarChart3}
        title="Peso de Cada Cartão no Salário"
        description="Comparativo de fatura e limites individuais"
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: 12,
        }}>
          {cards.map((card) => {
            const cardInvoicePct = salary > 0 ? (card.currentInvoiceAmount / salary) * 100 : 0;
            const cardLimitUsedPct = card.limit > 0 ? (card.realUsed / card.limit) * 100 : 0;

            return (
              <div
                key={card.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--surface)',
                  border: '1px solid var(--separator)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: card.color || 'var(--blue)',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{card.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {formatCurrency(card.currentInvoiceAmount)}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: cardInvoicePct > 25 ? 'var(--red)' : cardInvoicePct > 15 ? 'var(--orange)' : 'var(--blue)',
                    }}>
                      ({salary > 0 ? `${cardInvoicePct.toFixed(1)}%` : 'fatura'})
                    </span>
                  </div>
                </div>

                {/* Detalhes de limites do cartão */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  <span>
                    Usado: <strong>{formatCurrency(card.realUsed)}</strong> ({cardLimitUsedPct.toFixed(0)}%)
                  </span>
                  <span>
                    Livre: <strong style={{ color: 'var(--green)' }}>{formatCurrency(Math.max(0, card.limit - card.realUsed))}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── 3. Abertura Visual por Categoria no Crédito (Gráficos Ricos) ── */}
      <SectionCard
        icon={PieChart}
        title="Abertura Visual por Categoria no Cartão"
        description="Proporção gráfica, ranking comparativo e desdobramento de despesas"
        actions={
          <div style={{
            display: 'flex',
            background: 'var(--bg-2, #E5E5EA)',
            padding: 3,
            borderRadius: 10,
            gap: 4,
            maxWidth: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}>
            <button
              type="button"
              onClick={() => setCategoryTab('donut')}
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
                background: categoryTab === 'donut' ? 'var(--surface)' : 'transparent',
                color: categoryTab === 'donut' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: categoryTab === 'donut' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <PieChart size={14} />
              Rosca (Donut)
            </button>
  
            <button
              type="button"
              onClick={() => setCategoryTab('bars')}
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
                background: categoryTab === 'bars' ? 'var(--surface)' : 'transparent',
                color: categoryTab === 'bars' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: categoryTab === 'bars' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={14} />
              Ranking em Barras
            </button>
  
            <button
              type="button"
              onClick={() => setCategoryTab('micro')}
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
                background: categoryTab === 'micro' ? 'var(--surface)' : 'transparent',
                color: categoryTab === 'micro' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: categoryTab === 'micro' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={14} />
              Macro › Micro
            </button>
          </div>
        }
      >
        {sortedCreditCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-tertiary)', fontSize: 14 }}>
            Nenhuma transação de cartão registrada no mês selecionado.
          </div>
        ) : (
          <>
            {/* ── VISÃO 1: ROSCA (DONUT) COM CENTRO INFORMATIVO E LISTA COMPARATIVA ── */}
            {categoryTab === 'donut' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 32, alignItems: 'center' }}>
                {/* SVG Donut */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%', minWidth: 0 }}>
                  <div style={{ width: 'min(240px, 68vw)', height: 'min(240px, 68vw)', position: 'relative' }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      {donutSlices.map((slice) => {
                        const isHovered = hoveredCategory === slice.cat;
                        return (
                          <path
                            key={slice.cat}
                            d={slice.pathData}
                            fill={slice.config.color}
                            opacity={hoveredCategory && !isHovered ? 0.35 : 1}
                            stroke="var(--surface)"
                            strokeWidth="1.5"
                            style={{
                              cursor: 'pointer',
                              transition: 'opacity 0.2s ease, transform 0.2s ease',
                              transformOrigin: '50% 50%',
                              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                            }}
                            onMouseEnter={() => setHoveredCategory(slice.cat)}
                            onMouseLeave={() => setHoveredCategory(null)}
                          />
                        );
                      })}
                      {/* Centro recortado estilo Apple Glass */}
                      <circle cx="50" cy="50" r="27" fill="var(--surface)" />
                    </svg>

                    {/* Centro Dinâmico */}
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
                      padding: 16,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {hoveredCategory || 'Total no Cartão'}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 3 }}>
                        {hoveredCategory
                          ? formatCurrency(creditMacroMap[hoveredCategory]?.total || 0)
                          : formatCurrency(totalMonthInvoices)}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: hoveredCategory ? (getCategoryConfig(hoveredCategory)?.color || 'var(--blue)') : 'var(--blue)',
                        fontWeight: 700,
                        marginTop: 2,
                      }}>
                        {hoveredCategory
                          ? `${(((creditMacroMap[hoveredCategory]?.total || 0) / (totalMonthInvoices || 1)) * 100).toFixed(1)}% do crédito`
                          : `${sortedCreditCategories.length} categorias ativas`}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
                    Toque ou passe o cursor sobre as fatias da rosca
                  </span>
                </div>

                {/* Lista Comparativa com Proporções Visuais */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedCreditCategories.map((item) => {
                    const CatIcon = item.config.icon;
                    const isHovered = hoveredCategory === item.cat;
                    return (
                      <div
                        key={item.cat}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: isHovered ? 'var(--surface-hover, rgba(0,0,0,0.03))' : 'transparent',
                          border: isHovered ? `1px solid ${item.config.color}` : '1px solid transparent',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => setHoveredCategory(item.cat)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: item.config.bgColor || `${item.config.color}20`,
                              color: item.config.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <CatIcon size={15} />
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                                {item.cat}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                                {item.count} compra{item.count > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                              {formatCurrency(item.total)}
                            </span>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: item.config.color,
                              background: item.config.bgColor || `${item.config.color}15`,
                              padding: '2px 6px',
                              borderRadius: 6,
                            }}>
                              {item.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div style={{ height: 6, borderRadius: 3, background: 'var(--separator)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(item.pct, 100)}%`,
                              background: item.config.color,
                              borderRadius: 3,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── VISÃO 2: RANKING EM BARRAS HORIZONTAIS ── */}
            {categoryTab === 'bars' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
                {sortedCreditCategories.map((item) => {
                  const CatIcon = item.config.icon;
                  const maxVal = sortedCreditCategories[0]?.total || 1;
                  const barWidthPct = (item.total / maxVal) * 100;

                  return (
                    <div key={item.cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: item.config.bgColor || `${item.config.color}20`,
                            color: item.config.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <CatIcon size={14} />
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.cat}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            • {item.count} compra{item.count > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                            {formatCurrency(item.total)}
                          </span>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: item.config.color,
                            background: item.config.bgColor || `${item.config.color}15`,
                            padding: '1px 6px',
                            borderRadius: 6,
                          }}>
                            {item.pct.toFixed(1)}% do crédito
                          </span>
                        </div>
                      </div>

                      {/* Barra Horizontal Proporcional */}
                      <div style={{
                        height: 18,
                        borderRadius: 9,
                        background: 'var(--surface)',
                        border: '1px solid var(--separator)',
                        overflow: 'hidden',
                        padding: 2,
                        position: 'relative',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${barWidthPct}%`,
                          background: `linear-gradient(90deg, ${item.config.color}90, ${item.config.color})`,
                          borderRadius: 7,
                          transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                          minWidth: 10,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── VISÃO 3: DETALHAMENTO MACRO › MICRO NO CARTÃO ── */}
            {categoryTab === 'micro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
                {sortedCreditCategories.map((macro) => {
                  const CatIcon = macro.config.icon;
                  const micros = Object.entries(creditMacroMap[macro.cat]?.micros || {})
                    .sort((a, b) => b[1].total - a[1].total);

                  return (
                    <div key={macro.cat} style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--separator)',
                      borderRadius: 14,
                      padding: '16px 20px',
                    }}>
                      {/* Macro Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: macro.config.bgColor || `${macro.config.color}20`,
                            color: macro.config.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <CatIcon size={16} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{macro.cat}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                              {macro.pct.toFixed(1)}% do crédito total
                            </span>
                          </div>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                          {formatCurrency(macro.total)}
                        </span>
                      </div>

                      {/* Micro Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 4 }}>
                        {micros.map(([microName, microData]) => {
                          const microPct = macro.total > 0 ? (microData.total / macro.total) * 100 : 0;
                          return (
                            <div key={microName} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                  ↳ {microName} ({microData.count} compra{microData.count > 1 ? 's' : ''})
                                </span>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {formatCurrency(microData.total)}
                                  </span>
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                                    ({microPct.toFixed(0)}%)
                                  </span>
                                </div>
                              </div>

                              <div style={{ height: 6, borderRadius: 3, background: 'var(--separator)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${microPct}%`,
                                  background: macro.config.color,
                                  borderRadius: 3,
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
