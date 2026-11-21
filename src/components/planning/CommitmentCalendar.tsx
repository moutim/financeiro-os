'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import { formatCurrency } from '@/lib/currency';
import { DEFAULT_BANDS, type CommitmentBands, type MonthProjection } from '@/lib/projection/engine';
import type { CreditCard } from '@/lib/types';
import MonthDetail from './MonthDetail';
import { BAND_COLOR, BAND_LABEL, bandOf, Horizon, HorizonTabs, Legend, pct, shortMonth, sliceHorizon } from './shared';

interface Props {
  months: MonthProjection[];
  currentMonthKey: string;
  bands: CommitmentBands;
  onBands: (b: CommitmentBands) => void;
  cards: Pick<CreditCard, 'id' | 'name'>[];
}

/** Grade de meses colorida pela faixa de comprometimento. As faixas são preferência da pessoa, não regra universal */
export default function CommitmentCalendar({ months, currentMonthKey, bands, onBands, cards }: Props) {
  const [horizon, setHorizon] = useState<Horizon>(12);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const visible = useMemo(() => sliceHorizon(months, currentMonthKey, horizon, false), [months, currentMonthKey, horizon]);
  const open = openKey ? visible.find((m) => m.monthKey === openKey) ?? null : null;

  const setBand = (key: keyof CommitmentBands, raw: string) => {
    const v = Number(raw);
    if (Number.isFinite(v) && v >= 0 && v <= 200) onBands({ ...bands, [key]: v });
  };
  const bandsValid = bands.moderate < bands.high && bands.high < bands.critical;

  return (
    <SectionCard
      icon={CalendarDays}
      title="Calendário de comprometimento"
      description="Cada mês colorido pela faixa de comprometimento da renda. Clique para ver os compromissos"
      actions={<HorizonTabs value={horizon} onChange={setHorizon} />}
    >
      <div className="planning-calendar">
        {visible.map((m) => {
          const band = bandOf(m, bands);
          const color = band ? BAND_COLOR[band] : 'var(--text-quaternary)';
          return (
            <button
              key={m.monthKey} type="button"
              className={`planning-month${openKey === m.monthKey ? ' is-open' : ''}${m.phase === 'current' ? ' is-current' : ''}`}
              style={{ '--band': color } as React.CSSProperties}
              aria-pressed={openKey === m.monthKey}
              aria-label={`${shortMonth(m.monthKey)}: ${m.committedPct === null ? 'sem salário de referência' : `${pct(m.committedPct)} comprometido, faixa ${BAND_LABEL[band ?? 'low'].toLowerCase()}`}`}
              onClick={() => setOpenKey(openKey === m.monthKey ? null : m.monthKey)}
            >
              <span className="planning-month-name">{shortMonth(m.monthKey)}{m.hasEstimate ? ' ·est.' : ''}</span>
              <strong>{m.committedPct === null ? '—' : pct(m.committedPct, 0)}</strong>
              <small>Parcelas {formatCurrency(m.installments)}</small>
              <small>Livre {m.free === null ? '—' : formatCurrency(m.free)}</small>
              <small>{m.items.length} {m.items.length === 1 ? 'compromisso' : 'compromissos'}</small>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <Legend items={[
          { color: BAND_COLOR.low, label: `${BAND_LABEL.low} (< ${bands.moderate}%)` },
          { color: BAND_COLOR.moderate, label: `${BAND_LABEL.moderate} (${bands.moderate}–${bands.high}%)` },
          { color: BAND_COLOR.high, label: `${BAND_LABEL.high} (${bands.high}–${bands.critical}%)` },
          { color: BAND_COLOR.critical, label: `${BAND_LABEL.critical} (≥ ${bands.critical}%)` },
        ]} />
        <button type="button" className="btn-ghost" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          {editing ? 'Fechar faixas' : 'Configurar faixas'}
        </button>
      </div>

      {editing && (
        <div className="planning-bands animate-fade-in">
          {(['moderate', 'high', 'critical'] as const).map((k) => (
            <label key={k}>
              <span>{BAND_LABEL[k]} a partir de (%)</span>
              <input className="form-input" type="number" min={0} max={200} value={bands[k]} onChange={(e) => setBand(k, e.target.value)} />
            </label>
          ))}
          <button type="button" className="btn-ghost" onClick={() => onBands(DEFAULT_BANDS)}>Restaurar padrão</button>
          <p style={{ fontSize: 12, color: bandsValid ? 'var(--text-tertiary)' : 'var(--red)', margin: 0, flexBasis: '100%' }}>
            {bandsValid
              ? 'As faixas são uma referência sua: não existe um limite universal de saúde financeira. Ficam salvas neste navegador.'
              : 'Os limites devem crescer: moderado < elevado < crítico.'}
          </p>
        </div>
      )}

      {open && <MonthDetail month={open} cards={cards} />}
    </SectionCard>
  );
}
