import confetti from 'canvas-confetti';

export function triggerSuccessConfetti() {
  const isMobile = window.innerWidth < 768;
  const colors = ['#34C759', '#32ADE6', '#FFD700', '#FFFFFF']; // Verde Apple, Azul, Dourado e Branco

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
