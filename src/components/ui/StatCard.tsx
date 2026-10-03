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
        style={{ background: bgColor, color: color, width: 36, height: 36, borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {icon}
      </div>
      <div
        className="stat-card-value"
        style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {formatCurrency(value)}
        {/* Seta em em: acompanha a fonte do valor e cabe na altura da linha (1.1em), sem empurrar o valor para baixo no mobile */}
        {isNegative !== undefined && (
          isNegative ? (
            <ArrowDown size="0.9em" strokeWidth={3} color="var(--red)" style={{ flexShrink: 0 }} />
          ) : (
            <ArrowUp size="0.9em" strokeWidth={3} color="var(--green)" style={{ flexShrink: 0 }} />
          )
        )}
      </div>
      <div className="stat-card-label">{label}</div>
    </GlassCard>
  );
}
