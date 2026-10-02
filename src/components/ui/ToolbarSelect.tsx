import type { ComponentType, SelectHTMLAttributes } from 'react';

interface ToolbarSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Ícone opcional à esquerda do valor (ex: ordenação) */
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
}

/**
 * Seletor compacto para as `actions` de um SectionCard: pílula na cor do usuário
 * (estilo "tinted" do iOS). Ícone e seta ficam no invólucro, porque um <select>
 * não aceita pseudo-elementos e a seta precisa acompanhar a cor personalizada.
 */
export default function ToolbarSelect({ icon: Icon, className, ...props }: ToolbarSelectProps) {
  return (
    <span className={`toolbar-select-wrap ${Icon ? 'has-icon' : ''}`}>
      {Icon && <Icon size={14} strokeWidth={2.25} />}
      <select className={`toolbar-select ${className ?? ''}`} {...props} />
    </span>
  );
}
