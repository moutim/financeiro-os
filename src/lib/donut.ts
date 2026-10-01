/** Fatia de um donut SVG desenhado num viewBox 100×100 (centro 50,50, raio 40) */
export interface DonutSlice {
  pathData: string;
  startAngle: number;
  endAngle: number;
}

const R = 40;
const CX = 50;
const CY = 50;

function polar(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

/**
 * Calcula o path SVG de cada fatia. `fractionOf` devolve a fração do círculo
 * (0–1) ocupada pelo item.
 */
export function buildDonutSlices<T>(items: T[], fractionOf: (item: T) => number): (T & DonutSlice)[] {
  const slices: (T & DonutSlice)[] = [];
  let startAngle = 0;
  for (const item of items) {
    const angle = fractionOf(item) * 360;
    const endAngle = startAngle + angle;
    const start = polar(startAngle);
    const end = polar(endAngle);
    const pathData = angle >= 359.99
      ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`
      : `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${angle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
    slices.push({ ...item, pathData, startAngle, endAngle });
    startAngle = endAngle;
  }
  return slices;
}

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
