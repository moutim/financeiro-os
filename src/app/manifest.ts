import type { MetadataRoute } from 'next';
import { PWA_ICON_SIZES } from '@/lib/appIcon';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Financeiro OS',
    short_name: 'Financeiro',
    description: 'Plataforma de controle financeiro pessoal com identidade visual Apple',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F2F7',
    theme_color: '#007AFF',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      // PNGs exigidos pelo Android para oferecer "Instalar app"
      ...PWA_ICON_SIZES.map((size) => ({
        src: `/pwa-icon/${size}`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any' as const,
      })),
      {
        src: '/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
