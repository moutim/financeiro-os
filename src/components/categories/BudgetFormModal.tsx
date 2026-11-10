'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { formatCurrency, formatMask, monthKeyToLabel, parseMask } from '@/lib/currency';
import { EXPENSE_MACROS, getCategoryConfig, getMicrosForMacro } from '@/lib/detailedCategories';
import { budgetKey } from '@/lib/budgets';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { useCategoryAverage } from '@/hooks/useBudgetTracking';

type Scope = 'macro' | 'micro';

export interface BudgetFormTarget {
  category: string;
  subcategory: string | null;
}

interface BudgetFormModalProps {
  /** Orçamento em edição (null = novo) */
  initial: (BudgetFormTarget & { limit: number }) | null;
  /** Ao criar: categoria (e nível) já escolhidos, ex: "Definir limite" ou "+ Subcategoria" */
  preset?: { category?: string | null; scope?: Scope } | null;
  /** Chaves (ver budgetKey) que já têm orçamento ativo no mês */
  takenKeys: Set<string>;
  monthKey: string;
  /** Gasto do mês por chave de orçamento, para mostrar o impacto do limite */
  spentOf: (key: string) => number;
  onSave: (target: BudgetFormTarget, limit: number) => Promise<void>;
  onDeactivate?: (target: BudgetFormTarget) => Promise<void>;
  onDeleteHistory?: (target: BudgetFormTarget) => Promise<void>;
  onClose: () => void;
}

type Busy = null | 'save' | 'deactivate' | 'delete';

