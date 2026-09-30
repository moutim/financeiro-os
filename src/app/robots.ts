import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // ATENÇÃO: Substitua pelo seu domínio real comprado
  const baseUrl = process.env.APP_URL || 'https://seudominio.com.br';

  return {
    rules: {
      userAgent: '*',
      // Páginas públicas que o Google deve ler
      allow: ['/', '/login', '/privacidade', '/termos'],
      // Páginas privadas que o Google não deve indexar
      disallow: ['/dashboard/', '/api/', '/settings/', '/cartoes/', '/categorias/', '/transacoes/', '/metas/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
