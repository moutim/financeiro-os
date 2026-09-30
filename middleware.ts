import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Rotas públicas
  const publicRoutes = ['/login', '/privacidade', '/termos', '/', '/sitemap.xml', '/robots.txt'];
  const isPublic = publicRoutes.includes(pathname) || pathname.startsWith('/api/auth') || pathname.endsWith('.svg');

  // Se já estiver logado e tentar acessar /login, manda pro dashboard
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }

  // Deixa passar se for rota pública
  if (isPublic) return NextResponse.next();

  // Sem sessão → manda para login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Aplica o middleware em todas as rotas exceto assets estáticos
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
