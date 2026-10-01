'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import { groupByCategory, isSpending, useCategoryTaxonomy } from '@/lib/taxonomy';
import { formatCurrency } from '@/lib/currency';
import type { Transaction } from '@/lib/types';

interface SpendingDonutProps {
  transactions: Transaction[];
}

const RADIAN = Math.PI / 180;

function CustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if ((percent ?? 0) < 0.05) return null;

  const cxN = Number(cx ?? 0);
  const cyN = Number(cy ?? 0);
  const mid = Number(midAngle ?? 0);
  const inner = Number(innerRadius ?? 0);
  const outer = Number(outerRadius ?? 0);

  const radius = inner + (outer - inner) * 0.5;
  const x = cxN + radius * Math.cos(-mid * RADIAN);
  const y = cyN + radius * Math.sin(-mid * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
}


interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--separator)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{payload[0].name}</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        {formatCurrency(payload[0].value)}
      </div>
    </div>
  );
}

export default function SpendingDonut({ transactions }: SpendingDonutProps) {
  const taxonomy = useCategoryTaxonomy();

  // Agrupa por categoria do modo atual (despesas e aportes, sem receitas/transferências)
  const spending = transactions
    .map(taxonomy.normalize)
    .filter((t) => t.amount > 0 && isSpending(t));

  const data = groupByCategory(spending).map((g) => ({
    name: g.category,
    value: g.total,
    color: taxonomy.getConfig(g.category).color,
  }));

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
        Sem dados para este mês
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            // raios relativos à área do gráfico: o donut sempre cabe inteiro
            innerRadius="57%"
            outerRadius="95%"
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda fora do SVG: quebra em quantas linhas precisar sem encolher nem cobrir o donut */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', marginTop: 12 }}>
        {data.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{entry.name}</span>
          </div>
        ))}
      </div>
    </>
  );
}
