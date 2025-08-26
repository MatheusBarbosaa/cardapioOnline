// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload, verifyToken } from './lib/auth';

// Tipagem segura do payload
function isJWTPayload(obj: unknown): obj is JWTPayload {
  if (typeof obj !== 'object' || obj === null) return false;

  const payload = obj as Record<string, unknown>;

  return (
    typeof payload.userId === 'string' &&
    typeof payload.restaurantId === 'string'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas protegidas do admin (exceto login e register)
  const isProtectedAdminRoute =
    pathname.startsWith('/admin') &&
    !pathname.includes('/login') &&
    !pathname.includes('/register');

  if (isProtectedAdminRoute) {
    const token = request.cookies.get('auth-token')?.value;

    // DEBUG - Remova os logs em produção se desejar
    console.log('🔍 Middleware - Pathname:', pathname);
    console.log('🔍 Middleware - Token exists:', !!token);

    if (!token) {
      console.log('❌ Middleware - No token, redirecting to login');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    let payload: JWTPayload | null = null;

    try {
      payload = await verifyToken(token);
    } catch (err) {
      console.error('❌ Middleware - Error verifying token:', err);
    }

    if (!payload || !isJWTPayload(payload)) {
      console.log('❌ Middleware - Invalid payload, redirecting to login');
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      // Limpa o cookie inválido
      response.cookies.set('auth-token', '', { maxAge: -1 });
      return response;
    }

    console.log('✅ Middleware - Auth passed');

    // Resposta com headers para SSR ou fetch interno
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-restaurant-id', payload.restaurantId);

    return response;
  }

  return NextResponse.next();
}

// Ative este middleware apenas para rotas de admin
export const config = {
  matcher: ['/admin/:path*'],
};
