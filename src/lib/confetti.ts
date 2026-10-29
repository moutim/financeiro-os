import confetti from 'canvas-confetti';

const colors = ['#34C759', '#32ADE6', '#FFD700', '#FFFFFF']; // Verde Apple, Azul, Dourado e Branco

/** Duração das ondas de confete do mês quitado */
const MONTH_SETTLED_DURATION_MS = 1600;
/**
 * O pagamento que quita o mês também pede o confete comum, mas só depois que a
 * planilha responde: nesse intervalo ele é ignorado para não somar com o do mês.
 */
const SUPPRESS_AFTER_MONTH_SETTLED_MS = 10000;

let monthSettledAt = 0;

export function triggerSuccessConfetti() {
  if (Date.now() - monthSettledAt < SUPPRESS_AFTER_MONTH_SETTLED_MS) return;

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // Mobile: shoot from the bottom up to the middle
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 1 },
      startVelocity: 45,
      colors,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  } else {
    // Desktop: shoot from both bottom corners diagonally
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors,
      disableForReducedMotion: true,
      zIndex: 9999,
    });

    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  }
}

/** O pagamento quitou o mês: segura o confete comum até o do mês sair */
export function holdSuccessConfetti() {
  monthSettledAt = Date.now();
}

/** Mês quitado: ondas de confete dos dois lados, maior que a de um pagamento */
export function triggerMonthSettledConfetti() {
  // se o confete do pagamento já saiu, dá lugar ao do mês
  confetti.reset();

  const end = Date.now() + MONTH_SETTLED_DURATION_MS;
  const frame = () => {
    for (const side of [0, 1]) {
      confetti({
        particleCount: 3,
        angle: side === 0 ? 60 : 120,
        spread: 60,
        startVelocity: 55,
        origin: { x: side, y: 0.75 },
        colors,
        disableForReducedMotion: true,
        zIndex: 9999,
      });
    }
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
