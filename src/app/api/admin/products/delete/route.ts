import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    // ✅ Debug: Log dos headers recebidos
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    const cookie = headersList.get('cookie');
    
    console.log('🔍 DELETE /api/admin/products/delete - Debug headers:');
    console.log('   Authorization:', authorization ? `${authorization.substring(0, 20)}...` : 'null');
    console.log('   Cookie:', cookie ? 'presente' : 'null');
    
    // ✅ Verificar se tem token no header Authorization
    if (!authorization) {
      // ✅ Tentar pegar token dos cookies se não tiver no header
      if (cookie) {
        const tokenMatch = cookie.match(/token=([^;]+)/);
        if (tokenMatch) {
          const tokenFromCookie = tokenMatch[1];
          console.log('🍪 Token encontrado no cookie');
          
          const payload = await verifyToken(`Bearer ${tokenFromCookie}`);
          
          if (!payload) {
            console.log('❌ Token do cookie inválido');
            return NextResponse.json(
              { error: 'Token inválido' },
              { status: 401 }
            );
          }
          
          console.log('✅ Token do cookie válido:', payload.email, payload.role);
          
          // Continuar com a validação do payload
          if (payload.role !== 'ADMIN') {
            return NextResponse.json(
              { error: 'Acesso negado. Apenas administradores podem deletar produtos.' },
              { status: 403 }
            );
          }
          
          // Pular para a lógica principal com payload válido
          return await processDelete(request, payload);
        }
      }
      
      console.log('❌ Nenhum token encontrado');
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(authorization);
    
    if (!payload) {
      console.log('❌ Token do header Authorization inválido');
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }
    
    console.log('✅ Token do header válido:', payload.email, payload.role);

    // ✅ Verificar se é admin
    if (payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem deletar produtos.' },
        { status: 403 }
      );
    }

    return await processDelete(request, payload);

  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error);
    
    // ✅ Tratar erros específicos do Prisma - sem usar any
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Não é possível deletar este produto pois ele possui dependências vinculadas' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor ao deletar produto' },
      { status: 500 }
    );
  }
}

// ✅ Função separada para processar o delete
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processDelete(request: NextRequest, payload: any) {
  // ✅ Pegar dados do corpo da requisição
  const body = await request.json();
  const { productId } = body;

  if (!productId) {
    return NextResponse.json(
      { error: 'ID do produto é obrigatório' },
      { status: 400 }
    );
  }

  console.log(`🗑️ Tentando deletar produto: ${productId}`);

  // ✅ Verificar se o produto existe e pertence ao restaurante do usuário
  const existingProduct = await db.product.findUnique({
    where: { id: productId },
    include: {
      restaurant: true,
    },
  });

  if (!existingProduct) {
    return NextResponse.json(
      { error: 'Produto não encontrado' },
      { status: 404 }
    );
  }

  // ✅ Verificar se o produto pertence ao restaurante do usuário
  if (existingProduct.restaurantId !== payload.restaurantId) {
    return NextResponse.json(
      { error: 'Você não tem permissão para deletar este produto' },
      { status: 403 }
    );
  }

  // ✅ Verificar se há pedidos vinculados a este produto
  const ordersWithProduct = await db.orderProduct.findFirst({
    where: { productId },
    include: {
      order: true,
    },
  });

  if (ordersWithProduct) {
    return NextResponse.json(
      { 
        error: 'Não é possível deletar este produto pois ele possui pedidos vinculados. Considere desativá-lo em vez de deletá-lo.' 
      },
      { status: 400 }
    );
  }

  // ✅ Deletar o produto (Prisma vai deletar automaticamente os relacionamentos em cascade)
  await db.product.delete({
    where: { id: productId },
  });

  console.log(`✅ Produto deletado com sucesso: ${existingProduct.name} (ID: ${productId})`);

  return NextResponse.json(
    { 
      message: 'Produto deletado com sucesso',
      deletedProduct: {
        id: existingProduct.id,
        name: existingProduct.name,
      }
    },
    { status: 200 }
  );
}