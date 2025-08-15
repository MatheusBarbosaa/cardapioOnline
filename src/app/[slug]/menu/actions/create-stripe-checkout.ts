"use server";

import { ConsumptionMethod } from "@prisma/client";
import { headers } from "next/headers";
import Stripe from "stripe";

import { db } from "@/lib/prisma";

import { CartProduct } from "../contexts/cart";
import { removeCpfPunctuation } from "../helpers/cpf";

interface CreateStripeCheckoutInput {
  products: CartProduct[];
  orderId: number;
  slug: string;
  consumptionMethod: ConsumptionMethod;
  cpf: string;
}

// ✅ CORREÇÃO: Função para converter URLs relativas em absolutas (aceita null/undefined)
const getAbsoluteImageUrl = (imageUrl: string | null | undefined, origin: string): string => {
  // ✅ CORREÇÃO: Verificar se imageUrl existe
  if (!imageUrl) {
    // Retorna uma imagem padrão ou string vazia se imageUrl for null/undefined
    return `${origin}/default-product-image.png`;
  }
  
  // Se já é uma URL absoluta (http/https), retorna como está
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Se é uma URL relativa, converte para absoluta
  if (imageUrl.startsWith('/')) {
    return `${origin}${imageUrl}`;
  }
  
  // Se não tem barra no início, adiciona
  return `${origin}/${imageUrl}`;
};

export const createStripeCheckout = async ({
  orderId,
  products,
  slug,
  consumptionMethod,
  cpf,
}: CreateStripeCheckoutInput) => {
  // ✅ Log de debug
  console.log("➡️ Dados recebidos para Stripe Checkout:");
  console.log({
    orderId,
    products,
    slug,
    consumptionMethod,
    cpf,
  });

  // ✅ Validações
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new Error("Produtos inválidos ou ausentes no checkout");
  }

  if (!slug || !consumptionMethod || !cpf || !orderId) {
    throw new Error("Parâmetros obrigatórios ausentes");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing Stripe secret key");
  }

  const origin = (await headers()).get("origin") as string;

  const productsWithPrices = await db.product.findMany({
    where: {
      id: {
        in: products.map((product) => product.id),
      },
    },
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  });

  const searchParams = new URLSearchParams();
  searchParams.set("consumptionMethod", consumptionMethod);
  searchParams.set("cpf", removeCpfPunctuation(cpf));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${origin}/${slug}/orders?${searchParams.toString()}`,
    cancel_url: `${origin}/${slug}/orders?${searchParams.toString()}`,
    metadata: {
      orderId,
    },
    line_items: products.map((product) => {
      const dbProduct = productsWithPrices.find((p) => p.id === product.id);

      if (!dbProduct) {
        throw new Error(`Produto com ID ${product.id} não encontrado no banco.`);
      }

      // ✅ CORREÇÃO: Lidar com imageUrl que pode ser null
      const absoluteImageUrl = product.imageUrl ? getAbsoluteImageUrl(product.imageUrl, origin) : null;
      
      // ✅ Log para debug
      console.log(`🖼️ Imagem para produto ${product.name}:`);
      console.log(`   Original: ${product.imageUrl}`);
      console.log(`   Absoluta: ${absoluteImageUrl}`);

      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: product.name,
            // ✅ CORREÇÃO: Só adicionar imagem se ela existir
            images: absoluteImageUrl ? [absoluteImageUrl] : [],
          },
          unit_amount: Math.round(dbProduct.price * 100),
        },
        quantity: product.quantity,
      };
    }),
  });

  return { sessionId: session.id };
};