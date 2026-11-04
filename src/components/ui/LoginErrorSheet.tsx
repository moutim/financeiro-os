'use client';

import { AlertCircle } from 'lucide-react';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

export interface LoginErrorInfo {
  title: string;
  cause: string;
  steps: string[];
}

interface LoginErrorSheetProps {
  error: LoginErrorInfo;
  onClose: () => void;
}

/** Gaveta que explica por que o login falhou e o que a pessoa deve fazer */
export default function LoginErrorSheet({ error, onClose }: LoginErrorSheetProps) {
  const swipeToClose = useSwipeToClose(onClose);

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="login-error-title"
        aria-describedby="login-error-cause"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...swipeToClose.style,
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'var(--red-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--red)',
          }}>
            <AlertCircle size={26} strokeWidth={1.8} />
          </div>

          <h2 id="login-error-title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em' }}>
            {error.title}
          </h2>
          <p id="login-error-cause" style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 24, padding: '0 8px' }}>
            {error.cause}
          </p>
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>O que fazer</p>
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error.steps.map((step, idx) => (
            <li key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                display: 'flex',
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 10,
                background: 'var(--bg)',
                color: 'var(--blue)',
                fontSize: 14,
                fontWeight: 700,
              }}>
                {idx + 1}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.4, paddingTop: 4 }}>{step}</span>
            </li>
          ))}
        </ol>

        <button type="button" className="btn-primary" onClick={onClose} style={{ width: '100%', padding: '14px' }}>
          Entendi
        </button>
      </div>
    </div>
  );
}
