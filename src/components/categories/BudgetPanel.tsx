'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  Gauge,
  PiggyBank,
  Plus,
  Receipt,
  Target,
  Wallet,
  Pencil,
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import SectionCard from '@/components/ui/SectionCard';
import BudgetFormModal from '@/components/categories/BudgetFormModal';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, monthKeyToLabel, monthKeyToShortLabel } from '@/lib/currency';
import { getCategoryConfig } from '@/lib/detailedCategories';
import { BUDGET_STATUS, budgetMessage, type BudgetStatus } from '@/lib/budgets';
import { useBudgetTracking, type BudgetRow } from '@/hooks/useBudgetTracking';

type ModalState =
  | { mode: 'new'; preset?: string | null }
  | { mode: 'edit'; category: string; limit: number }
  | null;

/** Barra de consumo com marcas nas faixas de alerta (50/75/90%) */
function BudgetBar({ pct, status, height = 10 }: { pct: number; status: BudgetStatus; height?: number }) {
  const { color } = BUDGET_STATUS[status];
  return (
    <div
      className="budget-bar"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height }}
    >
      <div className="budget-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      {[50, 75, 90].map((mark) => (
        <span key={mark} className="budget-bar-mark" style={{ left: `${mark}%` }} aria-hidden />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: BudgetStatus }) {
  const info = BUDGET_STATUS[status];
  return (
    <span className="budget-badge" style={{ color: info.color, background: info.bg }}>
      {info.label}
    </span>
  );
}

function BudgetCard({ row, index, isPast, onEdit }: { row: BudgetRow; index: number; isPast: boolean; onEdit: () => void }) {
  const cfg = getCategoryConfig(row.category);
  const Icon = cfg.icon;
  const info = BUDGET_STATUS[row.status];
  const over = row.remaining < 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); } }}
      className="budget-card animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms`, borderColor: row.status === 'normal' ? undefined : info.bg }}
      aria-label={`Editar orçamento de ${row.category}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: cfg.color, color: '#FFF', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${cfg.bgColor}`,
        }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.category}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {row.count} {row.count === 1 ? 'transação' : 'transações'}
          </div>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{formatCurrency(row.spent)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 6 }}>de {formatCurrency(row.limit)}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: info.color }}>{row.pct}%</span>
      </div>

      <BudgetBar pct={row.rawPct} status={row.status} />

      <div className="budget-card-metrics">
        <div>
          <div className="budget-metric-label">{over ? 'Excedido' : isPast ? 'Sobrou' : 'Disponível'}</div>
          <div className="budget-metric-value" style={{ color: over ? 'var(--red)' : 'var(--text-primary)' }}>
            {formatCurrency(Math.abs(row.remaining))}
          </div>
        </div>
        <div>
          <div className="budget-metric-label">Orçamento</div>
          <div className="budget-metric-value">{formatCurrency(row.limit)}</div>
        </div>
        <div>
          <div className="budget-metric-label">Consumo</div>
          <div className="budget-metric-value" style={{ color: info.color }}>{row.pct}%</div>
        </div>
      </div>

      <p style={{ fontSize: 12, lineHeight: 1.45, color: row.status === 'normal' ? 'var(--text-secondary)' : info.color, marginTop: 12 }}>
        {budgetMessage(row.category, row.spent, row.limit, isPast)}
      </p>

      <span className="budget-card-edit" aria-hidden><Pencil size={13} /></span>
    </div>
  );
}

/**
 * Painel de orçamento mensal por categoria macro (modo detalhado): consolidado no topo,
 * alertas, um card por categoria com orçamento e as categorias com gasto sem limite.
 * Tudo calculado das transações do mês selecionado (ver src/lib/budgets.ts).
 */
