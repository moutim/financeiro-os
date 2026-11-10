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
import BudgetFormModal, { type BudgetFormTarget } from '@/components/categories/BudgetFormModal';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, monthKeyToLabel, monthKeyToShortLabel } from '@/lib/currency';
import { getCategoryConfig, getMicrosForMacro } from '@/lib/detailedCategories';
import { BUDGET_STATUS, budgetKey, budgetMessage, type BudgetStatus } from '@/lib/budgets';
import { budgetMessageLabel, useBudgetTracking, type BudgetRow } from '@/hooks/useBudgetTracking';

type ModalState =
  | { mode: 'new'; category?: string | null; scope?: 'macro' | 'micro' }
  | { mode: 'edit'; category: string; subcategory: string | null; limit: number }
  | null;

const editState = (row: BudgetRow): ModalState => ({ mode: 'edit', category: row.category, subcategory: row.subcategory, limit: row.limit });

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
      {height >= 8 && [50, 75, 90].map((mark) => (
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

/** Sub-limite de uma subcategoria dentro do card da categoria */
function MicroBudgetLine({ row, onEdit }: { row: BudgetRow; onEdit: () => void }) {
  const info = BUDGET_STATUS[row.status];
  return (
    <button
      type="button"
      className="budget-micro-line"
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={`Editar limite de ${row.label}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.label}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {formatCurrency(row.spent)} <span style={{ color: 'var(--text-tertiary)' }}>/ {formatCurrency(row.limit)}</span>
          <strong style={{ color: info.color, marginLeft: 6 }}>{row.pct}%</strong>
        </span>
      </div>
      <BudgetBar pct={row.rawPct} status={row.status} height={5} />
    </button>
  );
}

function BudgetCard({
  row, index, isPast, onEdit, onEditMicro, onAddMicro,
}: {
  row: BudgetRow;
  index: number;
  isPast: boolean;
  onEdit: () => void;
  onEditMicro: (micro: BudgetRow) => void;
  onAddMicro?: () => void;
}) {
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
      aria-label={`Editar orçamento de ${budgetMessageLabel(row)}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: cfg.color, color: '#FFF', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${cfg.bgColor}`,
        }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {row.subcategory && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.category} ›
            </div>
          )}
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.label}
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
        {budgetMessage(budgetMessageLabel(row), row.spent, row.limit, isPast)}
      </p>

      {/* Sub-limites das subcategorias */}
      {(row.micros.length > 0 || onAddMicro) && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--separator)' }}>
          {row.micros.length > 0 && (
            <>
              <div className="budget-subtitle" style={{ marginBottom: 6 }}>Limites por subcategoria</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {row.micros.map((micro) => (
                  <MicroBudgetLine key={micro.key} row={micro} onEdit={() => onEditMicro(micro)} />
                ))}
              </div>
            </>
          )}
          {onAddMicro && (
            <button
              type="button"
              className="btn-ghost budget-add-micro"
              onClick={(e) => { e.stopPropagation(); onAddMicro(); }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Plus size={13} strokeWidth={2.5} /> Limite para subcategoria
            </button>
          )}
        </div>
      )}

      <span className="budget-card-edit" aria-hidden><Pencil size={13} /></span>
    </div>
  );
}

/**
 * Painel de orçamento mensal (modo detalhado): consolidado no topo, alertas, um card por
 * categoria (com os limites das subcategorias dentro) e as categorias com gasto sem limite.
 * Tudo calculado das transações do mês selecionado (ver src/lib/budgets.ts).
 */
export default function BudgetPanel() {
  const { setCategoryBudget, deactivateCategoryBudget, deleteCategoryBudgetHistory, setSelectedMonth } = useFinanceStore();
  const {
    selectedMonth, isPastMonth, rows, unbudgeted, overview, alerts,
    historyMonths, history, availableCategories, takenKeys, spending,
  } = useBudgetTracking();
  const [modal, setModal] = useState<ModalState>(null);

  const monthLabel = monthKeyToLabel(selectedMonth);
  const hasBudgets = rows.length > 0;
  const overallInfo = BUDGET_STATUS[overview.status];
  const hasFreeMicros = (category: string) => getMicrosForMacro(category).some((m) => !takenKeys.has(budgetKey(category, m)));
  const canAdd = availableCategories.length > 0 || rows.some((r) => hasFreeMicros(r.category));

  const controlled = [
    overview.macroCount > 0 && `${overview.macroCount} ${overview.macroCount === 1 ? 'categoria' : 'categorias'}`,
    overview.microCount > 0 && `${overview.microCount} ${overview.microCount === 1 ? 'subcategoria' : 'subcategorias'}`,
  ].filter(Boolean).join(' e ');

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
            <div className="budget-kpi-sub">{controlled} sob controle</div>
          </GlassCard>

          <GlassCard className="stat-card animate-fade-in-up" style={{ minWidth: 0 }}>
            <div className="budget-kpi-head" style={{ color: 'var(--purple)' }}>
              <Receipt size={18} /><span>Total gasto</span>
            </div>
            <div className="budget-kpi-value">{formatCurrency(overview.totalSpent)}</div>
            <div className="budget-kpi-sub">no que tem orçamento</div>
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
                ? `${overview.overCount} ${overview.overCount === 1 ? 'orçamento no limite ou acima' : 'orçamentos no limite ou acima'}`
                : 'nenhum orçamento estourado'}
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
                <li key={row.key}>
                  <button
                    type="button"
                    className="budget-alert"
                    onClick={() => setModal(editState(row))}
                    style={{ background: info.bg }}
                  >
                    <span className="budget-alert-dot" style={{ background: info.color }} aria-hidden />
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      {budgetMessage(budgetMessageLabel(row), row.spent, row.limit, isPastMonth)}
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
          <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'new' })} style={{ padding: '8px 14px', fontSize: 14 }}>
            <Plus size={16} strokeWidth={2.5} /> Novo orçamento
          </button>
        )}
      >
        {hasBudgets ? (
          <div className="budget-grid">
            {rows.map((row, i) => (
              <BudgetCard
                key={row.key}
                row={row}
                index={i}
                isPast={isPastMonth}
                onEdit={() => setModal(editState(row))}
                onEditMicro={(micro) => setModal(editState(micro))}
                onAddMicro={!row.subcategory && hasFreeMicros(row.category)
                  ? () => setModal({ mode: 'new', category: row.category, scope: 'micro' })
                  : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="budget-empty">
            <div className="budget-empty-icon"><PiggyBank size={28} /></div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Defina quanto pode gastar em cada categoria</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, lineHeight: 1.5, margin: '6px auto 16px' }}>
              Escolha só o que quer controlar: uma categoria inteira ou uma subcategoria específica.
              O app soma as transações do mês (parcelas incluídas pelo valor de cada mês) e avisa
              quando você chegar perto do limite.
            </p>
            <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'new', category: unbudgeted[0]?.category })}>
              <Plus size={16} strokeWidth={2.5} /> Criar primeiro orçamento
            </button>
          </div>
        )}

        {/* Categorias com gasto e sem orçamento da categoria inteira */}
        {unbudgeted.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--separator)' }}>
            <div className="budget-subtitle">Sem orçamento definido</div>
            <div className="budget-unbudgeted">
              {unbudgeted.map((u) => {
                const cfg = getCategoryConfig(u.category);
                const Icon = cfg.icon;
                const isExpenseMacro = (availableCategories as readonly string[]).includes(u.category);
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
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setModal({ mode: 'new', category: u.category, scope: 'macro' })}
                        style={{ fontSize: 12, padding: '6px 10px', color: 'var(--blue)' }}
                      >
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
                  <th scope="col">Orçamento</th>
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
                {history.map(({ key, category, subcategory, cells }) => (
                  <tr key={key}>
                    <th scope="row" className={subcategory ? 'is-micro' : undefined}>
                      {subcategory ? (
                        <><span className="budget-history-branch" aria-hidden>└ </span>{subcategory}<span className="sr-only"> ({category})</span></>
                      ) : category}
                    </th>
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
          initial={modal.mode === 'edit' ? { category: modal.category, subcategory: modal.subcategory, limit: modal.limit } : null}
          preset={modal.mode === 'new' ? { category: modal.category, scope: modal.scope } : null}
          takenKeys={takenKeys}
          monthKey={selectedMonth}
          spentOf={(key) => spending.get(key)?.total ?? 0}
          onSave={async ({ category, subcategory }: BudgetFormTarget, limit) => {
            await setCategoryBudget(category, subcategory, limit, selectedMonth);
            setModal(null);
          }}
          onDeactivate={async ({ category, subcategory }) => {
            await deactivateCategoryBudget(category, subcategory, selectedMonth);
            setModal(null);
          }}
          onDeleteHistory={async ({ category, subcategory }) => {
            await deleteCategoryBudgetHistory(category, subcategory);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
