import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glass?: boolean;
  padding?: number | string;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = '',
  style,
  glass = false,
  padding = '20px',
  onClick,
}: GlassCardProps) {
  return (
    <div
      className={`${glass ? 'glass-card' : 'card'} ${className}`}
      style={{ padding, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
