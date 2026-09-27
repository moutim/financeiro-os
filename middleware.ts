import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Rotas públicas — nunca redirecionar
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
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
