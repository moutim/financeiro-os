'use client';

import { useMemo, useState } from 'react';
import { useFinanceStore, CURRENT_MONTH_KEY } from '@/lib/store';
import {
  addMonthsToKey,
  buildMonthlyProjection,
  classifyCommitment,
  DEFAULT_BANDS,
  extractInstallmentPlans,
  type BandLevel,
  type CommitmentBands,
  type CommitmentKind,
  type MonthProjection,
  type ProjectionInput,
} from '@/lib/projection/engine';
import { shortMonth } from '@/lib/projection/insights';

export { shortMonth };

export const HORIZONS = [3, 6, 12, 24] as const;
export type Horizon = (typeof HORIZONS)[number];
/** Meses passados exibidos antes do atual nos gráficos de comprometimento, para contexto */
export const PAST_CONTEXT = 3;

/** Cores semânticas: a mesma categoria tem a mesma cor em todos os gráficos */
export const KIND_COLOR: Record<CommitmentKind | 'free', string> = {
  installments: 'var(--orange)',
  fixed: 'var(--indigo)',
  other: 'var(--teal)',
  free: 'var(--green)',
};

export const KIND_LABEL: Record<CommitmentKind | 'free', string> = {
  installments: 'Parcelamentos',
  fixed: 'Fixas e recorrentes',
  other: 'Outros compromissos',
  free: 'Renda livre',
};

export const BAND_COLOR: Record<BandLevel, string> = {
  low: 'var(--green)',
  moderate: 'var(--yellow)',
  high: 'var(--orange)',
  critical: 'var(--red)',
};

export const BAND_LABEL: Record<BandLevel, string> = {
  low: 'Baixo',
  moderate: 'Moderado',
  high: 'Elevado',
  critical: 'Crítico',
};

export const BASIS_LABEL: Record<MonthProjection['basis'], string> = {
  realized: 'Realizado',
  known: 'Compromissos já lançados',
  estimated: 'Inclui estimativa por recorrência',
  insufficient: 'Sem salário de referência',
};

export const pct = (v: number, digits = 1) => `${v.toFixed(digits).replace('.', ',')}%`;

/** Opacidade da barra: realizado e lançado são sólidos, estimado fica mais claro */
export const basisOpacity = (basis: MonthProjection['basis']) =>
  basis === 'estimated' ? 0.55 : basis === 'insufficient' ? 0.2 : 0.95;

export function bandOf(m: MonthProjection, bands: CommitmentBands): BandLevel | null {
  return m.committedPct === null ? null : classifyCommitment(m.committedPct, bands);
}

// ─── Dados ──────────────────────────────────────────────────────────────────────────────

/**
 * Projeção calculada a partir do que está no store (que vem da planilha). Calcula uma vez o
 * período máximo (12 meses de histórico + mês atual + 24 à frente) e os componentes recortam.
 */
export function useProjectionData() {
  const transactions = useFinanceStore((s) => s.transactions);
  const incomes = useFinanceStore((s) => s.incomes);
  const cards = useFinanceStore((s) => s.cards);

  return useMemo(() => {
    const currentMonthKey = CURRENT_MONTH_KEY;
    const dataMonths = [...transactions.map((t) => t.monthKey), ...incomes.map((i) => i.monthKey)].sort();
    const earliest = addMonthsToKey(currentMonthKey, -12);
    const first = dataMonths[0] && dataMonths[0] > earliest ? dataMonths[0] : earliest;
    const input: ProjectionInput = {
      transactions,
      incomes,
      currentMonthKey,
      startMonthKey: first > currentMonthKey ? currentMonthKey : first,
      endMonthKey: addMonthsToKey(currentMonthKey, 24),
    };
    return {
      input,
      months: buildMonthlyProjection(input),
      plans: extractInstallmentPlans(transactions),
      cards,
      currentMonthKey,
    };
  }, [transactions, incomes, cards]);
}

/** Meses exibidos: alguns passados de contexto + o mês atual e os seguintes até o horizonte */
export function sliceHorizon(months: MonthProjection[], currentMonthKey: string, horizon: Horizon, withPast = true): MonthProjection[] {
  const from = withPast ? addMonthsToKey(currentMonthKey, -PAST_CONTEXT) : currentMonthKey;
  const to = addMonthsToKey(currentMonthKey, horizon - 1);
  return months.filter((m) => m.monthKey >= from && m.monthKey <= to);
}

// ─── Faixas configuráveis ───────────────────────────────────────────────────────────────

const BANDS_KEY = 'financeiro-os:commitment-bands';

/** Faixas de comprometimento, guardadas no navegador (preferência de cada pessoa) */
export function useBands(): [CommitmentBands, (b: CommitmentBands) => void] {
  // O componente só monta depois dos dados carregarem no cliente, então ler o navegador aqui é seguro
  const [bands, setBands] = useState<CommitmentBands>(readStoredBands);

  const update = (next: CommitmentBands) => {
    setBands(next);
    try { localStorage.setItem(BANDS_KEY, JSON.stringify(next)); } catch { /* ignora */ }
  };
  return [bands, update];
}

function readStoredBands(): CommitmentBands {
  try {
    const raw = localStorage.getItem(BANDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<CommitmentBands>) : null;
    if (parsed && typeof parsed.moderate === 'number' && typeof parsed.high === 'number' && typeof parsed.critical === 'number') {
      return { moderate: parsed.moderate, high: parsed.high, critical: parsed.critical };
    }
  } catch { /* sem armazenamento: usa o padrão */ }
  return DEFAULT_BANDS;
}

// ─── Peças visuais ──────────────────────────────────────────────────────────────────────

export function HorizonTabs({ value, onChange }: { value: Horizon; onChange: (h: Horizon) => void }) {
  return (
    <div className="planning-pills" role="group" aria-label="Horizonte">
      {HORIZONS.map((h) => (
        <button key={h} type="button" className={value === h ? 'is-active' : ''} aria-pressed={value === h} onClick={() => onChange(h)}>
          {h}m
        </button>
      ))}
    </div>
  );
}

export function ChartTooltipBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 12,
      padding: '12px 16px', boxShadow: 'var(--shadow-md)', minWidth: 200, maxWidth: 280,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export function TooltipRow({ color, label, value, strong }: { color?: string; label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {color && <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />}
        {label}
      </span>
      <span style={{ fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; faded?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: i.color, opacity: i.faded ? 0.5 : 1 }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: 'var(--text-tertiary)', padding: '24px 0', textAlign: 'center', margin: 0 }}>
      {children}
    </p>
  );
}
