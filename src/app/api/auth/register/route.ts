import { NextRequest, NextResponse } from 'next/server';

import { generateToken,hashPassword } from '@/lib/auth';
import { db } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { 
      restaurantName, 
      restaurantSlug, 
      description,
      ownerName, 
      email, 
      password 
    } = await request.json();

    // Verificar se slug já existe
    const existingRestaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (existingRestaurant) {
      return NextResponse.json(
        { error: 'Slug já está em uso' }, 
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' }, 
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // URLs de imagens padrão (usando placeholder services ou suas próprias imagens)
    const defaultAvatarUrl = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=400&fit=crop&crop=center';
    const defaultCoverUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop&crop=center';

    // Criar restaurante e usuário em transação
    const result = await db.$transaction(async (tx) => {
      // Criar restaurante
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug: restaurantSlug,
          description,
          avatarImageUrl: defaultAvatarUrl,
          coverImageUrl: defaultCoverUrl,
        }
      });

      // Criar usuário admin
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          restaurantId: restaurant.id,
        }
      });

      return { restaurant, user };
    });

    // Gerar token
    const token = generateToken(result.user);

    const response = NextResponse.json({
      message: 'Restaurante criado com sucesso',
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name,
        slug: result.restaurant.slug,
      }
    }, { status: 201 });

    // Definir cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
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