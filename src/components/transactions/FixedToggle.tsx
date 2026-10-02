'use client';

import { Repeat } from 'lucide-react';

interface FixedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Com parcelas a transação já se repete, então a marcação fica indisponível */
  hasInstallments?: boolean;
  label?: string;
}

/** Interruptor da marcação "Fixo" nos formulários de transação (mesmo visual do "Marcar como pago") */
export default function FixedToggle({
  checked,
  onChange,
  disabled = false,
  hasInstallments = false,
  label = 'Despesa fixa',
}: FixedToggleProps) {
  const isOn = checked && !hasInstallments;
  const isDisabled = disabled || hasInstallments;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 0', marginBottom: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          <Repeat size={14} strokeWidth={2.2} style={{ color: 'var(--orange)' }} />
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {hasInstallments
            ? 'Parcelas já se repetem nos próximos meses'
            : 'Repete todo mês, como aluguel e assinaturas'}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        onClick={() => onChange(!checked)}
        disabled={isDisabled}
        style={{
          width: 44,
          height: 24,
          flexShrink: 0,
          borderRadius: 12,
          background: isOn ? 'var(--orange)' : 'var(--text-quaternary)',
          border: 'none',
          position: 'relative',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
          opacity: isDisabled ? 0.5 : 1
        }}
      >
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: isOn ? 22 : 2,
          transition: 'left 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  );
}
