import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

// Verificar se as variáveis de ambiente estão configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Função para criar cliente Supabase dinamicamente
async function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Função para validar autenticação
async function validateAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as { restaurantId: string };
    return decoded;
  } catch {
    return null;
  }
}

// Função para gerar nome único do arquivo
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

// POST - Para uploads de imagem
export async function POST(request: Request) {
  try {
    // Obter cliente Supabase
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase não configurado. Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY' 
      }, { status: 500 });
    }

    const decoded = await validateAuth();
    
    if (!decoded) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.' 
      }, { status: 400 });
    }

    // Validar tamanho do arquivo (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Máximo 5MB.' 
      }, { status: 400 });
    }

    // Converter File para ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Gerar nome único para o arquivo
    const fileName = generateFileName(file.name);
    
    // Upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('restaurant-images') // nome do bucket
      .upload(`uploads/${fileName}`, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no upload do Supabase:', uploadError);
      return NextResponse.json({ 
        error: 'Erro ao fazer upload da imagem' 
      }, { status: 500 });
    }

    // Obter URL pública da imagem
    const { data: urlData } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(`uploads/${fileName}`);

    if (!urlData.publicUrl) {
      return NextResponse.json({ 
        error: 'Erro ao obter URL da imagem' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl: urlData.publicUrl,
      fileName: fileName
    });
    
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Para atualizar dados do restaurante
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const decoded = await validateAuth();
    
    if (!decoded) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const updatedRestaurant = await db.restaurant.update({
      where: { id: decoded.restaurantId },
      data: {
        name: body.name,
        description: body.description,
        avatarImageUrl: body.avatarImageUrl,
        coverImageUrl: body.coverImageUrl,
      },
    });

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}