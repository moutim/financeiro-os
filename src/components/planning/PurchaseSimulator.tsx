'use client';

import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, ShoppingBag, X } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import AmountInput from '@/components/transactions/AmountInput';
import { formatCurrency } from '@/lib/currency';
import { compareScenario, firstInstallmentMonth, splitTotal, type ProjectionInput, type PurchaseSimulation } from '@/lib/projection/engine';
import type { CreditCard } from '@/lib/types';
import { shortMonth, pct } from './shared';

interface Props {
  input: ProjectionInput;
  cards: Pick<CreditCard, 'id' | 'name' | 'closeDay' | 'dueDay'>[];
  currentMonthKey: string;
  /** Simulação aplicada aos gráficos (null: nenhuma) */
  applied: PurchaseSimulation | null;
  onApply: (sim: PurchaseSimulation | null) => void;
  /** Encaminha para o cadastro de compra já existente */
  onConfirm: (sim: PurchaseSimulation) => void;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Simulador: monta as parcelas hipotéticas, compara com o cenário atual e, só se pedido,
 * atualiza os gráficos. Nada é gravado; "Confirmar compra" abre o formulário de cadastro existente.
 */
export default function PurchaseSimulator({ input, cards, currentMonthKey, applied, onApply, onConfirm }: Props) {
  const [name, setName] = useState('');
  const [totalRaw, setTotalRaw] = useState('');
  const [installmentRaw, setInstallmentRaw] = useState('');
  const [count, setCount] = useState('6');
  const [cardId, setCardId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayIso);
  const [firstMonthOverride, setFirstMonthOverride] = useState<string | null>(null);
  const [lastEdited, setLastEdited] = useState<'total' | 'installment'>('total');

  const n = Math.max(1, Math.min(120, parseInt(count, 10) || 1));
  const cents = (raw: string) => (parseInt(raw.replace(/\D/g, ''), 10) || 0) / 100;

  // Valor total e valor da parcela se derivam um do outro, conforme o último campo editado
  const total = lastEdited === 'total' ? cents(totalRaw) : Math.round(cents(installmentRaw) * n * 100) / 100;
  const installment = lastEdited === 'installment' ? cents(installmentRaw) : splitTotal(total, n).rest;

  // Mês da 1ª parcela: sugerido pelo fechamento/vencimento do cartão, até a pessoa ajustá-lo
  const card = cards.find((c) => c.id === cardId);
  const [py, pm, pd] = purchaseDate.split('-').map(Number);
  const suggestedMonth = py && pm && pd ? firstInstallmentMonth({ year: py, month: pm, day: pd }, card) : currentMonthKey;
  const firstMonth = firstMonthOverride ?? suggestedMonth;
  const firstMonthEdited = firstMonthOverride !== null;

  const sim: PurchaseSimulation | null = total > 0 ? { name: name.trim() || 'Nova compra', total, installments: n, cardId: cardId || null, firstMonthKey: firstMonth } : null;
  const scenario = useMemo(() => (sim ? compareScenario(input, sim) : null), [input, sim?.name, sim?.total, sim?.installments, sim?.cardId, sim?.firstMonthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Com a simulação aplicada, os gráficos acompanham as edições do formulário em tempo real
  useEffect(() => {
    if (applied && sim) onApply(sim);
  }, [sim?.name, sim?.total, sim?.installments, sim?.cardId, sim?.firstMonthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const impacted = scenario?.months.filter((m) => m.freeLost !== 0) ?? [];
  const hasIncome = scenario?.months.some((m) => m.base.committedPct !== null) ?? false;

  return (
    <SectionCard
      icon={FlaskConical}
      title="Simulador de compra parcelada"
      description="Veja o impacto de uma compra antes de fazê-la. Nada é salvo até você confirmar"
    >
      <div className="planning-form">
        <label>
          <span>Nome da compra</span>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Celular" />
        </label>
        <label>
          <span>Valor total</span>
          <AmountInput rawAmount={lastEdited === 'total' ? totalRaw : String(Math.round(total * 100))} onChange={(v) => { setTotalRaw(v); setLastEdited('total'); }} allowCredit={false} />
        </label>
        <label>
          <span>Parcelas</span>
          <input className="form-input" type="number" min={1} max={120} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <label>
          <span>Valor da parcela</span>
          <AmountInput rawAmount={lastEdited === 'installment' ? installmentRaw : String(Math.round(installment * 100))} onChange={(v) => { setInstallmentRaw(v); setLastEdited('installment'); }} allowCredit={false} />
        </label>
        <label>
          <span>Cartão</span>
          <select className="form-input" value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="">Sem cartão</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          <span>Data da compra</span>
          <input className="form-input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
        <label>
          <span>1ª parcela em</span>
          <input className="form-input" type="month" value={firstMonth} onChange={(e) => setFirstMonthOverride(e.target.value || null)} />
          <small>{firstMonthEdited ? 'Ajustado por você' : card?.closeDay ? `Sugerido pelo fechamento (dia ${card.closeDay}) do cartão` : 'Mês da compra (cartão sem fechamento cadastrado)'}</small>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn-primary" disabled={!sim} onClick={() => sim && onApply(sim)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FlaskConical size={16} /> Simular
        </button>
        <button type="button" className="btn-secondary" disabled={!sim} onClick={() => sim && onConfirm(sim)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ShoppingBag size={16} /> Confirmar compra
        </button>
        {applied && (
          <button type="button" className="btn-ghost" onClick={() => onApply(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <X size={16} /> Remover simulação
          </button>
        )}
      </div>
      {!sim && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>Informe o valor total (ou da parcela) para simular.</p>}

      {sim && scenario && (
        <div className="animate-fade-in" style={{ marginTop: 20 }}>
          <div className="planning-stats">
            <div><span>Valor da parcela</span><strong>{formatCurrency(scenario.installmentAmount)}</strong></div>
            <div><span>Meses impactados</span><strong>{scenario.monthsImpacted}</strong><small>até {shortMonth(scenario.lastMonthKey)}</small></div>
            <div><span>+ comprometimento</span><strong>{scenario.extraPctFirstMonth === null ? '—' : `${scenario.extraPctFirstMonth.toFixed(1).replace('.', ',')} p.p.`}</strong><small>no 1º mês</small></div>
            <div><span>Renda livre antes</span><strong>{hasIncome ? formatCurrency(scenario.freeBefore) : '—'}</strong><small>soma do período da compra</small></div>
            <div><span>Renda livre depois</span><strong style={{ color: scenario.freeAfter < 0 ? 'var(--red)' : undefined }}>{hasIncome ? formatCurrency(scenario.freeAfter) : '—'}</strong><small>soma do período da compra</small></div>
          </div>

          {!hasIncome && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sem salário de referência, só é possível mostrar o valor das parcelas, não o impacto percentual.</p>}

          <div className="planning-table-wrap">
            <table className="planning-table">
              <thead>
                <tr><th>Mês</th><th>Comprom. atual</th><th>Com a compra</th><th>Renda livre atual</th><th>Com a compra</th><th>Perde</th></tr>
              </thead>
              <tbody>
                {impacted.map((m) => (
                  <tr key={m.monthKey}>
                    <td>{shortMonth(m.monthKey)}</td>
                    <td>{m.base.committedPct === null ? '—' : pct(m.base.committedPct)}</td>
                    <td>{m.withPurchase.committedPct === null ? '—' : pct(m.withPurchase.committedPct)}</td>
                    <td>{m.base.free === null ? '—' : formatCurrency(m.base.free)}</td>
                    <td style={{ color: (m.withPurchase.free ?? 0) < 0 ? 'var(--red)' : undefined }}>{m.withPurchase.free === null ? '—' : formatCurrency(m.withPurchase.free)}</td>
                    <td style={{ color: 'var(--red)', fontWeight: 700 }}>−{formatCurrency(m.freeLost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
            {applied ? 'A simulação está aplicada aos gráficos acima. ' : 'Clique em Simular para ver a compra nos gráficos. '}
            Confirmar compra abre o cadastro de transações já preenchido.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