export default function BudgetFormModal({
  initial,
  preset,
  takenKeys,
  monthKey,
  spentOf,
  onSave,
  onDeactivate,
  onDeleteHistory,
  onClose,
}: BudgetFormModalProps) {
  const freeMicros = (macro: string) => getMicrosForMacro(macro).filter((m) => !takenKeys.has(budgetKey(macro, m)));
  const freeMacros = EXPENSE_MACROS.filter((c) => !takenKeys.has(c));
  const macrosWithFreeMicros = EXPENSE_MACROS.filter((c) => freeMicros(c).length > 0);

  const initialScope: Scope = initial ? (initial.subcategory ? 'micro' : 'macro') : (preset?.scope ?? (freeMacros.length > 0 ? 'macro' : 'micro'));
  const pickMacro = (scope: Scope, wanted?: string | null) => {
    const options = scope === 'macro' ? freeMacros : macrosWithFreeMicros;
    return wanted && (options as readonly string[]).includes(wanted) ? wanted : options[0] ?? '';
  };

  const [scope, setScope] = useState<Scope>(initialScope);
  const [category, setCategory] = useState(initial?.category ?? pickMacro(initialScope, preset?.category));
  const [subcategory, setSubcategory] = useState<string>(
    initial?.subcategory ?? (initialScope === 'micro' ? freeMicros(initial?.category ?? pickMacro('micro', preset?.category))[0] ?? '' : ''),
  );
  const [limit, setLimit] = useState(initial ? String(Math.round(initial.limit * 100)) : '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const swipeToClose = useSwipeToClose(onClose);

  const target: BudgetFormTarget = { category, subcategory: scope === 'micro' ? subcategory || null : null };
  const average = useCategoryAverage(category, target.subcategory);
  const microOptions = initial ? [initial.subcategory ?? ''] : freeMicros(category);

  const isLoading = busy !== null;
  const cfg = category ? getCategoryConfig(category) : null;
  const Icon = cfg?.icon;
  const limitValue = parseInt(limit || '0', 10) / 100;
  const spent = category ? spentOf(budgetKey(target.category, target.subcategory)) : 0;
  const monthLabel = monthKeyToLabel(monthKey);
  const targetLabel = target.subcategory ? `${target.subcategory} (${category})` : category;
  const canSubmit = !!category && (scope === 'macro' || !!subcategory);

  const changeScope = (next: Scope) => {
    setScope(next);
    const macro = pickMacro(next, category);
    setCategory(macro);
    setSubcategory(next === 'micro' ? freeMicros(macro)[0] ?? '' : '');
  };

  const changeCategory = (macro: string) => {
    setCategory(macro);
    if (scope === 'micro') setSubcategory(freeMicros(macro)[0] ?? '');
  };

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.');
      setBusy(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (limitValue <= 0) {
      setError('Informe um limite maior que zero.');
      return;
    }
    void run('save', () => onSave(target, limitValue));
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isLoading ? onClose : undefined}>
      <div
        className="modal-sheet animate-slide-in-sheet"
        onClick={(e) => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            {initial ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Prévia */}
          {cfg && Icon && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 16,
              borderRadius: 'var(--radius-lg)', background: cfg.bgColor,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: cfg.color, color: '#FFF', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {target.subcategory ? (
                    <>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{category} › </span>
                      {target.subcategory}
                    </>
                  ) : category}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Gasto em {monthLabel}: <strong>{formatCurrency(spent)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Nível do limite */}
          {!initial && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Limite para</label>
              <div role="radiogroup" aria-label="Nível do orçamento" style={{ display: 'flex', gap: 6 }}>
                {([
                  { id: 'macro', label: 'Categoria inteira', disabled: freeMacros.length === 0 },
                  { id: 'micro', label: 'Uma subcategoria', disabled: macrosWithFreeMicros.length === 0 },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={scope === opt.id}
                    className={`segmented-tab ${scope === opt.id ? 'active' : ''}`}
                    onClick={() => changeScope(opt.id)}
                    disabled={isLoading || opt.disabled}
                    style={{ flex: 1 }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={scope === 'micro' ? 'budget-form-pair' : undefined} style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoria</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => changeCategory(e.target.value)}
                disabled={isLoading || !!initial}
                required
              >
                {(initial ? [initial.category] : scope === 'macro' ? freeMacros : macrosWithFreeMicros).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {scope === 'micro' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Subcategoria</label>
                <select
                  className="form-select"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  disabled={isLoading || !!initial}
                  required
                >
                  {microOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: -8, marginBottom: 16, lineHeight: 1.4 }}>
            {scope === 'macro'
              ? 'Todas as subcategorias entram no limite (ex: Mercado, Delivery e Restaurante contam em Alimentação).'
              : takenKeys.has(category)
                ? `Sub-limite dentro do orçamento de ${category}: o gasto continua contando no total da categoria.`
                : 'Só os gastos lançados nessa subcategoria contam neste limite.'}
          </p>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Limite mensal (R$)</label>
            <input
              type="text"
              inputMode="numeric"
              className="form-input"
              required
              autoFocus={!initial}
              placeholder="R$ 0,00"
              value={formatMask(limit)}
              onChange={(e) => setLimit(parseMask(e.target.value))}
              disabled={isLoading}
            />
            {average > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setLimit(String(Math.round(average * 100)))}
                disabled={isLoading}
                style={{ fontSize: 12, padding: '4px 0', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Sparkles size={13} />
                Usar a média dos últimos meses: {formatCurrency(average)}
              </button>
            )}
            {limitValue > 0 && (
              <p style={{ fontSize: 12, color: spent > limitValue ? 'var(--red)' : 'var(--text-tertiary)', marginTop: 6 }}>
                {spent > limitValue
                  ? `Com esse limite, ${monthLabel} já estaria ${formatCurrency(spent - limitValue)} acima.`
                  : `Com esse limite, sobram ${formatCurrency(limitValue - spent)} em ${monthLabel}.`}
              </p>
            )}
          </div>

          <p style={{
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, padding: '10px 12px',
            borderRadius: 10, background: 'var(--bg-2)', marginBottom: 8,
          }}>
            Vale a partir de <strong style={{ textTransform: 'capitalize' }}>{monthLabel}</strong> e continua nos meses
            seguintes. Os meses anteriores mantêm o limite que tinham.
          </p>

          {error && (
            <p role="alert" style={{ fontSize: 13, color: 'var(--red)', marginTop: 8 }}>{error}</p>
          )}

          {/* Remoção: desativar daqui em diante (mantém o histórico) ou apagar tudo */}
          {initial && confirmRemove && (
            <div className="animate-fade-in" style={{
              marginTop: 16, padding: 14, borderRadius: 'var(--radius-lg)', border: '1px solid var(--separator)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Remover orçamento de {targetLabel}?</div>
              {onDeactivate && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={isLoading}
                  onClick={() => run('deactivate', () => onDeactivate(target))}
                  style={{ justifyContent: 'center', padding: 12, background: 'var(--orange-light)', color: 'var(--orange)', display: 'flex', gap: 8 }}
                >
                  {busy === 'deactivate' && <div className="btn-spinner" style={{ borderColor: 'rgba(255,149,0,0.3)', borderTopColor: 'var(--orange)' }} />}
                  Desativar a partir de {monthLabel}
                </button>
              )}
              {onDeleteHistory && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={isLoading}
                  onClick={() => run('delete', () => onDeleteHistory(target))}
                  style={{ justifyContent: 'center', padding: 12, background: 'var(--red-light)', color: 'var(--red)', display: 'flex', gap: 8 }}
                >
                  {busy === 'delete' && <div className="btn-spinner" style={{ borderColor: 'rgba(255,59,48,0.3)', borderTopColor: 'var(--red)' }} />}
                  Excluir de todos os meses
                </button>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Desativar mantém o histórico dos meses anteriores. Excluir apaga o orçamento de todos os meses.
                {!initial.subcategory && ' Os limites das subcategorias continuam valendo.'}
              </p>
              <button type="button" className="btn-ghost" disabled={isLoading} onClick={() => setConfirmRemove(false)} style={{ padding: 8 }}>
                Manter orçamento
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {initial ? (
              !confirmRemove && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ color: 'var(--red)', background: 'var(--red-light)', flex: 1, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading ? 0.5 : 1 }}
                  onClick={() => setConfirmRemove(true)}
                  disabled={isLoading}
                >
                  Remover
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={isLoading}
                style={{ flex: 1, padding: 14, opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !canSubmit}
              style={{ flex: 2, padding: 14, opacity: isLoading || !canSubmit ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {busy === 'save' && <div className="btn-spinner" />}
              {busy === 'save' ? 'Salvando...' : initial ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
