'use client';

import { formatCurrency } from '@/lib/currency';
import { groupByCategory, isSpending, splitBySubCategory, useCategoryTaxonomy } from '@/lib/taxonomy';
import type { Transaction } from '@/lib/types';

interface SpendingTreeProps {
  transactions: Transaction[];
}

/** Análise do mês no modo detalhado: árvore Macro › Micro com totais por nível */
export default function SpendingTree({ transactions }: SpendingTreeProps) {
  const taxonomy = useCategoryTaxonomy();
  const groups = groupByCategory(transactions.flatMap(splitBySubCategory).map(taxonomy.normalize).filter(isSpending))
    .filter((g) => g.total > 0);

  return (
    <>
      {groups.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum gasto registrado neste mês.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map((group, index) => {
            const cfg = taxonomy.getConfig(group.category);
            const isLast = index === groups.length - 1;
            const sortedMicros = Object.entries(group.subcategories).sort((a, b) => b[1] - a[1]);

            return (
              <div
                key={group.category}
                style={{
                  paddingBottom: isLast ? 0 : 10,
                  borderBottom: isLast ? 'none' : '1px solid var(--separator)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', color: cfg.color }}>
                      <cfg.icon size={16} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {group.category}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>
                    {formatCurrency(group.total)}
                  </span>
                </div>

                {sortedMicros.length > 0 && (
                  <div style={{ marginTop: 4, marginLeft: 22, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {sortedMicros.map(([subName, subAmt], mIdx) => {
                      const isLastMicro = mIdx === sortedMicros.length - 1;
                      return (
                        <div key={subName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--text-quaternary)', fontFamily: 'monospace' }}>
                              {isLastMicro ? '└──' : '├──'}
                            </span>
                            {subName}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{formatCurrency(subAmt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
