import { NextRequest, NextResponse } from 'next/server';

import { comparePassword, generateToken } from '@/lib/auth';
import { db } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Buscar usuário com restaurante
    const user = await db.user.findUnique({
      where: { email },
      include: { restaurant: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar se restaurante está ativo
    if (!user.restaurant.isActive) {
      return NextResponse.json(
        { error: 'Restaurante suspenso' },
        { status: 403 }
      );
    }

    // ✅ Gerar token com await
    const token = await generateToken(user);

    // Atualizar último login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

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

    // Definir cookie com token real (não uma Promise)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 dias
    });

    return response;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
