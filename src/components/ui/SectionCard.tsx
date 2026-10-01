import type { ComponentType, CSSProperties, ReactNode } from 'react';
import GlassCard from '@/components/ui/GlassCard';

interface SectionCardProps {
  icon: ComponentType<{ size?: number; color?: string }>;
  title: ReactNode;
  /** Texto de apoio logo abaixo do título */
  description?: ReactNode;
  /** Controles alinhados à direita do título (filtros, setas, badges) */
  actions?: ReactNode;
  /** Cor do ícone (padrão: azul; use vermelho só para ações destrutivas) */
  iconColor?: string;
  /** Classes na <section> (ex: ordem no grid mobile do dashboard) */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Seção padrão do app: card com o título (ícone + texto) dentro, no mesmo
 * formato da página de Configurações.
 */
export default function SectionCard({
  icon: Icon,
  title,
  description,
  actions,
  iconColor = 'var(--blue)',
  className,
  style,
  children,
}: SectionCardProps) {
  return (
    <section className={className}>
      <GlassCard style={style}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: description ? 8 : 16,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <Icon size={18} color={iconColor} />
            {title}
          </h2>
          {actions && (
            <div className="section-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {actions}
            </div>
          )}
        </div>

        {description && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            {description}
          </p>
        )}

        {children}
      </GlassCard>
    </section>
  );
}
