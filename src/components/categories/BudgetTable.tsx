'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Pencil, Plus, Receipt, Search } from 'lucide-react';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import { BudgetBar, StatusLabel } from './BudgetBar';
import { formatCurrency } from '@/lib/currency';
import { getCategoryConfig } from '@/lib/detailedCategories';
import { BUDGET_STATUS, STATUS_SEVERITY } from '@/lib/budgets';
import type { BudgetRow, UnbudgetedRow } from '@/hooks/useBudgetTracking';

type SortOption = 'spent-desc' | 'pct-desc' | 'name-asc';
type FilterOption = 'all' | 'alert' | 'over';

const SORTS: { id: SortOption; label: string; title: string }[] = [
  { id: 'spent-desc', label: 'Maior gasto', title: 'Maior gasto primeiro' },
  { id: 'pct-desc', label: 'Mais consumido', title: 'Maior % do orçamento usado primeiro' },
  { id: 'name-asc', label: 'A–Z', title: 'Ordem alfabética' },
];

const MAX_TREE_ITEMS = 5;

interface Props {
  rows: BudgetRow[];
  unbudgeted: UnbudgetedRow[];
  totalSpending: number;
  isPast: boolean;
  monthLabel: string;
  expandedKey: string | null;
  onExpand: (key: string | null) => void;
  canAdd: boolean;
  hasFreeMicros: (category: string) => boolean;
  /** A categoria aceita orçamento da categoria inteira (macro de despesa ainda sem limite) */
  canDefine: (category: string) => boolean;
  onNew: () => void;
  onEdit: (row: BudgetRow) => void;
  onAddMicro: (category: string) => void;
  onDefine: (category: string) => void;
  onShowTransactions: (row: BudgetRow) => void;
}

function CategoryDot({ category }: { category: string }) {
  const cfg = getCategoryConfig(category);
  const Icon = cfg.icon;
  return (
    <span className="cx-icon" style={{ background: cfg.bgColor, color: cfg.color }} aria-hidden>
      <Icon size={14} />
    </span>
  );
}

