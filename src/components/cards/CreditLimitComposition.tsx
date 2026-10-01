'use client';

import { CreditCard } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import { formatCurrency } from '@/lib/currency';

interface CreditLimitCompositionProps {
  totalLimit: number;
  totalUsed: number;
}

/** Composição do limite somado de todos os cartões: total, usado e livre (topo da página de cartões) */
export default function CreditLimitComposition({ totalLimit, totalUsed }: CreditLimitCompositionProps) {
  const totalAvailable = Math.max(0, totalLimit - totalUsed);
  const usagePct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const availablePct = totalLimit > 0 ? (totalAvailable / totalLimit) * 100 : 0;

  return (
    <SectionCard
      icon={CreditCard}
      title="Composição de Limite"
      description="Limite total, usado e livre somados de todos os cartões"
      actions={
        // no card estreito some daqui e vira a linha .limit-total-row no corpo (globals.css)
        <div className="limit-total" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE TOTAL</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(totalLimit)}</div>
        </div>
      }
    >
      {/* .limit-composition: container query, o layout se adapta à largura do card */}
      <div className="limit-composition">
        <div className="limit-total-row">
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE TOTAL</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(totalLimit)}</span>
        </div>

        {/* Composição Segmentada (Usado vs Livre) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            height: 14,
            borderRadius: 7,
            overflow: 'hidden',
            background: 'var(--separator)',
          }}>
            <div
              style={{
                width: `${Math.min(usagePct, 100)}%`,
                background: usagePct > 80 ? 'var(--red)' : 'var(--blue)',
                transition: 'width 0.4s ease',
              }}
              title={`Usado: ${formatCurrency(totalUsed)} (${usagePct.toFixed(1)}%)`}
            />
            <div
              style={{
                width: `${Math.max(0, 100 - usagePct)}%`,
                background: 'var(--green)',
                opacity: 0.85,
                transition: 'width 0.4s ease',
              }}
              title={`Disponível: ${formatCurrency(totalAvailable)} (${availablePct.toFixed(1)}%)`}
            />
          </div>
        </div>

        {/* Legenda: 2 colunas no card largo, lista (rótulo à esquerda, valor à direita) no estreito */}
        <div className="limit-legend">
          <div className="limit-legend-item">
            <div className="limit-legend-label">
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: usagePct > 80 ? 'var(--red)' : 'var(--blue)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE USADO</span>
            </div>
            <div className="limit-legend-value" style={{ fontSize: 16, fontWeight: 700, color: usagePct > 80 ? 'var(--red)' : 'var(--text-primary)' }}>
              {formatCurrency(totalUsed)}
            </div>
            <div className="limit-legend-detail" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {usagePct.toFixed(1)}% do limite total
            </div>
          </div>

          <div className="limit-legend-item">
            <div className="limit-legend-label">
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: 'var(--green)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE LIVRE</span>
            </div>
            <div className="limit-legend-value" style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
              {formatCurrency(totalAvailable)}
            </div>
            <div className="limit-legend-detail" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {availablePct.toFixed(1)}% disponível
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
