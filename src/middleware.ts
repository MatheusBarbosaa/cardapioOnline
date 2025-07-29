import { NextRequest, NextResponse } from 'next/server';

import { JWTPayload, verifyToken } from './lib/auth';

// Verifica se payload é do tipo esperado
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

  // Rotas protegidas
  const isProtectedAdminRoute =
    pathname.startsWith('/admin') &&
    !pathname.includes('/login') &&
    !pathname.includes('/register');

  if (isProtectedAdminRoute) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const payload = await verifyToken(token);

    if (!payload || !isJWTPayload(payload)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Verificação opcional de slug no caminho
    const slugFromPath = pathname.split('/')[2];

    if (slugFromPath && slugFromPath !== '') {
      // Aqui você poderia apenas comparar com o slug do payload, se tiver
      // ou ignorar essa verificação
    }

    // Se passou nas verificações, deixa prosseguir
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-restaurant-id', payload.restaurantId);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
