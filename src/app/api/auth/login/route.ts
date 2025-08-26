import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, generateToken } from '@/lib/auth';
import { db } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = await db.user.findUnique({
      where: { email },
      include: { restaurant: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (!user.restaurant.isActive) {
      return NextResponse.json({ error: 'Restaurante suspenso' }, { status: 403 });
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantSlug: user.restaurant.slug,
      restaurantName: user.restaurant.name
    });

    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurant: {
          id: user.restaurant.id,
          name: user.restaurant.name,
          slug: user.restaurant.slug,
          stripeOnboarded: user.restaurant.stripeOnboarded
        }
      }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
