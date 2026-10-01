'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { buildRingSegments } from '@/lib/donut';
import { formatCurrency } from '@/lib/currency';
import type { CategoryConfig } from '@/lib/types';

/**
 * Visões de gastos por categoria no padrão do app (anel fino + listas estilo iOS).
 * Usadas pela Análise Avançada de Gastos (Categorias) e pela Abertura Visual por
 * Categoria no Cartão (Cartões), para as duas telas ficarem idênticas.
 */

export interface BreakdownCategory {
  cat: string;
  total: number;
  count: number;
  /** Fração do total (0–1) */
  pct: number;
  config: CategoryConfig;
}

// Anel da Distribuição (unidades do viewBox 100×100)
const RING_RADIUS = 44;
const RING_WIDTH = 7;
const RING_GAP = 0.6;
/** Categorias visíveis na lista antes do "Ver todas" */
const COLLAPSED_CATEGORIES = 6;

/** Mesmo ícone da lista de transações do dashboard */
function CategoryIcon({ config }: { config: CategoryConfig }) {
  return (
    <div
      className="transaction-icon"
      style={{ background: config.color, color: '#FFF', width: 28, height: 28, borderRadius: 8 }}
    >
      <config.icon size={14} />
    </div>
  );
}

// ─── Distribuição: anel fino + lista estilo iOS (ou legenda compacta) ───────

