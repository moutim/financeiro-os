/** Segmento de um anel fino desenhado com stroke-dasharray num `<circle>` (viewBox 100×100) */
export interface RingSegment {
  dashArray: string;
  dashOffset: number;
}

/**
 * Calcula o traço de cada segmento de um anel. `gap` é o respiro entre
 * segmentos, na unidade do viewBox. O anel começa às 3h: gire o `<circle>`
 * em -90° para começar no topo.
 */
export function buildRingSegments<T>(
  items: T[],
  fractionOf: (item: T) => number,
  { radius, gap }: { radius: number; gap: number },
): (T & RingSegment)[] {
  const circumference = 2 * Math.PI * radius;
  const effectiveGap = items.length > 1 ? gap : 0;
  let offset = 0;
  return items.map((item) => {
    const length = fractionOf(item) * circumference;
    // fatias menores que o respiro somem em vez de virar um traço negativo
    const dash = Math.max(length - effectiveGap, 0);
    const segment = {
      ...item,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -(offset + effectiveGap / 2),
    };
    offset += length;
    return segment;
  });
}
