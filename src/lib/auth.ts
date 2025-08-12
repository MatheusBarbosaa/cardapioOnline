import { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import type { JWTPayload as JoseJWTPayload } from 'jose';
import { jwtVerify, SignJWT } from 'jose';

// Define o segredo JWT
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

// ✅ CORREÇÃO: Aceita tanto User completo quanto payload específico
export async function generateToken(
  input: User & { restaurant: { slug: string; name: string } } | Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não está definido");
  }

  // Se for um objeto User, extrair as propriedades necessárias
  let payload: Omit<JWTPayload, 'iat' | 'exp'>;
  
  if ('password' in input) {
    // É um User object
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
    // É um payload direto
    payload = input as Omit<JWTPayload, 'iat' | 'exp'>;
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 dias
    .sign(JWT_SECRET);
}

// Verifica e decodifica um token JWT
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não está definido");
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    console.log('🔍 VerifyToken - Token received (first 20 chars):', token.substring(0, 20) + '...');
    console.log('🔍 VerifyToken - JWT_SECRET exists:', !!process.env.JWT_SECRET);

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    console.log('🔍 VerifyToken - Raw payload:', payload);

    if (!isValidJWTPayload(payload)) {
      console.log('❌ VerifyToken - Invalid payload structure');
      return null;
    }

    console.log('✅ VerifyToken - Valid payload');
    return payload as JWTPayload;
  } catch (error) {
    // ✅ CORREÇÃO: Tratar error como unknown corretamente
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ VerifyToken - Error:", errorMessage);
    return null;
  }
}

// Validação de tipo para payload
export function isValidJWTPayload(obj: unknown): obj is JWTPayload {
  if (typeof obj !== 'object' || obj === null) {
    console.log('❌ isValidJWTPayload - Not an object or null');
    return false;
  }

  const payload = obj as Record<string, unknown>;
  
  const checks = {
    userId: typeof payload.userId === 'string',
    email: typeof payload.email === 'string',
    name: typeof payload.name === 'string',
    role: typeof payload.role === 'string',
    restaurantId: typeof payload.restaurantId === 'string',
    restaurantSlug: typeof payload.restaurantSlug === 'string',
    restaurantName: typeof payload.restaurantName === 'string'
  };

  console.log('🔍 isValidJWTPayload - Checks:', checks);
  console.log('🔍 isValidJWTPayload - Payload keys:', Object.keys(payload));

  return Object.values(checks).every(Boolean);
}

// Compara senha (plaintext vs hash)
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

// Gera hash da senha
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

// Extrai o slug do token diretamente (sem validar assinatura)
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