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

  const isProtectedAdminRoute =
    pathname.startsWith('/admin') &&
    !pathname.includes('/login') &&
    !pathname.includes('/register');

  if (isProtectedAdminRoute) {
    const token = request.cookies.get('auth-token')?.value;
    
    // DEBUG: Adicione estes logs temporariamente
    console.log('🔍 Middleware - Pathname:', pathname);
    console.log('🔍 Middleware - Token exists:', !!token);
    console.log('🔍 Middleware - Token value:', token ? 'EXISTS' : 'NOT_FOUND');

    if (!token) {
      console.log('❌ Middleware - No token, redirecting to login');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const payload = await verifyToken(token);
    console.log('🔍 Middleware - Payload:', payload ? 'EXISTS' : 'NULL');
    console.log('🔍 Middleware - isJWTPayload:', payload ? isJWTPayload(payload) : false);

    if (!payload || !isJWTPayload(payload)) {
      console.log('❌ Middleware - Invalid payload, redirecting to login');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    console.log('✅ Middleware - Auth passed, proceeding');
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-restaurant-id', payload.restaurantId);
    return response;
  }

  return NextResponse.next();
}