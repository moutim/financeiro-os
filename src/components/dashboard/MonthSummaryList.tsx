'use client';

import { formatCurrency } from '@/lib/currency';
import { groupByCategory, useCategoryTaxonomy } from '@/lib/taxonomy';
import type { Transaction } from '@/lib/types';

interface MonthSummaryListProps {
  transactions: Transaction[];
}

/** Resumo do mês no modo simples: total por categoria, sem subcategorias */
export default function MonthSummaryList({ transactions }: MonthSummaryListProps) {
  const taxonomy = useCategoryTaxonomy();
  // Mantém a ordem fixa das categorias (como no seletor), não por valor
  const order = (category: string) => {
    const i = taxonomy.categories.indexOf(category);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const groups = groupByCategory(transactions.map(taxonomy.normalize))
    .filter((g) => g.total > 0)
    .sort((a, b) => order(a.category) - order(b.category));

  return (
    <>
      {groups.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum gasto registrado neste mês.</p>
      ) : (
        groups.map((group, index) => {
          const cfg = taxonomy.getConfig(group.category);
          const isLast = index === groups.length - 1;
          return (
            <div key={group.category} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: isLast ? 'none' : '1px solid var(--separator)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', color: cfg.color }}><cfg.icon size={18} /></span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: cfg.color }}>{formatCurrency(group.total)}</span>
            </div>
          );
        })
      )}
    </>
  );
}
