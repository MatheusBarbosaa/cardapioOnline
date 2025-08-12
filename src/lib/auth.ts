import { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import type { JWTPayload as JoseJWTPayload } from 'jose';
import { jwtVerify, SignJWT } from 'jose';

// Segredo JWT
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Interface do payload do token
export interface JWTPayload extends JoseJWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
}

// Gera token JWT
export async function generateToken(
  input: User & { restaurant: { slug: string; name: string } } | Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não está definido");
  }

  let payload: Omit<JWTPayload, 'iat' | 'exp'>;

  if ('password' in input) {
    const user = input as User & { restaurant: { slug: string; name: string } };
    payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantSlug: user.restaurant.slug,
      restaurantName: user.restaurant.name
    };
  } else {
    payload = input as Omit<JWTPayload, 'iat' | 'exp'>;
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verifica token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET não está definido");

    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!isValidJWTPayload(payload)) {
      return null;
    }

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

// Valida estrutura do payload
export function isValidJWTPayload(obj: unknown): obj is JWTPayload {
  if (typeof obj !== 'object' || obj === null) return false;

  const payload = obj as Record<string, unknown>;

  return typeof payload.userId === 'string' &&
         typeof payload.email === 'string' &&
         typeof payload.name === 'string' &&
         typeof payload.role === 'string' &&
         typeof payload.restaurantId === 'string' &&
         typeof payload.restaurantSlug === 'string' &&
         typeof payload.restaurantName === 'string';
}

// Compara senha
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

// Gera hash de senha
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

// Extrai slug do token sem validar
export function getSlugFromToken(request: Request): string | null {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = JSON.parse(atob(token.split('.')[1])) as { restaurantSlug?: string };
    return decoded.restaurantSlug ?? null;
  } catch {
    return null;
  }
}

export async function verifyAuthServer(token?: string | null) {
  if (!token) return null;
  if (token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  return await verifyToken(token);
}
