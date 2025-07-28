"use server";

import { ConsumptionMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";

import { removeCpfPunctuation } from "../helpers/cpf";

interface CreateOrderInput {
  customerName: string;
  customerCpf: string;
  products: Array<{
    id: string;
    quantity: number;
  }>;
  consumptionMethod: ConsumptionMethod;
  slug: string;
}

export const createOrder = async (input: CreateOrderInput) => {
  try {
    console.log('=== CREATING ORDER DEBUG ===');
    console.log('Input products:', JSON.stringify(input.products, null, 2));
    console.log('Products count:', input.products.length);

    // 1. Buscar restaurante
    const restaurant = await db.restaurant.findUnique({
      where: {
        slug: input.slug,
      },
    });

    if (!restaurant) {
      console.error('Restaurant not found for slug:', input.slug);
      throw new Error("Restaurant not found");
    }

    console.log('Restaurant found:', restaurant.id);

    // 2. Buscar produtos
    const productIds = input.products.map((product) => product.id);
    console.log('Searching for product IDs:', productIds);

    const productsWithPrices = await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    console.log('Products found in DB:', productsWithPrices.length);
    console.log('Products from DB:', productsWithPrices.map(p => ({ id: p.id, name: p.name, price: p.price })));

    // 3. Validar se todos os produtos foram encontrados
    const missingProducts = productIds.filter(id => 
      !productsWithPrices.find(p => p.id === id)
    );

    if (missingProducts.length > 0) {
      console.error('Missing products:', missingProducts);
      throw new Error(`Products not found: ${missingProducts.join(', ')}`);
    }

    // 4. Preparar dados para criação
    const productsWithPricesAndQuantities = input.products.map((product) => {
      const foundProduct = productsWithPrices.find((p) => p.id === product.id);
      
      if (!foundProduct) {
        throw new Error(`Product with id ${product.id} not found`);
      }
      
      const result = {
        productId: product.id,
        quantity: product.quantity,
        price: foundProduct.price,
      };
      
      console.log('Prepared product:', result);
      return result;
    });

    const total = productsWithPricesAndQuantities.reduce(
      (acc, product) => acc + product.price * product.quantity,
      0,
    );

    console.log('Calculated total:', total);
    console.log('About to create order with orderProducts:', JSON.stringify(productsWithPricesAndQuantities, null, 2));

    // 5. Usar transação para garantir consistência
    const order = await db.$transaction(async (tx) => {
      // Criar o pedido primeiro
      const newOrder = await tx.order.create({
        data: {
          status: "PENDING",
          customerName: input.customerName,
          customerCpf: removeCpfPunctuation(input.customerCpf),
          total: total,
          consumptionMethod: input.consumptionMethod,
          restaurantId: restaurant.id,
        },
      });

      console.log('Order created with ID:', newOrder.id);

      // Criar os produtos do pedido individualmente para melhor debugging
      const orderProducts = [];
      for (const productData of productsWithPricesAndQuantities) {
        console.log('Creating order product:', productData);
        
        const orderProduct = await tx.orderProduct.create({
          data: {
            productId: productData.productId,
            orderId: newOrder.id,
            quantity: productData.quantity,
            price: productData.price,
          },
        });
        
        orderProducts.push(orderProduct);
        console.log('Order product created:', orderProduct.id);
      }

      return newOrder;
    });

    console.log('Transaction completed successfully, order ID:', order.id);

    revalidatePath(`/${input.slug}/orders`);
    return order;

  } catch (error) {
    console.error('=== ERROR CREATING ORDER ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Re-throw para que o erro seja propagado corretamente
    throw error;
  }
};