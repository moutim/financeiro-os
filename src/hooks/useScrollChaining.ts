import { useEffect, type RefObject } from 'react';

/** Deslocamento mínimo (px) antes de decidir quem rola: a área interna ou a página */
const DECIDE_THRESHOLD = 4;
/** Desaceleração da inércia por milissegundo — a mesma do scroll do iOS */
const DECELERATION = 0.998;
/** Abaixo dessa velocidade (px/ms) a inércia para */
const MIN_VELOCITY = 0.02;
/** Dedo parado por mais tempo que isso antes de soltar: sem inércia */
const RELEASE_IDLE_MS = 100;

/**
 * Rolagem encadeada no toque: com a área interna no fim (ou no topo), o gesto que passaria do limite
 * rola a página. No iOS a área interna prende o gesto e só "quica", e a página só rolava tocando fora
 * dela; aqui a página é rolada direto, com inércia. Gestos dentro dos limites seguem nativos.
 */
export function useScrollChaining(areaRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    let mode: 'native' | 'undecided' | 'page' = 'native';
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0; // px/ms; positivo = página descendo
    let momentumFrame = 0;

    const onTouchStart = (e: TouchEvent) => {
      cancelAnimationFrame(momentumFrame);
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = lastY = touch.clientY;
      lastTime = e.timeStamp;
      velocity = 0;
      // sem conteúdo escondido a área nem rola: o navegador já leva o gesto para a página
      mode = e.touches.length === 1 && area.scrollHeight > area.clientHeight + 1 ? 'undecided' : 'native';
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];

      if (mode === 'undecided') {
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < DECIDE_THRESHOLD) return;

        const atTop = area.scrollTop <= 0;
        const atBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 1;
        const pastEdge = (atBottom && dy < 0) || (atTop && dy > 0);
        // depois que o navegador começa a rolar, o gesto não pode mais ser desviado
        mode = pastEdge && Math.abs(dy) > Math.abs(dx) && e.cancelable ? 'page' : 'native';
      }
      if (mode !== 'page') return;

      e.preventDefault();
      const delta = lastY - touch.clientY;
      const elapsed = Math.max(e.timeStamp - lastTime, 1);
      velocity = 0.8 * (delta / elapsed) + 0.2 * velocity;
      window.scrollBy(0, delta);
      lastY = touch.clientY;
      lastTime = e.timeStamp;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (mode !== 'page') return;
      mode = 'native';
      if (e.type === 'touchcancel' || e.timeStamp - lastTime > RELEASE_IDLE_MS) return;

      let v = velocity;
      let prev = performance.now();
      let pending = 0; // frações de pixel acumuladas: um passo menor que 1px não move a página
      const step = (now: number) => {
        const elapsed = now - prev;
        prev = now;
        v *= Math.pow(DECELERATION, elapsed);
        pending += v * elapsed;
        const px = Math.trunc(pending);
        if (px !== 0) {
          window.scrollBy(0, px);
          pending -= px;
        }
        // para no fim (ou no topo) da página
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const atPageEdge = v > 0 ? window.scrollY >= maxScroll - 1 : window.scrollY <= 0;
        if (Math.abs(v) < MIN_VELOCITY || atPageEdge) return;
        momentumFrame = requestAnimationFrame(step);
      };
      momentumFrame = requestAnimationFrame(step);
    };

    area.addEventListener('touchstart', onTouchStart, { passive: true });
    // passive: false — é preciso cancelar o gesto da área interna para rolar a página
    area.addEventListener('touchmove', onTouchMove, { passive: false });
    area.addEventListener('touchend', onTouchEnd);
    area.addEventListener('touchcancel', onTouchEnd);

    return () => {
      cancelAnimationFrame(momentumFrame);
      area.removeEventListener('touchstart', onTouchStart);
      area.removeEventListener('touchmove', onTouchMove);
      area.removeEventListener('touchend', onTouchEnd);
      area.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [areaRef]);
}
