import { NextRequest, NextResponse } from 'next/server';

import { isValidJWTPayload,verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedAdminRoute =
    pathname.startsWith('/admin') &&
    !pathname.includes('/login') &&
    !pathname.includes('/register');

  if (!isProtectedAdminRoute) return NextResponse.next();

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload || !isValidJWTPayload(payload)) {
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.set('auth-token', '', { maxAge: -1 }); // remove token inválido
    return response;
  }

  // Auth OK
  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-restaurant-id', payload.restaurantId);
  response.headers.set('x-restaurant-slug', payload.restaurantSlug);

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
