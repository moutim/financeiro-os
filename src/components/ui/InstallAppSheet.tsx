'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Smartphone, Download, Share, SquarePlus, EllipsisVertical, Ellipsis, ExternalLink } from 'lucide-react';
import { useInstallPrompt, type InstallPlatform } from '@/hooks/useInstallPrompt';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

/** "Não mostrar novamente": vale para este aparelho/navegador, então fica no localStorage */
const DISMISSED_FOREVER_KEY = '@financeiro-os:installSheet:dismissedForever';

/** "Agora não": vale até fechar a aba e é separado por tela — quem pula no login vê de novo no dashboard */
const dismissedForNowKey = (placement: string) => `@financeiro-os:installSheet:dismissed:${placement}`;

/** Espera a tela assentar antes de subir a gaveta */
const OPEN_DELAY_MS = 1200;

// Storage pode lançar erro (modo privado, cookies bloqueados): na dúvida, a gaveta só não lembra
function readFlag(storage: () => Storage, key: string): boolean {
  try {
    return storage().getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(storage: () => Storage, key: string) {
  try {
    storage().setItem(key, 'true');
  } catch {
    // ignora
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

interface Step {
  icon: ReactNode;
  text: ReactNode;
}

const STEPS: Record<InstallPlatform, Step[]> = {
  ios: [
    {
      icon: <Share size={18} />,
      text: <>Toque em <strong>Compartilhar</strong> na barra do navegador (no Safari, ele pode estar dentro do menu <strong>•••</strong>)</>,
    },
    {
      icon: <SquarePlus size={18} />,
      text: <>Escolha <strong>Adicionar à Tela de Início</strong></>,
    },
    {
      icon: <Smartphone size={18} />,
      text: <>Toque em <strong>Adicionar</strong> e abra o Financeiro OS pelo ícone criado</>,
    },
  ],
  android: [
    {
      icon: <EllipsisVertical size={18} />,
      text: <>Toque no menu <strong>⋮</strong> do navegador</>,
    },
    {
      icon: <SquarePlus size={18} />,
      text: <>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></>,
    },
    {
      icon: <Smartphone size={18} />,
      text: <>Abra o Financeiro OS pelo ícone criado</>,
    },
  ],
  inapp: [
    {
      icon: <Ellipsis size={18} />,
      text: <>Toque no menu <strong>•••</strong> ou <strong>⋮</strong> deste app</>,
    },
    {
      icon: <ExternalLink size={18} />,
      text: <>Escolha <strong>Abrir no navegador</strong></>,
    },
    {
      icon: <SquarePlus size={18} />,
      text: <>Lá, adicione o Financeiro OS à tela de início</>,
    },
  ],
};

interface InstallAppSheetProps {
  /** Tela onde a gaveta aparece; o "Agora não" de uma não esconde a outra */
  placement: 'login' | 'dashboard';
  /** false enquanto outro modal da tela estiver aberto (ou prestes a abrir) */
  enabled?: boolean;
}

/**
 * Gaveta que sugere instalar o app na tela inicial.
 * Só aparece no celular, quando a página está aberta no navegador (e não em modo app).
 */
export default function InstallAppSheet({ placement, enabled = true }: InstallAppSheetProps) {
  const { platform, isStandalone, canPromptInstall, promptInstall } = useInstallPrompt();
  const [isOpen, setIsOpen] = useState(false);
  // fechada nesta tela: não reabre nem se o storage falhar
  const wasClosedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !platform || isStandalone || wasClosedRef.current) return;
    if (readFlag(local, DISMISSED_FOREVER_KEY) || readFlag(session, dismissedForNowKey(placement))) return;

    const timer = setTimeout(() => setIsOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, platform, isStandalone, placement]);

  const close = () => {
    wasClosedRef.current = true;
    setIsOpen(false);
  };

  const dismissForNow = () => {
    writeFlag(session, dismissedForNowKey(placement));
    close();
  };

  const dismissForever = () => {
    writeFlag(local, DISMISSED_FOREVER_KEY);
    close();
  };

  const handleInstall = async () => {
    // fecha a gaveta antes, para o pedido do sistema aparecer sozinho
    dismissForNow();
    await promptInstall();
  };

  const swipeToClose = useSwipeToClose(dismissForNow);

  if (!isOpen || !platform || isStandalone) return null;

  // No Android com o pedido nativo disponível, um toque instala; nos demais, mostramos o passo a passo
  const hasNativePrompt = platform === 'android' && canPromptInstall;
  const steps = hasNativePrompt ? [] : STEPS[platform];

  return (
    <div className="modal-overlay animate-fade-in" onClick={dismissForNow}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-sheet-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...swipeToClose.style,
          textAlign: 'center',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
        </div>

        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--blue-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--blue)',
        }}>
          <Smartphone size={26} strokeWidth={1.8} />
        </div>

        <h2 id="install-sheet-title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em' }}>
          Use o Financeiro OS como app
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 24, padding: '0 8px' }}>
          {platform === 'inapp'
            ? 'Você está no navegador de outro app. Abra no Safari ou no Chrome para instalar o Financeiro OS na tela inicial.'
            : 'A experiência fica muito melhor pela tela inicial: abre em tela cheia, sem a barra do navegador, e fica a um toque de distância.'}
        </p>

        {steps.length > 0 && (
          <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {steps.map((step, idx) => (
              <li key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{
                  display: 'flex',
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--bg)',
                  color: 'var(--blue)',
                }}>
                  {step.icon}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{step.text}</span>
              </li>
            ))}
          </ol>
        )}

        {hasNativePrompt ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={dismissForNow}
              style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
            >
              Agora não
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleInstall}
              style={{ flex: 1, padding: '14px' }}
            >
              <Download size={18} strokeWidth={2.2} />
              Instalar app
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={dismissForNow}
            style={{ width: '100%', padding: '14px' }}
          >
            Entendi
          </button>
        )}

        <button
          type="button"
          onClick={dismissForever}
          style={{
            marginTop: 14,
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Não mostrar novamente
        </button>
      </div>
    </div>
  );
}
