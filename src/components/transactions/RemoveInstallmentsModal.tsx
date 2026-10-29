'use client';

import { Trash2 } from 'lucide-react';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

interface RemoveInstallmentsModalProps {
  /** Nomes dos itens parcelados removidos da lista */
  names: string[];
  /** Remove também as parcelas dos próximos meses */
  onRemoveAll: () => void;
  /** Remove só do mês editado */
  onKeepLater: () => void;
  /** Volta para a edição */
  onCancel: () => void;
}

/** Pergunta, ao salvar a edição, se as parcelas seguintes de um item removido saem dos próximos meses */
export default function RemoveInstallmentsModal({ names, onRemoveAll, onKeepLater, onCancel }: RemoveInstallmentsModalProps) {
  const swipeToClose = useSwipeToClose(onCancel);

  return (
    <div className="modal-overlay animate-fade-in" onClick={onCancel}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ ...swipeToClose.style, textAlign: 'center' }}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
        </div>

        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--red-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--red)',
        }}>
          <Trash2 size={24} strokeWidth={1.8} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Remover as parcelas seguintes?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 6 }}>
          Você removeu {names.length > 1 ? 'itens parcelados' : 'um item parcelado'} deste mês:
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
          {names.join(', ')}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 28 }}>
          As parcelas dos próximos meses podem sair junto.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="btn-primary btn-destructive"
            onClick={onRemoveAll}
            style={{ justifyContent: 'center', padding: '14px' }}
          >
            Remover também as seguintes
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onKeepLater}
            style={{ justifyContent: 'center', padding: '14px' }}
          >
            Só deste mês
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            style={{ justifyContent: 'center', padding: '10px', color: 'var(--text-tertiary)' }}
          >
            Voltar à edição
          </button>
        </div>
      </div>
    </div>
  );
}
