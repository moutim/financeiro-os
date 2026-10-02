'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useScrollChaining } from '@/hooks/useScrollChaining';

interface ScrollAreaProps {
  /** Altura máxima; acima disso o conteúdo rola dentro da área */
  maxHeight: number | string;
  children: ReactNode;
}

/**
 * Rolagem interna no estilo Apple: barra fina que só aparece no hover e
 * esmaecimento suave na borda em que ainda há conteúdo escondido. No toque,
 * chegando ao fim (ou ao topo), o próximo gesto rola a página.
 */
export default function ScrollArea({ maxHeight, children }: ScrollAreaProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useScrollChaining(areaRef);

  useEffect(() => {
    const area = areaRef.current;
    const content = contentRef.current;
    if (!area || !content) return;

    // atributos direto no DOM: rolar não re-renderiza o conteúdo
    const updateFades = () => {
      area.toggleAttribute('data-fade-top', area.scrollTop > 1);
      area.toggleAttribute('data-fade-bottom', area.scrollTop + area.clientHeight < area.scrollHeight - 1);
    };

    updateFades();
    area.addEventListener('scroll', updateFades, { passive: true });
    // troca de mês ou nova transação muda a altura do conteúdo
    const observer = new ResizeObserver(updateFades);
    observer.observe(area);
    observer.observe(content);

    return () => {
      area.removeEventListener('scroll', updateFades);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={areaRef} className="scroll-area" style={{ maxHeight }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
