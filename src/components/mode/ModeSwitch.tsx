'use client';

import type { ComponentType, ReactNode } from 'react';
import { useIsDetailedMode } from '@/lib/appConfigStore';

/**
 * Pontos de extensão do Modo Detalhado. Escolha o menor que resolve:
 *
 * - <DetailedOnly>     → acrescenta um bloco que só existe no modo detalhado
 * - <ModeSwitch>       → troca um bloco inteiro entre as duas versões
 * - withModeVariants() → troca um componente inteiro (mesmas props nas duas versões)
 *
 * Guia completo: docs/GUIA-MODO-DETALHADO.md
 */

interface ModeSwitchProps {
  simple: ReactNode;
  detailed: ReactNode;
}

export function ModeSwitch({ simple, detailed }: ModeSwitchProps) {
  const isDetailed = useIsDetailedMode();
  return <>{isDetailed ? detailed : simple}</>;
}

interface DetailedOnlyProps {
  children: ReactNode;
  /** Renderizado no modo simples (padrão: nada) */
  fallback?: ReactNode;
}

export function DetailedOnly({ children, fallback = null }: DetailedOnlyProps) {
  const isDetailed = useIsDetailedMode();
  return <>{isDetailed ? children : fallback}</>;
}

export function withModeVariants<P extends object>(
  Simple: ComponentType<P>,
  Detailed: ComponentType<P>,
) {
  function ModeVariant(props: P) {
    const isDetailed = useIsDetailedMode();
    return isDetailed ? <Detailed {...props} /> : <Simple {...props} />;
  }
  ModeVariant.displayName = `ModeVariant(${Simple.displayName || Simple.name})`;
  return ModeVariant;
}
