'use client';

import type { ComponentType } from 'react';

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

interface SegmentedTabsProps<T extends string> {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
}

/**
 * Abas de visualização para as `actions` de um SectionCard. A selecionada usa a
 * cor do usuário, como o seletor Saída/Entrada. O layout responsivo (na linha
 * do título / colunas iguais / 2 por linha) fica no .segmented-tabs do globals.css.
 */
export default function SegmentedTabs<T extends string>({ tabs, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="segmented-tabs">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              minWidth: 0,
              background: isActive ? 'var(--blue)' : 'transparent',
              color: isActive ? '#FFF' : 'var(--text-tertiary)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
