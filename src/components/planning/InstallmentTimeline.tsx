'use client';

import { useMemo, useState } from 'react';
import { GanttChart } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import { formatCurrency } from '@/lib/currency';
import { addMonthsToKey, monthRange, type InstallmentPlan } from '@/lib/projection/engine';
import type { CreditCard } from '@/lib/types';
import { EmptyNote, KIND_COLOR, shortMonth } from './shared';

type SortKey = 'end' | 'amount' | 'remaining';
type Period = 'all' | '3' | '6' | '12';

interface Props {
  plans: InstallmentPlan[];
  cards: Pick<CreditCard, 'id' | 'name' | 'color'>[];
  currentMonthKey: string;
}

const MAX_MONTHS = 36;

/** Compras parceladas como linhas de um Gantt: cada célula é uma parcela (paga ou a pagar) */
export default function InstallmentTimeline({ plans, cards, currentMonthKey }: Props) {
  const [cardFilter, setCardFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<SortKey>('end');
  const [showEnded, setShowEnded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(plans.map((p) => p.category))].sort(), [plans]);
  const cardsWithPlans = useMemo(() => cards.filter((c) => plans.some((p) => p.cardId === c.id)), [cards, plans]);

  const filtered = useMemo(() => {
    const limit = period === 'all' ? null : addMonthsToKey(currentMonthKey, Number(period));
    const list = plans.filter((p) =>
      (showEnded || p.active) &&
      (cardFilter === 'all' || (cardFilter === 'none' ? p.cardId === null : p.cardId === cardFilter)) &&
      (categoryFilter === 'all' || p.category === categoryFilter) &&
      (!limit || p.lastMonth <= limit),
    );
    return list.sort((a, b) =>
      sort === 'amount' ? b.installmentAmount - a.installmentAmount
        : sort === 'remaining' ? b.remainingCount - a.remainingCount
          : a.lastMonth.localeCompare(b.lastMonth) || b.installmentAmount - a.installmentAmount);
  }, [plans, cardFilter, categoryFilter, period, sort, showEnded, currentMonthKey]);

  const { monthKeys, truncated } = useMemo(() => {
    if (filtered.length === 0) return { monthKeys: [] as string[], truncated: false };
    const from = filtered.reduce((m, p) => (p.firstMonth < m ? p.firstMonth : m), currentMonthKey);
    const start = from < addMonthsToKey(currentMonthKey, -3) ? addMonthsToKey(currentMonthKey, -3) : from;
    const to = filtered.reduce((m, p) => (p.lastMonth > m ? p.lastMonth : m), currentMonthKey);
    const all = monthRange(start, to);
    return { monthKeys: all.slice(0, MAX_MONTHS), truncated: all.length > MAX_MONTHS };
  }, [filtered, currentMonthKey]);

  const cardById = (id: string | null) => cards.find((c) => c.id === id);
  const opened = filtered.find((p) => p.id === openId) ?? null;
  const monthlyTotal = filtered.filter((p) => p.active).reduce((s, p) => s + p.installmentAmount, 0);
  const remainingTotal = filtered.reduce((s, p) => s + p.remainingValue, 0);

  return (
    <SectionCard
      icon={GanttChart}
      title="Linha do tempo dos parcelamentos"
      description="Cada linha é uma compra parcelada; a barra mostra os meses em que ela compromete a renda"
    >
      <div className="planning-filters">
        <ToolbarSelect aria-label="Filtrar por cartão" value={cardFilter} onChange={(e) => setCardFilter(e.target.value)}>
          <option value="all">Todos os cartões</option>
          {cardsWithPlans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {plans.some((p) => p.cardId === null) && <option value="none">Sem cartão</option>}
        </ToolbarSelect>
        <ToolbarSelect aria-label="Filtrar por categoria" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </ToolbarSelect>
        <ToolbarSelect aria-label="Filtrar por término" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          <option value="all">Qualquer término</option>
          <option value="3">Terminam em 3 meses</option>
          <option value="6">Terminam em 6 meses</option>
          <option value="12">Terminam em 12 meses</option>
        </ToolbarSelect>
        <ToolbarSelect aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="end">Ordenar: término</option>
          <option value="amount">Ordenar: valor da parcela</option>
          <option value="remaining">Ordenar: parcelas restantes</option>
        </ToolbarSelect>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} /> Incluir encerradas
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyNote>{plans.length === 0 ? 'Nenhuma compra parcelada lançada.' : 'Nenhuma compra parcelada com esses filtros.'}</EmptyNote>
      ) : (
        <>
          <div className="planning-stats" style={{ marginBottom: 12 }}>
            <div><span>Compras</span><strong>{filtered.length}</strong></div>
            <div><span>Parcelas por mês</span><strong>{formatCurrency(monthlyTotal)}</strong></div>
            <div><span>Ainda comprometido</span><strong>{formatCurrency(remainingTotal)}</strong></div>
          </div>

          <div className="gantt" role="table" aria-label="Linha do tempo dos parcelamentos">
            <div className="gantt-scroll">
              <div className="gantt-row gantt-head" role="row" style={{ gridTemplateColumns: `minmax(150px, 190px) repeat(${monthKeys.length}, minmax(34px, 1fr))` }}>
                <div className="gantt-label" role="columnheader">Compra</div>
                {monthKeys.map((mk) => (
                  <div key={mk} role="columnheader" className={`gantt-month${mk === currentMonthKey ? ' is-current' : ''}`}>{shortMonth(mk)}</div>
                ))}
              </div>
              {filtered.map((p) => {
                const card = cardById(p.cardId);
                const byMonth = new Map(p.rows.map((r) => [r.monthKey, r]));
                const isOpen = openId === p.id;
                return (
                  <div key={p.id}>
                    <button
                      type="button"
                      className={`gantt-row gantt-body${isOpen ? ' is-open' : ''}`} role="row" aria-expanded={isOpen}
                      style={{ gridTemplateColumns: `minmax(150px, 190px) repeat(${monthKeys.length}, minmax(34px, 1fr))` }}
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                    >
                      <div className="gantt-label" role="rowheader">
                        <strong>{p.name}</strong>
                        <small>{formatCurrency(p.installmentAmount)} · {p.paidCount}/{p.total}{card ? ` · ${card.name}` : ''}</small>
                      </div>
                      {monthKeys.map((mk) => {
                        const r = byMonth.get(mk);
                        return (
                          <div key={mk} role="cell" className={`gantt-cell${mk === currentMonthKey ? ' is-current' : ''}`}>
                            {r && (
                              <span
                                className="gantt-bar"
                                title={`${shortMonth(mk)} · parcela ${r.k}/${p.total} · ${formatCurrency(r.amount)}${r.isPaid ? ' · paga' : ''}`}
                                style={{ background: KIND_COLOR.installments, opacity: r.isPaid ? 0.3 : 0.95, borderRadius: mk === p.firstMonth ? '8px 0 0 8px' : mk === p.lastMonth ? '0 8px 8px 0' : 0 }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </button>
                    {isOpen && opened && (
                      <div className="planning-detail animate-fade-in">
                        <div className="planning-detail-grid">
                          <div>
                            <PlanLine label="Valor total da compra" value={formatCurrency(opened.totalValue)} />
                            <PlanLine label="Valor da parcela" value={formatCurrency(opened.installmentAmount)} />
                            <PlanLine label="Parcelas" value={`${opened.paidCount} pagas · ${opened.remainingCount} restantes de ${opened.total}`} />
                            <PlanLine label="Já pago" value={formatCurrency(opened.paidValue)} />
                            <PlanLine label="Ainda comprometido" value={formatCurrency(opened.remainingValue)} strong />
                          </div>
                          <div>
                            <PlanLine label="Cartão" value={card?.name ?? 'Sem cartão'} />
                            <PlanLine label="Categoria" value={opened.category} />
                            <PlanLine label="1ª parcela" value={shortMonth(opened.firstMonth)} />
                            <PlanLine label="Última parcela" value={shortMonth(opened.lastMonth)} />
                            <PlanLine label="Renda liberada a partir de" value={opened.active ? `${shortMonth(opened.releaseMonth)} (+${formatCurrency(opened.installmentAmount)}/mês)` : 'Encerrada'} strong />
                          </div>
                        </div>
                        {opened.incomplete && (
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
                            Só {opened.rows.length} das {opened.total} parcelas estão lançadas; os valores consideram apenas as lançadas.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
            Parcela clara: já paga. Parcela forte: a pagar. Clique numa compra para ver os detalhes.
            {truncated && ` Mostrando os primeiros ${MAX_MONTHS} meses.`}
          </p>
        </>
      )}
    </SectionCard>
  );
}

function PlanLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
