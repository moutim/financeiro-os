'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Layers, ListTree, PieChart, Receipt } from 'lucide-react';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import { CategoryDistribution } from '@/components/charts/CategoryBreakdown';
import CategoryTransactionsModal from '@/components/charts/CategoryTransactionsModal';
import { formatCurrency, monthKeyToShortLabel } from '@/lib/currency';
import { analyzeSpending, NO_SUBCATEGORY, type MacroStat } from '@/lib/spendingAnalysis';
import { useCategorySpending } from '@/hooks/useCategorySpending';
import type { Transaction } from '@/lib/types';

const TABS = [
  { id: 'overview', label: 'Visão geral', icon: PieChart },
  { id: 'category', label: 'Categorias', icon: Layers },
  { id: 'sub', label: 'Subcategorias', icon: ListTree },
] as const;
type TabId = (typeof TABS)[number]['id'];

const SPARK_MONTHS = 6;
const INLINE_TRANSACTIONS = 5;
const pct = (share: number) => `${(share * 100).toFixed(share > 0 && share < 0.1 ? 1 : 0)}%`;

const count = (n: number) => `${n} ${n === 1 ? 'transação' : 'transações'}`;

/** Transações de uma categoria (e subcategoria, quando informada); "Geral" são as sem subcategoria */
function pick(transactions: Transaction[], category: string, sub?: string): Transaction[] {
  return transactions.filter((t) => {
    if ((t.category || 'Outros') !== category) return false;
    if (sub === undefined) return true;
    const own = t.subcategory?.trim();
    const effective = own && own !== category ? own : NO_SUBCATEGORY;
    return effective === sub;
  });
}

function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

interface ModalTarget { category: string; transactions: Transaction[]; total: number }

/** Maiores lançamentos do recorte, inline, com acesso à lista completa */
function InlineTransactions({ transactions, category, onOpen }: { transactions: Transaction[]; category: string; onOpen: (t: ModalTarget) => void }) {
  const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  return (
    <div className="cx-comp">
      <h4>Maiores lançamentos</h4>
      <ul className="cx-tree">
        {sorted.slice(0, INLINE_TRANSACTIONS).map((t) => (
          <li key={t.id}>
            <span>{t.name}{shortDate(t.date) && <em> {shortDate(t.date)}</em>}</span>
            <span>{formatCurrency(t.amount)}</span>
          </li>
        ))}
      </ul>
      {sorted.length > INLINE_TRANSACTIONS && (
        <button type="button" className="btn-ghost cx-more" onClick={() => onOpen({ category, transactions: sorted, total })}>
          <Receipt size={14} /> Ver todas ({sorted.length})
        </button>
      )}
    </div>
  );
}

/**
 * Análise de despesas do mês em uma só área, com navegação interna: visão geral (macro),
 * categorias (comparação e evolução) e subcategorias (ranking e ticket médio). Cada linha
 * se expande ali mesmo; nada abre em outra página.
 */
