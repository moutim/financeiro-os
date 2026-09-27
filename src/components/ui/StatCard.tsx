import GlassCard from './GlassCard';
import { formatCurrency } from '@/lib/currency';

import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color?: string;
  bgColor?: string;
  isNegative?: boolean;
  prefix?: string;
  delay?: number;
}

export default function StatCard({
  icon,
  label,
  value,
  color = 'var(--blue)',
  bgColor = 'var(--blue-light)',
  isNegative,
  delay = 0,
}: StatCardProps) {
  const isNeg = isNegative ?? value < 0;
  const displayColor = isNegative !== undefined
    ? (isNegative ? 'var(--red)' : 'var(--green)')
    : color;

  return (
    <GlassCard
      className="stat-card animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div
        className="stat-card-icon"
        style={{ background: bgColor, color: displayColor }}
      >
        {icon}
      </div>
      <div
        className="stat-card-value"
        style={{ color: displayColor }}
      >
        {formatCurrency(value)}
      </div>
      <div className="stat-card-label">{label}</div>
    </GlassCard>
  );
}
