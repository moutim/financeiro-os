'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import { getCategoryConfig } from '@/lib/categories';
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
  // Group by category
  const byCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.amount > 0) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    }
  });

  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value, color: getCategoryConfig(name).color }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
        Sem dados para este mês
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
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
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
