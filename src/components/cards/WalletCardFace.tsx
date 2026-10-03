'use client';

import type { CSSProperties } from 'react';
import { HandCoins, Pencil } from 'lucide-react';
import { DetailedOnly } from '@/components/mode/ModeSwitch';
import { TiltCard } from '@/components/ui/TiltCard';
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

function BrandMark({ brand, isLight }: { brand: string; isLight: boolean }) {
  const norm = (brand || '').toLowerCase();
  const ink = isLight ? '#1D1D1F' : '#FFFFFF';

  if (norm.includes('mastercard')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }} title="Mastercard">
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EB001B' }} />
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F79E1B', marginLeft: -9, opacity: 0.9 }} />
      </div>
    );
  }
  if (norm.includes('visa')) {
    return (
      <svg width="50" height="16" viewBox="0 0 72 23" fill="none" role="img" aria-label="Visa" style={{ color: isLight ? '#1A1F71' : ink }}>
        <path
          fill="currentColor"
          d="M35.6495 0.413261L30.841 22.6604H25.0219L29.8376 0.413261H35.6495ZM60.1288 14.7776L63.1897 6.42214L64.9541 14.7776H60.1288ZM66.6178 22.6604H72L67.3044 0.413261H62.3374C62.3302 0.413261 62.3206 0.413261 62.3134 0.413261C61.2115 0.413261 60.2657 1.08065 59.8672 2.02829L59.86 2.04492L51.1336 22.6604H57.2409L58.4556 19.3353H65.9192L66.6178 22.6604ZM51.4337 15.3975C51.4577 9.52396 43.2259 9.20095 43.2835 6.57652C43.3028 5.7785 44.0686 4.92823 45.749 4.7121C46.0611 4.68123 46.4212 4.66223 46.7861 4.66223C48.4929 4.66223 50.111 5.04698 51.5514 5.73575L51.4865 5.70725L52.5068 0.988022C50.8912 0.368134 49.0211 0.00712515 47.067 0H47.0646C41.3126 0 37.2675 3.02819 37.2315 7.35791C37.1955 10.5595 40.1195 12.3431 42.3257 13.4119C44.5943 14.5021 45.3553 15.2027 45.3433 16.1741C45.3289 17.6704 43.538 18.3259 41.8624 18.352C41.7855 18.3544 41.6919 18.3544 41.6007 18.3544C39.5097 18.3544 37.5412 17.8343 35.8224 16.9151L35.8872 16.946L34.8333 21.8196C36.7202 22.5677 38.9072 23 41.1974 23C41.2334 23 41.2694 23 41.3054 23H41.3006C47.4126 23 51.4097 20.0146 51.4313 15.3903L51.4337 15.3975ZM27.3361 0.413261L17.9112 22.6604H11.7607L7.1227 4.90211C7.03388 4.03759 6.49853 3.31557 5.75433 2.95456L5.73993 2.94744C4.08829 2.14467 2.16778 1.49153 0.158443 1.08065L0 1.05452L0.139237 0.410885H10.0395C11.3886 0.410885 12.5097 1.38703 12.7186 2.66243L12.721 2.67668L15.172 15.5518L21.2265 0.408509L27.3361 0.413261Z"
        />
      </svg>
    );
  }
  if (norm.includes('elo')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="Elo">
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00A4E0' }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4123' }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFCB05' }} />
        <span style={{ fontSize: 15, fontWeight: 800, marginLeft: 3, color: ink }}>elo</span>
      </div>
    );
  }
  if (norm.includes('amex')) {
    return (
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', border: `1.5px solid ${ink}`, color: ink, padding: '2px 5px', borderRadius: 4 }}>
        AMEX
      </span>
    );
  }
  return null; // 'Outro': sem bandeira
}

/** Favicon do banco usado como logo na face do cartão */
export const bankLogoSrc = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

/**
 * Cores da face do cartão (fundo e texto em --wallet-bg / --wallet-ink),
 * a partir do banco ou da cor escolhida. O degradê e as sombras saem do CSS.
 */
export function walletFace(card: Pick<CreditCard, 'color' | 'bankId'>) {
  const bank = getBankById(card.bankId);
  const color = bank?.color || card.color || '#1E1E1E';
  const isLight = isLightCardColor(color);
  const style = {
    '--wallet-bg': isLight ? '#F5F5F7' : color,
    '--wallet-ink': isLight ? '#1D1D1F' : '#FFFFFF',
  } as CSSProperties;
  return { bank, isLight, style };
}

interface WalletCardFaceProps {
  card: Pick<CreditCard, 'name' | 'brand' | 'color' | 'bankId' | 'lastDigits' | 'priority' | 'dueDay'>;
  onEdit: () => void;
  /** Só quando há fatura em aberto: mostra o botão de pagar abaixo do lápis */
  onPay?: () => void;
}

/**
 * Face do cartão no modelo Tilt Card da Spell UI: degradê na cor do banco, inclinação 3D
 * com brilho seguindo o cursor, logo do banco e bandeira no topo, nome + número e
 * vencimento embaixo. Clicar abre a edição do cartão; o ícone de moedas paga a fatura.
 */
export default function WalletCardFace({ card, onEdit, onPay }: WalletCardFaceProps) {
  const { bank, isLight, style } = walletFace(card);
  const last4 = card.lastDigits ? card.lastDigits.split('-').pop() : null;

  return (
    <TiltCard
      className={`wallet-card${isLight ? ' is-light' : ''}`}
      style={style}
      tiltLimit={10}
      scale={1.03}
    >
      <button
        type="button"
        className="wallet-card-body"
        onClick={onEdit}
        title="Editar cartão"
        aria-label={`Editar cartão ${card.name}`}
      >
        <div className="wallet-card-row">
          <div className="wallet-card-issuer">
            {bank && (
              // eslint-disable-next-line @next/next/no-img-element -- favicon externo, sem otimização
              <img
                className="wallet-card-logo"
                src={bankLogoSrc(bank.domain)}
                alt={bank.name}
                width={32}
                height={32}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <DetailedOnly>
              {card.priority ? (
                <span className="wallet-card-priority">
                  {card.priority === 1 ? '⭐ 1º Principal' : `${card.priority}º`}
                </span>
              ) : null}
            </DetailedOnly>
          </div>
          <BrandMark brand={card.brand} isLight={isLight} />
        </div>

        <div className="wallet-card-row" style={{ alignItems: 'flex-end' }}>
          <div className="wallet-card-field">
            <span className="wallet-card-label wallet-card-name">{card.name}</span>
            <span className="wallet-card-value">
              <span className="wallet-card-dots">•••• •••• ••••</span> {last4 ?? '••••'}
            </span>
          </div>
          {card.dueDay ? (
            <div className="wallet-card-field">
              <span className="wallet-card-label">Venc.</span>
              <span className="wallet-card-value">Dia {String(card.dueDay).padStart(2, '0')}</span>
            </div>
          ) : null}
        </div>
      </button>

      {/* Fora do botão da face (botão não pode conter botão); o lápis é só indicação visual
          e deixa o clique passar para a face, que abre a edição */}
      <div className="wallet-card-actions">
        <span className="wallet-card-action wallet-card-edit" aria-hidden="true">
          <Pencil size={12} />
        </span>
        {onPay && (
          <button
            type="button"
            className="wallet-card-action wallet-card-pay"
            onClick={onPay}
            title="Pagar fatura"
            aria-label={`Pagar fatura do cartão ${card.name}`}
          >
            <HandCoins size={13} />
          </button>
        )}
      </div>
    </TiltCard>
  );
}
