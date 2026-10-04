'use client';

import { monthKeyToShortLabel, toCanonicalMonthKey } from '@/lib/currency';

/** Jan 2020 a Dez 2035: o mesmo intervalo dos antigos seletores separados de Mês e Ano */
const MONTH_KEYS = Array.from({ length: 16 * 12 }, (_, i) =>
  `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
);

/** "Out 2026": curto o bastante para dividir a linha com outro campo no celular */
function monthOptionLabel(monthKey: string): string {
  const month = monthKeyToShortLabel(monthKey);
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${toCanonicalMonthKey(monthKey).slice(0, 4)}`;
}

interface MonthKeySelectProps {
  value: string; // "YYYY-MM"
  onChange: (monthKey: string) => void;
  /** Meses oferecidos (padrão: Jan 2020 a Dez 2035) */
  monthKeys?: string[];
  disabled?: boolean;
}

/** Mês e ano num único seletor (os formulários de transação não têm espaço para dois) */
export default function MonthKeySelect({ value, onChange, monthKeys = MONTH_KEYS, disabled }: MonthKeySelectProps) {
  // um mês fora da lista (lançamento antigo) continua selecionável
  const options = monthKeys.includes(value) ? monthKeys : [value, ...monthKeys];
  return (
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {options.map((monthKey) => (
        <option key={monthKey} value={monthKey}>
          {monthOptionLabel(monthKey)}
        </option>
      ))}
    </select>
  );
}
