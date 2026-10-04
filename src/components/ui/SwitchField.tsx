'use client';

import type { ElementType } from 'react';

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ElementType;
  /** Cor da chave ligada e do ícone */
  color?: string;
  disabled?: boolean;
  /** Linha curta abaixo do rótulo (ex: por que a opção está indisponível) */
  caption?: string;
  /** Explicação da opção (title: aparece no hover e é lida como descrição) */
  hint?: string;
}

/**
 * Interruptor compacto dos formulários: rótulo e chave numa caixa clicável inteira,
 * para dois caberem lado a lado sem aumentar a altura do modal.
 */
export default function SwitchField({
  label,
  checked,
  onChange,
  icon: Icon,
  color = 'var(--green)',
  disabled = false,
  caption,
  hint,
}: SwitchFieldProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={hint}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="switch-field"
    >
      <span className="switch-field-text">
        <span className="switch-field-label">
          {Icon && <Icon size={14} strokeWidth={2.2} style={{ color, flexShrink: 0 }} />}
          <span className="switch-field-ellipsis">{label}</span>
        </span>
        {caption && <span className="switch-field-caption switch-field-ellipsis">{caption}</span>}
      </span>
      <span className="switch-field-track" style={checked ? { background: color } : undefined}>
        <span className="switch-field-thumb" style={{ left: checked ? 18 : 2 }} />
      </span>
    </button>
  );
}
