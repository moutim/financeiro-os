'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCompact, formatCurrency } from '@/lib/currency';

interface ProjectionData {
  month: string;
  utilizado: number;
  disponivel: number;
}

interface CreditProjectionChartProps {
  data: ProjectionData[];
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

export default function CreditProjectionChart({ data }: CreditProjectionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--separator)', opacity: 0.4 }} />
        <Bar
          dataKey="utilizado"
          name="Fatura Estimada"
          stackId="a"
          fill="var(--orange)"
        />
        <Bar
          dataKey="disponivel"
          name="Limite Disponível"
          stackId="a"
          fill="var(--green)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