const formatItemsDefault = (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`;

interface CategoryDistributionProps {
  /** Categorias já ordenadas do maior para o menor total */
  items: BreakdownCategory[];
  total: number;
  /** Rótulo do centro do anel sem categoria em foco (ex: "Total gasto") */
  totalLabel: string;
  /** Quantidade de lançamentos de uma categoria (ex: 3 → "3 itens"); só na legenda em lista */
  formatCount?: (count: number) => string;
  /**
   * `list` (padrão): lista estilo iOS ao lado do anel (Categorias, Cartões).
   * `compact`: bolinha + nome lado a lado abaixo de um anel menor (dashboard).
   */
  legend?: 'list' | 'compact';
}

export function CategoryDistribution({
  items,
  total,
  totalLabel,
  formatCount = formatItemsDefault,
  legend = 'list',
}: CategoryDistributionProps) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const ringSegments = buildRingSegments(items, (item) => item.pct, { radius: RING_RADIUS, gap: RING_GAP });
  // Só recolhe a lista quando sobram pelo menos 2 categorias escondidas
  const canCollapse = items.length > COLLAPSED_CATEGORIES + 1;
  const listed = canCollapse && !showAll ? items.slice(0, COLLAPSED_CATEGORIES) : items;
  const hovered = hoveredCat ? items.find((item) => item.cat === hoveredCat) : undefined;

  const isCompact = legend === 'compact';

  // Anel: a cor das categorias fica só aqui e nos ícones/bolinhas da legenda
  const ring = (
    <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
      <div style={{ width: '100%', maxWidth: isCompact ? 260 : 300, aspectRatio: '1 / 1', position: 'relative' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
          {ringSegments.map((segment) => {
            const isHovered = hoveredCat === segment.cat;
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
                opacity={hoveredCat && !isHovered ? 0.3 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
                onMouseEnter={() => setHoveredCat(segment.cat)}
                onMouseLeave={() => setHoveredCat(null)}
              />
            );
          })}
        </svg>

        {/* Centro: total, ou a categoria em foco */}
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
            {hovered ? hovered.cat : totalLabel}
          </span>
          <span style={{ fontSize: 'clamp(22px, 7vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {formatCurrency(hovered ? hovered.total : total)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {hovered
              ? `${(hovered.pct * 100).toFixed(1)}% do total`
              : `${items.length} ${items.length === 1 ? 'categoria' : 'categorias'}`}
          </span>
        </div>
      </div>
    </div>
  );

  if (isCompact) {
    return (
      <>
        {ring}
        {/* Legenda discreta: bolinha + nome lado a lado, quebrando linha */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', marginTop: 16 }}>
          {items.map((item) => (
            <div
              key={item.cat}
              onMouseEnter={() => setHoveredCat(item.cat)}
              onMouseLeave={() => setHoveredCat(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
                cursor: 'default',
                opacity: hoveredCat && hoveredCat !== item.cat ? 0.45 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.config.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.cat}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 32, alignItems: 'center' }}>
      {ring}

      {/* Lista no estilo iOS: ícone, nome e valor em texto neutro, separadores finos */}
      <div style={{ minWidth: 0 }}>
        {listed.map((item, index) => {
          const isHovered = hoveredCat === item.cat;
          const isLast = index === listed.length - 1;
          return (
            <div
              key={item.cat}
              onMouseEnter={() => setHoveredCat(item.cat)}
              onMouseLeave={() => setHoveredCat(null)}
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
              <CategoryIcon config={item.config} />

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
                    {formatCount(item.count)}
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
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
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
            {showAll ? 'Mostrar menos' : `Ver todas (${items.length})`}
            <ChevronDown
              size={15}
              style={{ transform: showAll ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
            />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ranking: lista estilo iOS com barra fina (como o ranking do Tempo de Uso) ──

export interface RankingEntry {
  key: string;
  name: string;
  /** Texto cinza ao lado do nome (ex: a macro de uma micro, ou "3 compras") */
  detail: string;
  total: number;
  /** Fração do total (0–1) */
  pct: number;
  config: CategoryConfig;
}

/** `entries` já ordenadas do maior para o menor; a barra é relativa ao 1º lugar */
export function CategoryRanking({ entries }: { entries: RankingEntry[] }) {
  const maxTotal = entries[0]?.total || 1;

  return (
    <>
      {entries.map((entry, idx) => {
        const barRelativePct = (entry.total / maxTotal) * 100;
        const isLast = idx === entries.length - 1;
        return (
          <div
            key={entry.key}
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

            <CategoryIcon config={entry.config} />

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
                    {entry.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 2 }}>
                    {entry.detail}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(entry.total)}
                </span>
              </div>

              {/* Barra fina relativa ao maior valor + % do total */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <div className="progress-bar-track" style={{ flex: 1, height: 4 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(barRelativePct, 100)}%`, background: entry.config.color }}
                  />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 40, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {(entry.pct * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Macro › Micro: grupos com contorno sutil ───────────────────────────────

export interface MacroMicroGroup extends BreakdownCategory {
  /** [nome da micro, total], do maior para o menor */
  micros: [string, number][];
}

interface MacroMicroGroupsProps {
  groups: MacroMicroGroup[];
  formatCount: (count: number) => string;
  /** Complemento do % da macro no cabeçalho (ex: "do mês" → "38.0% do mês") */
  shareLabel: string;
}

export function MacroMicroGroups({ groups, formatCount, shareLabel }: MacroMicroGroupsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
      {groups.map((group) => (
        <div
          key={group.cat}
          style={{
            border: '1px solid var(--separator-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            minWidth: 0,
          }}
        >
          {/* Cabeçalho da macro: mesmo ícone das transações, texto neutro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, minWidth: 0 }}>
            <CategoryIcon config={group.config} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {group.cat}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {formatCount(group.count)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {formatCurrency(group.total)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {(group.pct * 100).toFixed(1)}% {shareLabel}
              </div>
            </div>
          </div>

          {/* Micros alinhadas ao texto do cabeçalho, com a fatia de cada uma dentro da macro */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 38, minWidth: 0 }}>
            {group.micros.map(([subName, subVal]) => {
              const internalPct = group.total > 0 ? (subVal / group.total) * 100 : 0;
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
                        style={{ width: `${Math.min(internalPct, 100)}%`, background: group.config.color }}
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
      ))}
    </div>
  );
}
