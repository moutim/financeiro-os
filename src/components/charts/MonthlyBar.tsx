'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { formatCompact, formatCurrency } from '@/lib/currency';


interface MonthData {
  month: string;
  expenses: number;
  investments: number;
  balance: number;
}

interface MonthlyBarProps {
  data: MonthData[];
  selectedMonth: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--separator)',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: 'var(--shadow-md)',
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          fontSize: 13,
          marginBottom: 4,
          color: p.color,
        }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthlyBar({ data, selectedMonth }: MonthlyBarProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: 'var(--text-tertiary)', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCompact}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="expenses" name="Gastos" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-e-${index}`}
              fill={entry.month === data.find(d => d.month)?.month
                ? 'var(--blue)'
                : 'var(--blue)'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
        <Bar dataKey="investments" name="Investimentos" radius={[6, 6, 0, 0]} fill="var(--green)" fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
