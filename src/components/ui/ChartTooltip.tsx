import type { ReactNode } from 'react';

/** Props comuns dos <Tooltip> do recharts: sem animação, sem capturar o mouse */
export const TOOLTIP_PROPS = {
  isAnimationActive: false,
  offset: 14,
  allowEscapeViewBox: { x: false, y: true },
  wrapperStyle: { zIndex: 30, outline: 'none', pointerEvents: 'none' as const },
};

/** Caixa padrão dos tooltips de gráfico */
export function ChartTooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 12,
      padding: '12px 14px', boxShadow: 'var(--shadow-lg)', width: 'max-content',
      minWidth: 200, maxWidth: 'min(300px, calc(100vw - 48px))',
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{title}</div>
      {children}
    </div>
  );
}

/** Linha do tooltip em colunas: rótulo | valor | detalhe. Nada quebra nem se mistura */
export function TooltipRow({ color, label, value, detail, muted }: { color?: string; label: string; value: string; detail?: string; muted?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto 48px', alignItems: 'baseline', columnGap: 12, fontSize: 13, marginBottom: 4, lineHeight: 1.35 }}>
      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {color && <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />}
        <span>{label}</span>
      </span>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: muted ? 'var(--text-tertiary)' : undefined, gridColumn: detail === undefined ? '2 / 4' : undefined }}>{value}</span>
      {detail !== undefined && (
        <span style={{ whiteSpace: 'nowrap', textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{detail}</span>
      )}
    </div>
  );
}
