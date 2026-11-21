'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import type { AlertKind, BudgetAlert } from '@/lib/budgetInsights';

const VISIBLE = 4;

const KIND: Record<AlertKind, { color: string; title: (a: BudgetAlert, past: boolean) => string; action: string }> = {
  over: { color: 'var(--red)', title: (a, past) => `${a.label} ${past ? 'passou' : 'ultrapassou'} o limite`, action: 'Abrir' },
  limit: { color: 'var(--orange)', title: (a) => `${a.label} perto do limite`, action: 'Abrir' },
  pace: { color: 'var(--orange)', title: (a) => `Ritmo acima do esperado em ${a.label}`, action: 'Abrir' },
  growth: { color: 'var(--yellow)', title: (a) => `Gasto de ${a.label} cresceu acima da média`, action: 'Ver' },
  unbudgeted: { color: 'var(--blue)', title: (a) => `${a.label} sem orçamento`, action: 'Definir limite' },
};

function details(a: BudgetAlert): string {
  if (a.kind === 'unbudgeted') return `${formatCurrency(a.spent)} gastos no mês, sem limite`;
  const base = a.limit !== null ? `${formatCurrency(a.spent)} de ${formatCurrency(a.limit)} · ${Math.round(a.pct ?? 0)}%` : formatCurrency(a.spent);
  if (a.kind === 'growth') return `${formatCurrency(a.spent)} contra média de ${formatCurrency(a.baseline ?? 0)}`;
  if (a.kind === 'pace') return `${base} com ${Math.round(a.elapsedPct ?? 0)}% do mês`;
  return base;
}

function diffText(a: BudgetAlert, past: boolean): { text: string; color: string } | null {
  if (a.kind === 'unbudgeted') return null;
  if (a.kind === 'growth') return { text: `+${formatCurrency(a.diff)}`, color: 'var(--text-secondary)' };
  if (a.diff > 0) return { text: `+${formatCurrency(a.diff)} acima`, color: 'var(--red)' };
  return { text: `${past ? 'sobraram' : 'restam'} ${formatCurrency(Math.abs(a.diff))}`, color: 'var(--text-secondary)' };
}

/**
 * Alertas prioritários, do mais relevante ao menos, em linhas compactas. A cor aparece só
 * no marcador e no valor; o resto do texto fica neutro.
 */
export default function BudgetAlertsList({ alerts, isPast, onOpen }: { alerts: BudgetAlert[]; isPast: boolean; onOpen: (alert: BudgetAlert) => void }) {
  const [showAll, setShowAll] = useState(false);
  if (alerts.length === 0) return null;
  const listed = showAll ? alerts : alerts.slice(0, VISIBLE);

  return (
    <section className="cx-section" aria-label={isPast ? 'Destaques do mês' : 'Alertas de orçamento'}>
      <header className="cx-head">
        <div>
          <h2>{isPast ? 'Destaques do mês' : 'Alertas'}</h2>
          <p>{alerts.length} {alerts.length === 1 ? 'ponto pede' : 'pontos pedem'} atenção, do mais relevante ao menos</p>
        </div>
      </header>

      <ul className="cx-alerts">
        {listed.map((a) => {
          const kind = KIND[a.kind];
          // acima de 90% a barra da tabela é vermelha: o marcador acompanha
          const dot = a.kind === 'limit' && (a.pct ?? 0) > 90 ? 'var(--red)' : kind.color;
          const diff = diffText(a, isPast);
          return (
            <li key={a.id}>
              <button type="button" className="cx-alert" onClick={() => onOpen(a)}>
                <span className="cx-alert-dot" style={{ background: dot }} aria-hidden />
                <span className="cx-alert-main">
                  <strong>{kind.title(a, isPast)}</strong>
                  <span>{details(a)}</span>
                </span>
                {diff && <span className="cx-alert-diff" style={{ color: diff.color }}>{diff.text}</span>}
                <span className="cx-alert-action">{kind.action}<ChevronRight size={14} aria-hidden /></span>
              </button>
            </li>
          );
        })}
      </ul>
      {alerts.length > VISIBLE && (
        <button type="button" className="btn-ghost cx-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Mostrar menos' : `Ver todos (${alerts.length})`}
        </button>
      )}
    </section>
  );
}
