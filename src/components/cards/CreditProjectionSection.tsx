'use client';

import { CreditCard as CreditCardIcon, Plus, TrendingUp } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import CreditProjectionChart from '@/components/charts/CreditProjectionChart';
import { generateCreditProjection, type CardWithRealData } from '@/lib/creditCards';

interface CreditProjectionSectionProps {
  cards: CardWithRealData[];
  onAddCard: () => void;
}

/** Projeção de liberação de crédito dos próximos meses (exibida nos dois modos) */
export default function CreditProjectionSection({ cards, onAddCard }: CreditProjectionSectionProps) {
  return (
    <SectionCard
      icon={TrendingUp}
      title="Projeção de Liberação de Crédito"
      description="Quanto do limite deve ficar livre nos próximos meses"
    >
      {cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: 'var(--separator)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <CreditCardIcon size={32} style={{ opacity: 0.5 }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Ainda não há dados de crédito
          </h3>
          <p style={{ fontSize: 14, maxWidth: 420, margin: '0 auto' }}>
            Adicione seus cartões e limites para acompanhar a projeção de liberação de crédito, visualizar faturas e ter um controle mais inteligente dos seus gastos.
          </p>
          <button
            className="btn-primary"
            onClick={onAddCard}
            style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} /> Cadastrar Cartão
          </button>
        </div>
      ) : (
        <CreditProjectionChart data={generateCreditProjection(cards)} />
      )}
    </SectionCard>
  );
}
