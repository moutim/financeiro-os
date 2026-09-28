import type { MetadataRoute } from 'next';

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
    ],
  };
}
