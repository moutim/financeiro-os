/**
 * Forma de um segmento do anel (viewBox 100×100, centro em 50,50):
 * - `arc`: arco para desenhar com `stroke` e `strokeLinecap="round"`;
 * - `dot`: fatia curta demais para um arco, desenhada como um ponto em (cx, cy)
 *   com o diâmetro da espessura do anel.
 */
export type RingShape =
  | { kind: 'arc'; d: string }
  | { kind: 'dot'; cx: number; cy: number };

export interface RingSegment {
  shape: RingShape;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Calcula os segmentos de um anel no estilo "pílulas": traço grosso, pontas
 * arredondadas e um respiro (`gap`, na unidade do viewBox) entre segmentos.
 * O anel começa no topo e segue no sentido horário.
 *
 * Fatias curtas demais para um arco viram um ponto e ganham um espaço mínimo
 * (o ponto + respiro), para continuarem visíveis; o restante do anel é
 * dividido proporcionalmente. Itens com fração ≤ 0 não aparecem no anel.
 */
export function buildRingSegments<T>(
  items: T[],
  fractionOf: (item: T) => number,
  { radius, strokeWidth, gap }: { radius: number; strokeWidth: number; gap: number },
): (T & RingSegment)[] {
  const visible = items.filter((item) => fractionOf(item) > 0);
  const circumference = 2 * Math.PI * radius;

  const pointAt = (arcLength: number) => {
    const angle = arcLength / radius;
    return { x: round(50 + radius * Math.sin(angle)), y: round(50 - radius * Math.cos(angle)) };
  };

  // Uma categoria só: anel inteiro, sem respiro
  if (visible.length === 1) {
    const top = pointAt(0);
    const bottom = pointAt(circumference / 2);
    const d = `M ${top.x} ${top.y} A ${radius} ${radius} 0 1 1 ${bottom.x} ${bottom.y} A ${radius} ${radius} 0 1 1 ${top.x} ${top.y}`;
    return [{ ...visible[0], shape: { kind: 'arc', d } }];
  }

  // Espaço de cada fatia no anel; as pequenas demais ficam com o mínimo de um ponto
  const fractions = visible.map(fractionOf);
  const minSpan = Math.min(strokeWidth + gap, circumference / Math.max(visible.length, 1));
  const pinned = new Set<number>();
  let spans: number[] = [];
  for (;;) {
    const flexFraction = fractions.reduce((sum, f, i) => (pinned.has(i) ? sum : sum + f), 0);
    const flexLength = circumference - pinned.size * minSpan;
    spans = fractions.map((f, i) => (pinned.has(i) ? minSpan : (f / flexFraction) * flexLength));
    const tooSmall = spans.flatMap((span, i) => (!pinned.has(i) && span < minSpan ? [i] : []));
    if (tooSmall.length === 0 || pinned.size + tooSmall.length >= visible.length) break;
    tooSmall.forEach((i) => pinned.add(i));
  }

  let offset = 0;
  return visible.map((item, i) => {
    const span = spans[i];
    const length = span - gap;
    const middle = offset + span / 2;
    const start = offset + gap / 2;
    offset += span;

    // Arco com pontas arredondadas só quando sobra comprimento além das duas pontas
    if (length - strokeWidth <= 0.01) {
      const center = pointAt(middle);
      return { ...item, shape: { kind: 'dot', cx: center.x, cy: center.y } };
    }

    // as pontas arredondadas avançam meia espessura além de cada extremidade do arco
    const from = pointAt(start + strokeWidth / 2);
    const to = pointAt(start + length - strokeWidth / 2);
    const largeArc = (length - strokeWidth) / radius > Math.PI ? 1 : 0;
    return { ...item, shape: { kind: 'arc', d: `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}` } };
  });
}
