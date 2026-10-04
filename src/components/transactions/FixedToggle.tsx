'use client';

import { Repeat } from 'lucide-react';
import SwitchField from '@/components/ui/SwitchField';

interface FixedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Com parcelas a transação já se repete, então a marcação fica indisponível */
  hasInstallments?: boolean;
  label?: string;
}

/** Interruptor da marcação "Fixo" nos formulários de transação (ao lado do "Pago") */
export default function FixedToggle({
  checked,
  onChange,
  disabled = false,
  hasInstallments = false,
  label = 'Despesa fixa',
}: FixedToggleProps) {
  return (
    <SwitchField
      label={label}
      icon={Repeat}
      color="var(--orange)"
      checked={checked && !hasInstallments}
      onChange={onChange}
      disabled={disabled || hasInstallments}
      caption={hasInstallments ? 'Já é parcelada' : undefined}
      hint={hasInstallments
        ? 'Parcelas já se repetem nos próximos meses'
        : 'Repete todo mês, como aluguel e assinaturas'}
    />
  );
}
