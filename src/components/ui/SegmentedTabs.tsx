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
 * do título / colunas iguais / controle segmentado do iOS no celular, com só o
 * ícone nas abas não selecionadas quando são 4 ou mais) fica no
 * .segmented-tabs do globals.css.
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
            // no celular, com 4+ abas, as não selecionadas mostram só o ícone: o nome fica acessível aqui
            aria-label={label}
            title={label}
            className={`segmented-tab ${isActive ? 'active' : ''}`}
          >
            <Icon size={14} />
            <span className="segmented-tab-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
