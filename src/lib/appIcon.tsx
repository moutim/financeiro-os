import { ImageResponse } from 'next/og';

/** Tamanhos PNG do manifest: o Android exige 192 e 512 para oferecer a instalação */
export const PWA_ICON_SIZES = [192, 512] as const;

/**
 * Ícone do app (carteira branca sobre o degradê azul), usado no iPhone (apple-icon)
 * e no manifest. O desenho ocupa ~53% do lado, dentro da área segura de ícones "maskable".
 */
export function renderAppIcon(size: number) {
  const glyphSize = Math.round(size * (96 / 180));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #007AFF, #5856D6)',
        }}
      >
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5.32 7.14 1.2 1.2 0 0 1-.81.16H5a2 2 0 0 1-2-2V7" />
          <path d="M3 5v14" />
          <path d="M22 11v2" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