export default function BudgetPanel() {
  const { setCategoryBudget, deactivateCategoryBudget, deleteCategoryBudgetHistory, setSelectedMonth } = useFinanceStore();
  const {
    selectedMonth, isPastMonth, rows, unbudgeted, overview, alerts,
    historyMonths, history, availableCategories, spending,
  } = useBudgetTracking();
  const [modal, setModal] = useState<ModalState>(null);

  const monthLabel = monthKeyToLabel(selectedMonth);
  const hasBudgets = rows.length > 0;
  const overallInfo = BUDGET_STATUS[overview.status];
  const canAdd = availableCategories.length > 0;
  const openNew = (preset?: string | null) => setModal({ mode: 'new', preset });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
      {/* ── Consolidado ── */}
      {hasBudgets && (
        <div className="stat-grid stagger" style={{ marginBottom: 0 }}>
          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div className="budget-kpi-head" style={{ color: 'var(--blue)' }}>
              <Target size={18} /><span>Orçamento total</span>
            </div>
            <div className="budget-kpi-value">{formatCurrency(overview.totalLimit)}</div>
            <div className="budget-kpi-sub">{rows.length} {rows.length === 1 ? 'categoria controlada' : 'categorias controladas'}</div>
          </GlassCard>

          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div className="budget-kpi-head" style={{ color: 'var(--purple)' }}>
              <Receipt size={18} /><span>Total gasto</span>
            </div>
            <div className="budget-kpi-value">{formatCurrency(overview.totalSpent)}</div>
            <div className="budget-kpi-sub">nas categorias com orçamento</div>
          </GlassCard>

          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div className="budget-kpi-head" style={{ color: overview.remaining < 0 ? 'var(--red)' : 'var(--green)' }}>
              <Wallet size={18} /><span>{overview.remaining < 0 ? 'Excedido' : isPastMonth ? 'Sobrou' : 'Disponível'}</span>
            </div>
            <div className="budget-kpi-value" style={{ color: overview.remaining < 0 ? 'var(--red)' : undefined }}>
              {formatCurrency(Math.abs(overview.remaining))}
            </div>
            <div className="budget-kpi-sub">
              {overview.overCount > 0
                ? `${overview.overCount} ${overview.overCount === 1 ? 'categoria no limite ou acima' : 'categorias no limite ou acima'}`
                : 'nenhuma categoria estourada'}
            </div>
          </GlassCard>

          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div className="budget-kpi-head" style={{ color: overallInfo.color }}>
              <Gauge size={18} /><span>Consumo geral</span>
            </div>
            <div className="budget-kpi-value" style={{ color: overallInfo.color }}>{overview.pct}%</div>
            <div style={{ marginTop: 8 }}>
              <BudgetBar pct={overview.rawPct} status={overview.status} height={6} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Alertas ── */}
      {alerts.length > 0 && (
        <GlassCard className="animate-fade-in-up" padding="16px 18px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
            <AlertTriangle size={16} color="var(--orange)" />
            {isPastMonth ? `Destaques de ${monthLabel}` : 'Alertas de orçamento'}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map((row) => {
              const info = BUDGET_STATUS[row.status];
              return (
                <li key={row.category}>
                  <button
                    type="button"
                    className="budget-alert"
                    onClick={() => setModal({ mode: 'edit', category: row.category, limit: row.limit })}
                    style={{ background: info.bg }}
                  >
                    <span className="budget-alert-dot" style={{ background: info.color }} aria-hidden />
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      {budgetMessage(row.category, row.spent, row.limit, isPastMonth)}
                    </span>
                    <StatusBadge status={row.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}

      {/* ── Orçamentos por categoria ── */}
      <SectionCard
        icon={PiggyBank}
        title="Orçamentos por categoria"
        description={hasBudgets
          ? `Quanto você já gastou de cada limite em ${monthLabel}. Toque num card para ajustar.`
          : undefined}
        actions={canAdd && (
          <button type="button" className="btn-primary" onClick={() => openNew()} style={{ padding: '8px 14px', fontSize: 14 }}>
            <Plus size={16} strokeWidth={2.5} /> Novo orçamento
          </button>
        )}
      >
        {hasBudgets ? (
          <div className="budget-grid">
            {rows.map((row, i) => (
              <BudgetCard
                key={row.category}
                row={row}
                index={i}
                isPast={isPastMonth}
                onEdit={() => setModal({ mode: 'edit', category: row.category, limit: row.limit })}
              />
            ))}
          </div>
        ) : (
          <div className="budget-empty">
            <div className="budget-empty-icon"><PiggyBank size={28} /></div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Defina quanto pode gastar em cada categoria</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, lineHeight: 1.5, margin: '6px auto 16px' }}>
              Escolha só as categorias que quer controlar. O app soma as transações do mês
              (parcelas incluídas pelo valor de cada mês) e avisa quando você chegar perto do limite.
            </p>
            <button type="button" className="btn-primary" onClick={() => openNew(unbudgeted[0]?.category)}>
              <Plus size={16} strokeWidth={2.5} /> Criar primeiro orçamento
            </button>
          </div>
        )}

        {/* Categorias com gasto e sem orçamento */}
        {unbudgeted.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--separator)' }}>
            <div className="budget-subtitle">Sem orçamento definido</div>
            <div className="budget-unbudgeted">
              {unbudgeted.map((u) => {
                const cfg = getCategoryConfig(u.category);
                const Icon = cfg.icon;
                const isExpenseMacro = availableCategories.includes(u.category as (typeof availableCategories)[number]);
                return (
                  <div key={u.category} className="budget-unbudgeted-item">
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, background: cfg.bgColor, color: cfg.color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.category}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {formatCurrency(u.spent)} · {u.count} {u.count === 1 ? 'transação' : 'transações'}
                      </div>
                    </div>
                    {isExpenseMacro && (
                      <button type="button" className="btn-ghost" onClick={() => openNew(u.category)} style={{ fontSize: 12, padding: '6px 10px', color: 'var(--blue)' }}>
                        Definir limite
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Histórico ── */}
      {history.length > 0 && historyMonths.length > 1 && (
        <SectionCard
          icon={CalendarRange}
          title="Histórico dos orçamentos"
          description="Gasto em relação ao limite que valia em cada mês. Toque num mês para abri-lo."
        >
          <div className="budget-history-scroll">
            <table className="budget-history">
              <thead>
                <tr>
                  <th scope="col">Categoria</th>
                  {historyMonths.map((m) => (
                    <th key={m} scope="col">
                      <button
                        type="button"
                        onClick={() => setSelectedMonth(m)}
                        className={m === selectedMonth ? 'is-selected' : undefined}
                        title={monthKeyToLabel(m)}
                      >
                        {monthKeyToShortLabel(m)}/{m.slice(2, 4)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(({ category, cells }) => (
                  <tr key={category}>
                    <th scope="row">{category}</th>
                    {cells.map((cell, i) => (
                      <td key={historyMonths[i]} className={historyMonths[i] === selectedMonth ? 'is-selected' : undefined}>
                        {cell ? (
                          <span
                            className="budget-history-cell"
                            style={{ color: BUDGET_STATUS[cell.status].color, background: BUDGET_STATUS[cell.status].bg }}
                            title={`${formatCurrency(cell.spent)} de ${formatCurrency(cell.limit)}`}
                          >
                            {cell.pct}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-quaternary)' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {modal && (
        <BudgetFormModal
          initial={modal.mode === 'edit' ? { category: modal.category, limit: modal.limit } : null}
          presetCategory={modal.mode === 'new' ? modal.preset : null}
          categories={availableCategories}
          monthKey={selectedMonth}
          spentOf={(c) => spending.get(c)?.total ?? 0}
          onSave={async (category, limit) => {
            await setCategoryBudget(category, limit, selectedMonth);
            setModal(null);
          }}
          onDeactivate={async (category) => {
            await deactivateCategoryBudget(category, selectedMonth);
            setModal(null);
          }}
          onDeleteHistory={async (category) => {
            await deleteCategoryBudgetHistory(category);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
