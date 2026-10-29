'use client';

import { Minus } from 'lucide-react';
import { formatMask, isCredit, toggledCredit, typedAmount } from '@/lib/currency';

interface AmountInputProps {
  /** Centavos como string; o prefixo '-' marca um crédito (ver isCredit) */
  rawAmount: string;
  onChange: (rawAmount: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Sem o botão de crédito (ex.: entradas não têm valor negativo) */
  allowCredit?: boolean;
}

/** Campo de valor das transações, com o botão − para lançar um crédito (estorno, cancelamento) */
export default function AmountInput({ rawAmount, onChange, disabled, required, allowCredit = true }: AmountInputProps) {
  const credit = isCredit(rawAmount);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        type="text"
        inputMode="numeric"
        placeholder="R$ 0,00"
        value={formatMask(rawAmount)}
        onChange={(e) => onChange(typedAmount(e.target.value, rawAmount))}
        disabled={disabled}
        required={required}
        style={{ paddingRight: allowCredit ? 44 : undefined, color: credit ? 'var(--green)' : undefined }}
      />
      {allowCredit && (
        <button
          type="button"
          className={`sub-row-credit${credit ? ' is-active' : ''}`}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
          onClick={() => onChange(toggledCredit(rawAmount))}
          disabled={disabled}
          aria-pressed={credit}
          aria-label="Valor é um crédito"
          title="Crédito (valor negativo)"
        >
          <Minus size={12} strokeWidth={3} aria-hidden />
        </button>
      )}
    </div>
  );
}