export default function ExpenseAnalysis() {
  const { taxonomy, selectedMonth, transactions, monthly } = useCategorySpending();
  const [tab, setTab] = useState<TabId>('overview');
  const [open, setOpen] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState('all');
  const [modal, setModal] = useState<ModalTarget | null>(null);

  const analysis = useMemo(() => analyzeSpending(transactions), [transactions]);

  const changeTab = (next: TabId) => { setTab(next); setOpen(null); };

  // Evolução: meses até o selecionado
  const months = useMemo(() => monthly.filter((m) => m.monthKey <= selectedMonth).slice(-SPARK_MONTHS), [monthly, selectedMonth]);
  const previous = months.length > 1 ? months[months.length - 2] : null;

  const subRows = useMemo(() => analysis.macros
    .filter((m) => subFilter === 'all' || m.category === subFilter)
    .flatMap((m) => m.micros.map((micro) => ({ macro: m.category, ...micro })))
    .sort((a, b) => b.total - a.total), [analysis, subFilter]);

  if (analysis.count === 0) {
    return (
      <section className="cx-section" aria-label="Análise de despesas">
        <header className="cx-head"><div><h2>Análise de despesas</h2><p>Para onde o dinheiro foi no mês</p></div></header>
        <p className="cx-empty-line">Nenhum gasto neste mês. Adicione transações para ver a análise.</p>
      </section>
    );
  }

  const expandable = (id: string, content: React.ReactNode, body: React.ReactNode, className = '') => (
    <div key={id} className={`cx-row-wrap${open === id ? ' is-open' : ''}`}>
      <button type="button" className={`cx-row ${className}`} aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
        {content}
      </button>
      {open === id && <div className="cx-expand animate-fade-in"><div className="cx-expand-main">{body}</div></div>}
    </div>
  );

  const macroBody = (m: MacroStat) => (
    <>
      <div className="cx-comp">
        <h4>Subcategorias de {m.category}</h4>
        {m.micros.map((micro) => (
          <div key={micro.name} className="cx-comp-line is-static">
            <span className="cx-comp-name">{micro.name}</span>
            <span className="cx-comp-values">
              {formatCurrency(micro.total)} <span className="cx-muted">{pct(micro.shareOfMacro)} · {count(micro.count)}</span>
            </span>
            <div className="budget-bar" style={{ height: 4 }}>
              <div className="budget-bar-fill" style={{ width: `${micro.shareOfMacro * 100}%`, background: taxonomy.getConfig(m.category).color }} />
            </div>
          </div>
        ))}
      </div>
      <InlineTransactions transactions={pick(transactions, m.category)} category={m.category} onOpen={setModal} />
    </>
  );

  return (
    <section className="cx-section" aria-label="Análise de despesas">
      <header className="cx-head">
        <div>
          <h2>Análise de despesas</h2>
          <p>
            {formatCurrency(analysis.total)} em {count(analysis.count)} · ticket médio {formatCurrency(analysis.ticket)}
          </p>
        </div>
        <SegmentedTabs tabs={TABS} value={tab} onChange={changeTab} />
      </header>

      {/* ── Visão geral: distribuição por categoria macro ── */}
      {tab === 'overview' && (
        <CategoryDistribution
          items={analysis.macros.map((m) => ({ cat: m.category, total: m.total, count: m.count, pct: m.share, config: taxonomy.getConfig(m.category) }))}
          total={analysis.total}
          totalLabel="Total gasto"
          formatCount={count}
          onSelect={(cat) => { changeTab('category'); setOpen(cat); }}
        />
      )}

      {/* ── Categorias: comparação, participação e evolução ── */}
      {tab === 'category' && (
        <div className="cx-table" role="table" aria-label="Gastos por categoria">
          <div className="cx-row cx-row-head cx-cols-cat" role="row">
            <span>Categoria</span><span className="num">Gasto</span><span className="num">% do total</span><span className="num">vs mês anterior</span><span>Últimos meses</span>
          </div>
          {analysis.macros.map((m) => {
            const cfg = taxonomy.getConfig(m.category);
            const prevValue = previous?.byCat[m.category] ?? 0;
            const delta = previous && prevValue > 0 ? (m.total - prevValue) / prevValue : null;
            const max = Math.max(...months.map((x) => x.byCat[m.category] ?? 0), 1);
            return expandable(m.category, (
              <>
                <span className="cx-cell-name">
                  <ChevronDown size={15} className="cx-chevron" aria-hidden />
                  <span className="cx-icon" style={{ background: cfg.bgColor, color: cfg.color }}><cfg.icon size={14} /></span>
                  <span className="cx-name"><strong>{m.category}</strong><small>{count(m.count)}</small></span>
                </span>
                <span className="num" data-label="Gasto">{formatCurrency(m.total)}</span>
                <span className="num" data-label="% do total">{pct(m.share)}</span>
                <span className="num" data-label="vs mês anterior" style={{ color: delta === null ? 'var(--text-tertiary)' : delta > 0.05 ? 'var(--red)' : delta < -0.05 ? 'var(--green)' : undefined }}>
                  {delta === null ? '—' : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)}%`}
                </span>
                <span className="cx-spark" aria-hidden>
                  {months.map((x) => {
                    const v = x.byCat[m.category] ?? 0;
                    return <i key={x.monthKey} title={`${monthKeyToShortLabel(x.monthKey)}: ${formatCurrency(v)}`}
                      style={{ height: `${v > 0 ? Math.max(12, (v / max) * 100) : 6}%`, background: x.monthKey === selectedMonth ? cfg.color : 'var(--bg-2)' }} />;
                  })}
                </span>
              </>
            ), macroBody(m), 'cx-cols-cat');
          })}
        </div>
      )}

      {/* ── Subcategorias: ranking, ticket médio e peso dentro da categoria ── */}
      {tab === 'sub' && (
        <>
          <div className="cx-toolbar">
            <ToolbarSelect aria-label="Filtrar por categoria" value={subFilter} onChange={(e) => { setSubFilter(e.target.value); setOpen(null); }}>
              <option value="all">Todas as categorias</option>
              {analysis.macros.map((m) => <option key={m.category} value={m.category}>{m.category}</option>)}
            </ToolbarSelect>
          </div>
          <div className="cx-table" role="table" aria-label="Ranking de subcategorias">
            <div className="cx-row cx-row-head cx-cols-sub" role="row">
              <span>Subcategoria</span><span className="num">Gasto</span><span className="num">Transações</span><span className="num">Ticket médio</span><span>Na categoria</span>
            </div>
            {subRows.map((r, i) => {
              const cfg = taxonomy.getConfig(r.macro);
              const id = `${r.macro}›${r.name}`;
              return expandable(id, (
                <>
                  <span className="cx-cell-name">
                    <ChevronDown size={15} className="cx-chevron" aria-hidden />
                    <span className="cx-rank">{i + 1}</span>
                    <span className="cx-name"><strong>{r.name}</strong><small>{r.macro}</small></span>
                  </span>
                  <span className="num" data-label="Gasto">{formatCurrency(r.total)}</span>
                  <span className="num" data-label="Transações">{r.count}</span>
                  <span className="num" data-label="Ticket médio">{formatCurrency(r.ticket)}</span>
                  <span className="cx-cell-bar" data-label="Na categoria">
                    <span className="budget-bar" style={{ height: 6 }}><span className="budget-bar-fill" style={{ width: `${r.shareOfMacro * 100}%`, background: cfg.color, display: 'block' }} /></span>
                    <b>{pct(r.shareOfMacro)}</b>
                  </span>
                </>
              ), <InlineTransactions transactions={pick(transactions, r.macro, r.name)} category={r.macro} onOpen={setModal} />, 'cx-cols-sub');
            })}
          </div>
          <p className="cx-note">{pct(subRows.reduce((s, r) => s + r.shareOfTotal, 0))} do total de despesas {subFilter === 'all' ? '' : `em ${subFilter}`}.</p>
        </>
      )}

      {modal && (
        <CategoryTransactionsModal category={modal.category} transactions={modal.transactions} total={modal.total} config={taxonomy.getConfig(modal.category)} onClose={() => setModal(null)} />
      )}
    </section>
  );
}
