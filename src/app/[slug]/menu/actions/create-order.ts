"use server";

import { ConsumptionMethod } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { db } from "@/lib/prisma";

import { removeCpfPunctuation } from "../helpers/cpf";

interface CreateOrderInput {
  customerName: string;
  customerCpf: string;
  customerPhone?: string; // Tornei opcional, Prisma aceita null se não estiver setado
  deliveryAddress?: string;
  deliveryReference?: string;
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
    console.log('Input:', JSON.stringify(input, null, 2));

    if (input.consumptionMethod === 'TAKEAWAY' && !input.deliveryAddress) {
      throw new Error("Endereço é obrigatório para entrega");
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug: input.slug },
    });

    if (!restaurant) throw new Error("Restaurant not found");

    const productIds = input.products.map(p => p.id);
    const productsWithPrices = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    const missingProducts = productIds.filter(id => !productsWithPrices.find(p => p.id === id));
    if (missingProducts.length > 0) throw new Error(`Products not found: ${missingProducts.join(', ')}`);

    const productsWithPricesAndQuantities = input.products.map(product => {
      const foundProduct = productsWithPrices.find(p => p.id === product.id);
      if (!foundProduct) throw new Error(`Product with id ${product.id} not found`);

      return {
        productId: product.id,
        quantity: product.quantity,
        price: foundProduct.price,
      };
    });

    const total = productsWithPricesAndQuantities.reduce(
      (acc, product) => acc + product.price * product.quantity,
      0
    );

    // ✅ Apenas campos reconhecidos pelo Prisma Client
    const orderData = {
      status: "PENDING" as const,
      customerName: input.customerName,
      customerCpf: removeCpfPunctuation(input.customerCpf),
      customerPhone: input.customerPhone || null, // Prisma aceita null
      total,
      consumptionMethod: input.consumptionMethod,
      restaurantId: restaurant.id,
      deliveryAddress: input.deliveryAddress || null,
      deliveryReference: input.deliveryReference || null,
    };

    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({ data: orderData });

      for (const productData of productsWithPricesAndQuantities) {
        await tx.orderProduct.create({
          data: {
            productId: productData.productId,
            orderId: newOrder.id,
            quantity: productData.quantity,
            price: productData.price,
          },
        });
      }

      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          orderProducts: { include: { product: true } },
        },
      }) || newOrder;
    });

    revalidateTag(`orders-${removeCpfPunctuation(input.customerCpf)}`);
    return order;

  } catch (err) {
    console.error('=== ERROR CREATING ORDER ===', err);
    throw new Error(err instanceof Error ? err.message : String(err));
  }
};