/** Subcategorias com limite próprio e o que sobra do limite da categoria para as demais */
function Composition({ row, onEditMicro }: { row: BudgetRow; onEditMicro: (micro: BudgetRow) => void }) {
  const c = row.composition;
  if (!c) return null;
  const hasMicros = row.micros.length > 0;
  const shown = c.restItems.slice(0, MAX_TREE_ITEMS);
  const hidden = c.restItems.slice(MAX_TREE_ITEMS);
  const restBase = hasMicros ? c.restSpent : row.spent;
  if (!hasMicros && c.restItems.length === 0) return <p className="cx-muted">Sem gastos por subcategoria neste mês.</p>;

  return (
    <div className="cx-comp">
      <h4>{hasMicros ? 'Composição do orçamento' : 'Gasto por subcategoria'}</h4>
      {row.micros.map((m) => {
        const info = BUDGET_STATUS[m.status];
        return (
          <button key={m.key} type="button" className="cx-comp-line" onClick={() => onEditMicro(m)} aria-label={`Editar limite de ${m.label}`}>
            <span className="cx-comp-name">{m.label}</span>
            <span className="cx-comp-values">
              {formatCurrency(m.spent)} <span className="cx-muted">/ {formatCurrency(m.limit)}</span>
              <strong style={{ color: info.color }}>{m.pct}%</strong>
            </span>
            <BudgetBar pct={m.rawPct} status={m.status} height={4} label={`Consumo de ${m.label}`} />
          </button>
        );
      })}

      {hasMicros && (
        <div className="cx-comp-line is-static">
          <span className="cx-comp-name">Demais subcategorias</span>
          <span className="cx-comp-values">
            {formatCurrency(c.restSpent)}
            {c.restLimit > 0
              ? <><span className="cx-muted"> / {formatCurrency(c.restLimit)}</span><strong style={{ color: BUDGET_STATUS[c.restStatus].color }}>{c.restPct}%</strong></>
              : <span className="cx-muted"> · sem limite reservado</span>}
          </span>
          {c.restLimit > 0 && <BudgetBar pct={c.restRawPct} status={c.restStatus} height={4} label="Consumo das demais subcategorias" />}
          {c.overAllocated && (
            <p className="cx-warn">Os sub-limites somam {formatCurrency(c.microLimitTotal)}, acima do limite de {row.category} ({formatCurrency(row.limit)}).</p>
          )}
        </div>
      )}

      {c.restItems.length > 0 && (
        <ul className="cx-tree">
          {shown.map((item) => (
            <li key={item.name}>
              <span>{item.name}</span>
              <span>{formatCurrency(item.spent)}{restBase > 0 && <em> {Math.round((item.spent / restBase) * 100)}%</em>}</span>
            </li>
          ))}
          {hidden.length > 0 && (
            <li className="cx-muted">
              <span>+ {hidden.length} {hidden.length === 1 ? 'outra' : 'outras'}</span>
              <span>{formatCurrency(hidden.reduce((s, i) => s + i.spent, 0))}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Orçamentos lado a lado: uma linha por categoria com a barra de consumo integrada. Clicar
 * na linha abre a composição (subcategorias) e as ações ali mesmo, sem trocar de tela.
 */
export default function BudgetTable({
  rows, unbudgeted, totalSpending, isPast, monthLabel, expandedKey, onExpand, canAdd, hasFreeMicros, canDefine,
  onNew, onEdit, onAddMicro, onDefine, onShowTransactions,
}: Props) {
  const [sortBy, setSortBy] = useState<SortOption>('spent-desc');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [search, setSearch] = useState('');

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => !term || r.label.toLowerCase().includes(term) || r.category.toLowerCase().includes(term)
        || r.micros.some((m) => m.label.toLowerCase().includes(term)))
      .filter((r) => filter === 'all'
        || (filter === 'over' ? r.status === 'over' || r.status === 'reached' : STATUS_SEVERITY[r.status] >= STATUS_SEVERITY.alert))
      .sort((a, b) => {
        if (sortBy === 'pct-desc') return b.rawPct - a.rawPct || b.spent - a.spent;
        if (sortBy === 'name-asc') return a.label.localeCompare(b.label);
        return b.spent - a.spent || b.limit - a.limit;
      });
  }, [rows, search, filter, sortBy]);

  const visibleUnbudgeted = useMemo(() => {
    const term = search.trim().toLowerCase();
    // o filtro por situação só se aplica a quem tem orçamento
    return filter !== 'all' ? [] : unbudgeted.filter((u) => !term || u.category.toLowerCase().includes(term));
  }, [unbudgeted, search, filter]);

  const hasBudgets = rows.length > 0;

  return (
    <section className="cx-section" id="cx-budgets" aria-label="Orçamentos por categoria">
      <header className="cx-head">
        <div>
          <h2>Orçamentos por categoria</h2>
          <p>{hasBudgets ? `Gasto contra o limite de cada categoria em ${monthLabel}. Clique numa linha para abrir os detalhes.` : 'Defina quanto pode gastar em cada categoria.'}</p>
        </div>
        {canAdd && (
          <button type="button" className="btn-primary cx-new" onClick={onNew}>
            <Plus size={16} strokeWidth={2.5} /> Novo orçamento
          </button>
        )}
      </header>

      {hasBudgets && (
        <div className="cx-toolbar">
          <div className="cx-search">
            <Search size={14} aria-hidden />
            <input type="search" placeholder="Buscar categoria…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar categoria" />
          </div>
          <ToolbarSelect aria-label="Filtrar por situação" value={filter} onChange={(e) => setFilter(e.target.value as FilterOption)}>
            <option value="all">Todas</option>
            <option value="alert">Perto do limite ou acima</option>
            <option value="over">Ultrapassadas ou no limite</option>
          </ToolbarSelect>
          <div className="category-sort-group" role="group" aria-label="Ordenar">
            {SORTS.map((o) => (
              <button key={o.id} type="button" title={o.title} aria-pressed={sortBy === o.id}
                className={`segmented-tab ${sortBy === o.id ? 'active' : ''}`} onClick={() => setSortBy(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasBudgets ? (
        <div className="cx-table" role="table" aria-label="Orçamentos">
          <div className="cx-row cx-row-head" role="row">
            <span role="columnheader">Categoria</span>
            <span role="columnheader" className="num">Orçamento</span>
            <span role="columnheader" className="num">Gasto</span>
            <span role="columnheader" className="num">{isPast ? 'Sobrou' : 'Disponível'}</span>
            <span role="columnheader">Consumo</span>
          </div>

          {visibleRows.map((row) => {
            const open = expandedKey === row.key;
            const over = row.remaining < 0;
            const info = BUDGET_STATUS[row.status];
            return (
              <div key={row.key} id={`cx-row-${row.key}`} className={`cx-row-wrap${open ? ' is-open' : ''}`}>
                <button type="button" className="cx-row" role="row" aria-expanded={open} onClick={() => onExpand(open ? null : row.key)}>
                  <span className="cx-cell-name" role="rowheader">
                    <ChevronDown size={15} className="cx-chevron" aria-hidden />
                    <CategoryDot category={row.category} />
                    <span className="cx-name">
                      {row.subcategory && <small>{row.category} ›</small>}
                      <strong>{row.label}</strong>
                    </span>
                  </span>
                  <span className="num" role="cell" data-label="Orçamento">{formatCurrency(row.limit)}</span>
                  <span className="num" role="cell" data-label="Gasto">{formatCurrency(row.spent)}</span>
                  <span className="num" role="cell" data-label={over ? 'Excedido' : isPast ? 'Sobrou' : 'Disponível'} style={{ color: over ? 'var(--red)' : undefined }}>
                    {over ? `−${formatCurrency(Math.abs(row.remaining))}` : formatCurrency(row.remaining)}
                  </span>
                  <span className="cx-cell-bar" role="cell">
                    <BudgetBar pct={row.rawPct} status={row.status} height={6} label={`Consumo de ${row.label}`} />
                    <b style={{ color: info.color }}>{row.pct}%</b>
                  </span>
                </button>

                {open && (
                  <div className="cx-expand animate-fade-in">
                    <div className="cx-expand-main">
                      <div className="cx-expand-meta">
                        <StatusLabel status={row.status} />
                        <span>{row.count} {row.count === 1 ? 'transação' : 'transações'} no mês</span>
                      </div>
                      {!row.subcategory ? <Composition row={row} onEditMicro={onEdit} /> : (
                        <p className="cx-muted">Limite definido só para esta subcategoria de {row.category}.</p>
                      )}
                    </div>
                    <div className="cx-expand-actions">
                      <button type="button" className="btn-secondary" onClick={() => onEdit(row)}><Pencil size={14} /> Editar orçamento</button>
                      {!row.subcategory && hasFreeMicros(row.category) && (
                        <button type="button" className="btn-ghost" onClick={() => onAddMicro(row.category)}><Plus size={14} /> Limite para subcategoria</button>
                      )}
                      <button type="button" className="btn-ghost" onClick={() => onShowTransactions(row)}><Receipt size={14} /> Ver transações</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleRows.length === 0 && <p className="cx-empty-line">Nenhum orçamento com esse filtro.</p>}
        </div>
      ) : (
        <div className="budget-empty">
          <div className="budget-empty-icon"><Plus size={26} /></div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Defina quanto pode gastar em cada categoria</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, lineHeight: 1.5, margin: '6px auto 16px' }}>
            Escolha só o que quer controlar: uma categoria inteira ou uma subcategoria. O app soma as
            transações do mês (parcelas pelo valor de cada mês) e avisa quando você chegar perto do limite.
          </p>
          <button type="button" className="btn-primary" onClick={() => (unbudgeted[0] ? onDefine(unbudgeted[0].category) : onNew())}>
            <Plus size={16} strokeWidth={2.5} /> Criar primeiro orçamento
          </button>
        </div>
      )}

      {/* Categorias com gasto e sem limite: grupo à parte, com a ação de definir limite */}
      {visibleUnbudgeted.length > 0 && (
        <div className="cx-group">
          <h3>Sem orçamento definido <span className="cx-muted">· {visibleUnbudgeted.length}</span></h3>
          <ul className="cx-unbudgeted">
            {visibleUnbudgeted.map((u) => (
              <li key={u.category}>
                <CategoryDot category={u.category} />
                <span className="cx-name">
                  <strong>{u.category}</strong>
                  <small>{u.count} {u.count === 1 ? 'transação' : 'transações'}{totalSpending > 0 ? ` · ${Math.round((u.spent / totalSpending) * 100)}% do gasto do mês` : ''}</small>
                </span>
                <span className="num cx-unbudgeted-value">{formatCurrency(u.spent)}</span>
                {canDefine(u.category) && (
                  <button type="button" className="btn-ghost cx-define" onClick={() => onDefine(u.category)}>Definir limite</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
