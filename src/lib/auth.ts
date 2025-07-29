import { User } from '@prisma/client';
import { compare } from 'bcryptjs';
import type { JWTPayload as JoseJWTPayload } from 'jose';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface JWTPayload extends JoseJWTPayload {
  userId: string;
  restaurantId: string;
  email: string;
  role: string;
}

export async function generateToken(user: User & { restaurant: { slug: string } }): Promise<string> {
  const payload = {
    userId: user.id,
    restaurantId: user.restaurantId,
    email: user.email,
    role: user.role,
    restaurantSlug: user.restaurant.slug, // ADICIONADO
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}


export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.restaurantId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return payload as JWTPayload;
  } catch (err) {
    console.error('[JWT] Erro ao verificar token:', err);
    return null;
  }
}

/**
 * Compara a senha fornecida com a senha criptografada salva no banco.
 */
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}
