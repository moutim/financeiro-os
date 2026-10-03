'use client';

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Peças da Evolução Financeira e do Comprometimento Futuro (aba Cartões), no mesmo
 * visual da Projeção de Liberação de Crédito: destaques no topo, tooltip com
 * calendário e etiqueta, legenda centralizada abaixo do gráfico.
 */

// Eixos e grade iguais aos da Projeção de Liberação de Crédito
export const xAxisStyle = {
  tick: { fontSize: 12, fill: 'var(--text-tertiary)', fontWeight: 500 },
  axisLine: false,
  tickLine: false,
  dy: 6,
} as const;
// Largura e margem com folga para "-R$ 10 mil" não ser cortado na borda do card
export const yAxisStyle = {
  tick: { fontSize: 11, fill: 'var(--text-tertiary)' },
  axisLine: false,
  tickLine: false,
  width: 62,
} as const;
export const gridStyle = { strokeDasharray: '3 3', stroke: 'var(--separator)', vertical: false, opacity: 0.6 } as const;
export const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 0 };

/** Até 6 meses cabe um rótulo por mês mesmo no celular; acima disso o Recharts pula os que colidem */
export const monthTickInterval = (count: number) => (count <= 6 ? 0 : 'preserveStartEnd');

/** Grade dos destaques: três por linha no card largo, um abaixo do outro no celular */
export function HighlightGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {children}
    </div>
  );
}

interface HighlightCardProps {
  /** Bolinha da cor da série ou ícone pequeno */
  marker: ReactNode;
  label: string;
  value: ReactNode;
  valueColor?: string;
  detail?: ReactNode;
  detailColor?: string;
}

export function HighlightCard({ marker, label, value, valueColor = 'var(--text-primary)', detail, detailColor = 'var(--text-tertiary)' }: HighlightCardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--separator)',
      borderRadius: 14,
      padding: '14px 16px',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {marker}
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: valueColor, letterSpacing: '-0.01em' }}>
        {value}
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: detailColor, fontWeight: detailColor === 'var(--text-tertiary)' ? 400 : 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
          {detail}
        </div>
      )}
    </div>
  );
}

export const Dot = ({ color }: { color: string }) => (
  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
);

// ─── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipCardProps {
  title: string;
  /** Etiqueta à direita do mês (ex: "42% livre") */
  badge?: { text: string; color: string; background: string };
  children: ReactNode;
}

export function TooltipCard({ title, badge, children }: TooltipCardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--separator)',
      borderRadius: 14,
      padding: '14px 18px',
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(20px)',
      minWidth: 230,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, borderBottom: '1px solid var(--separator)', paddingBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="var(--blue)" />
          {title}
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: badge.background, color: badge.color, whiteSpace: 'nowrap' }}>
            {badge.text}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

interface TooltipLineProps {
  label: string;
  value: string;
  /** Bolinha da série; sem ela, a linha é um total */
  color?: string;
  valueColor?: string;
  /** Detalhe de outra linha (ex: cada cartão), recuado e menor */
  sub?: boolean;
}

export function TooltipLine({ label, value, color, valueColor = 'var(--text-primary)', sub }: TooltipLineProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: sub ? 12 : 13, paddingLeft: sub ? 14 : 0 }}>
      <span style={{ color: sub ? 'var(--text-tertiary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {color && <Dot color={color} />}
        {label}
      </span>
      <span style={{ fontWeight: sub ? 500 : 700, color: sub ? 'var(--text-secondary)' : valueColor, whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}

export const TooltipDivider = () => (
  <div style={{ borderTop: '1px dashed var(--separator)', margin: '2px 0' }} />
);

// ─── Legenda ────────────────────────────────────────────────────────────────

export interface LegendEntry {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

interface ChartLegendProps {
  entries: LegendEntry[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}

/** Legenda centralizada abaixo do gráfico; tocar num item oculta ou exibe a série */
export function ChartLegend({ entries, hidden, onToggle }: ChartLegendProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px 24px',
      flexWrap: 'wrap',
      paddingTop: 8,
      borderTop: '1px solid var(--separator)',
    }}>
      {entries.map((entry) => {
        const isHidden = hidden.has(entry.key);
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => onToggle(entry.key)}
            aria-pressed={!isHidden}
            title={isHidden ? `Exibir ${entry.name}` : `Ocultar ${entry.name}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              opacity: isHidden ? 0.4 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {entry.dashed
              ? <span style={{ width: 12, height: 0, borderTop: `2px dashed ${entry.color}` }} />
              : <span style={{ width: 12, height: 4, borderRadius: 2, background: entry.color }} />}
            <span style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>{entry.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Estado vazio (mesmo da Projeção sem cartões) ────────────────────────────

export function ChartEmptyState({ icon: Icon, title, text }: { icon: ComponentType<{ size?: number; style?: CSSProperties }>; title: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, background: 'var(--separator)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <Icon size={32} style={{ opacity: 0.5 }} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ fontSize: 14, maxWidth: 420, margin: '0 auto' }}>{text}</p>
    </div>
  );
}

/** Ids de gradiente do SVG a partir do useId (sem os caracteres especiais que ele gera) */
export const svgId = (reactId: string, name: string) => `${name}-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
