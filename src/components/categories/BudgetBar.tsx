'use client';

import { BUDGET_STATUS, type BudgetStatus } from '@/lib/budgets';

/** Barra de consumo padrão de toda a tela de Categorias, com marcas nas faixas de alerta (50/75/90%) */
export function BudgetBar({ pct, status, height = 6, marks = false, label }: { pct: number; status: BudgetStatus; height?: number; marks?: boolean; label?: string }) {
  const { color } = BUDGET_STATUS[status];
  return (
    <div
      className="budget-bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height }}
    >
      <div className="budget-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      {marks && [50, 75, 90].map((mark) => (
        <span key={mark} className="budget-bar-mark" style={{ left: `${mark}%` }} aria-hidden />
      ))}
    </div>
  );
}

/** Estado do orçamento como texto + cor (a cor nunca é a única pista) */
export function StatusLabel({ status }: { status: BudgetStatus }) {
  const info = BUDGET_STATUS[status];
  return (
    <span className="cx-status" style={{ color: info.color }}>
      <span className="cx-status-dot" style={{ background: info.color }} aria-hidden />
      {info.label}
    </span>
  );
}
