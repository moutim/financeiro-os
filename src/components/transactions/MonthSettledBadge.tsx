'use client';

import { Check } from 'lucide-react';
import { useSettledMonths } from '@/lib/monthSettled';

/** Selo logo depois do nome do mês: aparece quando todas as despesas dele estão pagas */
export default function MonthSettledBadge({ monthKey }: { monthKey: string }) {
  const settledMonths = useSettledMonths();
  if (!settledMonths.has(monthKey)) return null;

  return (
    <span className="month-settled-seal" role="img" aria-label="Mês finalizado" title="Mês finalizado">
      <Check size={14} strokeWidth={3.5} />
    </span>
  );
}
