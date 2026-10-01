'use client';

import { useCallback, useEffect, useState } from 'react';

const EDGE_TOLERANCE = 10;

/**
 * Estado de um carrossel com rolagem horizontal: se dá para rolar para cada
 * lado e um `scroll` para as setas. Passe `ref` como `ref` do trilho.
 */
export function useCarousel<T extends HTMLElement = HTMLDivElement>(step = 336) {
  // Elemento em estado (callback ref): o trilho pode montar depois do 1º render
  const [track, setTrack] = useState<T | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!track) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = track;
      setCanScrollLeft(scrollLeft > EDGE_TOLERANCE);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - EDGE_TOLERANCE);
    };

    // Recalcula ao rolar, ao redimensionar e quando itens entram/saem
    const resize = new ResizeObserver(update);
    const mutation = new MutationObserver(update);
    resize.observe(track);
    mutation.observe(track, { childList: true });
    track.addEventListener('scroll', update, { passive: true });

    return () => {
      resize.disconnect();
      mutation.disconnect();
      track.removeEventListener('scroll', update);
    };
  }, [track]);

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      track?.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
    },
    [track, step],
  );

  return { ref: setTrack, canScrollLeft, canScrollRight, scroll };
}
