'use client';

import type { CSSProperties } from 'react';
import { Pencil } from 'lucide-react';
import { DetailedOnly } from '@/components/mode/ModeSwitch';
import { getBankById } from '@/lib/banks';
import type { CreditCard } from '@/lib/types';

/** Cor clara o bastante para precisar de texto escuro (ex: cartões brancos) */
export function isLightCardColor(hex?: string | null): boolean {
  if (!hex) return false;
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (full.length !== 6) return false;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 185;
}

/** `#RRGGBB` + alfa → `rgba(...)`; cores fora desse formato caem num cinza neutro */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(0, 0, 0, ${alpha * 0.5})`;
  const n = parseInt(clean, 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

function BrandMark({ brand, isLight }: { brand: string; isLight: boolean }) {
  const norm = (brand || '').toLowerCase();
  const ink = isLight ? '#1D1D1F' : '#FFFFFF';

  if (norm.includes('mastercard')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }} title="Mastercard">
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EB001B' }} />
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F79E1B', marginLeft: -11, opacity: 0.9 }} />
      </div>
    );
  }
  if (norm.includes('visa')) {
    return (
      <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.04em', color: isLight ? '#1A1F71' : ink }}>
        VISA
      </span>
    );
  }
  if (norm.includes('elo')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="Elo">
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00A4E0' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4123' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFCB05' }} />
        <span style={{ fontSize: 16, fontWeight: 800, marginLeft: 3, color: ink }}>elo</span>
      </div>
    );
  }
  if (norm.includes('amex')) {
    return (
      <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', border: `1.5px solid ${ink}`, color: ink, padding: '2px 5px', borderRadius: 4 }}>
        AMEX
      </span>
    );
  }
  return null; // 'Outro': sem bandeira, como no Wallet
}

interface WalletCardFaceProps {
  card: Pick<CreditCard, 'name' | 'brand' | 'color' | 'bankId' | 'lastDigits' | 'priority'>;
  onEdit: () => void;
}

/**
 * Face do cartão no estilo Apple Wallet: cor sólida do banco, logo e nome no
 * topo, final do número e bandeira embaixo. Clicar abre a edição do cartão.
 */
export default function WalletCardFace({ card, onEdit }: WalletCardFaceProps) {
  const bank = getBankById(card.bankId);
  const color = bank?.color || card.color || '#1E1E1E';
  const isLight = isLightCardColor(color);
  const last4 = card.lastDigits ? card.lastDigits.split('-').pop() : null;

  const style = {
    '--wallet-bg': isLight ? '#F5F5F7' : color,
    '--wallet-ink': isLight ? '#1D1D1F' : '#FFFFFF',
    '--wallet-glow': isLight ? 'rgba(0, 0, 0, 0.12)' : withAlpha(color, 0.45),
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`wallet-card${isLight ? ' is-light' : ''}`}
      style={style}
      onClick={onEdit}
      title="Editar cartão"
      aria-label={`Editar cartão ${card.name}`}
    >
      <div className="wallet-card-row">
        {bank ? (
          // eslint-disable-next-line @next/next/no-img-element -- favicon externo, sem otimização
          <img
            className="wallet-card-logo"
            src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=128`}
            alt={bank.name}
            width={36}
            height={36}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : <span />}

        <div className="wallet-card-meta">
          <span className="wallet-card-name">{card.name}</span>
          <DetailedOnly>
            {card.priority ? (
              <span className="wallet-card-priority">
                {card.priority === 1 ? '⭐ 1º Principal' : `${card.priority}º`}
              </span>
            ) : null}
          </DetailedOnly>
        </div>
      </div>

      <div className="wallet-card-row" style={{ alignItems: 'flex-end' }}>
        <span className="wallet-card-number">
          <span className="wallet-card-dots">••••</span>
          {last4 ?? '••••'}
        </span>
        <BrandMark brand={card.brand} isLight={isLight} />
      </div>

      <span className="wallet-card-edit" aria-hidden="true">
        <Pencil size={13} />
      </span>
    </button>
  );
}
