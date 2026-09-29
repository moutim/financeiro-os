import GlassCard from './GlassCard';
import { formatCurrency } from '@/lib/currency';
import { ArrowUp, ArrowDown } from 'lucide-react';

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

  return (
    <GlassCard
      className="stat-card animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div
        className="stat-card-icon"
        style={{ background: 'var(--surface)', border: `1px solid ${color}`, color: color, width: 32, height: 32, borderRadius: 10, marginBottom: 12 }}
      >
        {icon}
      </div>
      <div
        className="stat-card-value"
        style={{ color: color, display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {formatCurrency(value)}
        {isNegative !== undefined && (
          isNegative ? (
            <ArrowDown size={22} strokeWidth={3} color="var(--red)" style={{ marginTop: 2 }} />
          ) : (
            <ArrowUp size={22} strokeWidth={3} color="var(--green)" style={{ marginTop: 2 }} />
          )
        )}
      </div>
      <div className="stat-card-label">{label}</div>
    </GlassCard>
  );
}
