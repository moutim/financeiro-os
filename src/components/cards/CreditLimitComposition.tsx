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
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE TOTAL</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(totalLimit)}</div>
        </div>
      }
    >
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

      {/* Legenda Detalhada dos Limites */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--separator)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: usagePct > 80 ? 'var(--red)' : 'var(--blue)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE USADO</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: usagePct > 80 ? 'var(--red)' : 'var(--text-primary)' }}>
            {formatCurrency(totalUsed)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
            {usagePct.toFixed(1)}% do limite total
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>LIMITE LIVRE</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
            {formatCurrency(totalAvailable)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
            {availablePct.toFixed(1)}% disponível
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
