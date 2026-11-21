'use client';

import { Info } from 'lucide-react';

/** Explicação curta ao passar o mouse, tocar ou focar no "i" (acessível por teclado) */
export default function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0} role="note" aria-label={text}>
      <Info size={13} aria-hidden />
      <span className="info-tip-text" aria-hidden>{text}</span>
    </span>
  );
}
