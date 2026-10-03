'use client';

import { CategoryDistribution } from '@/components/charts/CategoryBreakdown';
import { groupByCategory, isSpending, useCategoryTaxonomy } from '@/lib/taxonomy';
import type { Transaction } from '@/lib/types';

interface SpendingDonutProps {
  transactions: Transaction[];
}

/**
 * "Por Categoria" do dashboard: mesmo anel arredondado da Análise Avançada de Gastos
 * (Categorias e Cartões), com a legenda compacta (bolinha + nome) abaixo.
 */
export default function SpendingDonut({ transactions }: SpendingDonutProps) {
  const taxonomy = useCategoryTaxonomy();

  // Agrupa por categoria do modo atual (despesas e aportes, sem receitas/transferências)
  const spending = transactions
    .map(taxonomy.normalize)
    .filter((t) => t.amount > 0 && isSpending(t));

  const groups = groupByCategory(spending);
  const total = groups.reduce((sum, g) => sum + g.total, 0);

  if (groups.length === 0 || total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
        Sem dados para este mês
      </div>
    );
  }

  return (
    <CategoryDistribution
      items={groups.map((g) => ({
        cat: g.category,
        total: g.total,
        count: g.count,
        pct: g.total / total,
        config: taxonomy.getConfig(g.category),
      }))}
      total={total}
      totalLabel="Total gasto"
      legend="compact"
    />
  );
}
