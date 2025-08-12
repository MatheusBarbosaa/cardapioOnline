// src/app/api/admin/upload/product-image/route.ts
export const runtime = "nodejs";

import { existsSync } from 'fs';
import { mkdir,writeFile } from 'fs/promises';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded: any = verify(token, process.env.JWT_SECRET!);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const restaurantSlug = formData.get('restaurantSlug') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: 'Slug do restaurante é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use apenas JPG, PNG ou WebP' },
        { status: 400 }
      );
    }

    // Verificar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB permitido' },
        { status: 400 }
      );
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = `${restaurantSlug}-${timestamp}-${randomString}.${extension}`;

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'products');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Salvar arquivo
    const filepath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // URL pública da imagem
    const imageUrl = `/uploads/products/${filename}`;

    return NextResponse.json({
      message: 'Imagem enviada com sucesso',
      imageUrl
    });

  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Configuração para permitir arquivos maiores
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
