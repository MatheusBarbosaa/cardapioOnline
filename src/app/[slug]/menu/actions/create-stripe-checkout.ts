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

// ✅ Função para converter URLs relativas em absolutas (aceita null/undefined)
const getAbsoluteImageUrl = (imageUrl: string | null | undefined, origin: string): string => {
  if (!imageUrl) {
    return `${origin}/default-product-image.png`;
  }
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return `${origin}${imageUrl}`;
  }
  return `${origin}/${imageUrl}`;
};

// ✅ Função para buscar restaurante pelo slug
const getRestaurantBySlug = async (slug: string) => {
  try {
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        stripeAccountId: true,
      },
    });

    if (!restaurant) {
      throw new Error(`Restaurante com slug '${slug}' não encontrado`);
    }

    return restaurant;
  } catch (error) {
    console.error("❌ Erro ao buscar restaurante:", error);
    throw error;
  }
};

// ✅ Função para buscar cupons ativos do restaurante
const getActiveRestaurantCoupons = async (restaurantId: string) => {
  try {
    const now = new Date();
    
    const activeCoupons = await db.coupon.findMany({
      where: {
        restaurantId,
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } }
            ]
          },
          {
            OR: [
              { maxRedemptions: null },
              { timesUsed: { lt: db.coupon.fields.maxRedemptions } }
            ]
          }
        ]
      },
      select: {
        id: true,
        code: true,
        name: true,
        stripeCouponId: true,
        stripePromotionCodeId: true,
        discountType: true,
        discountValue: true,
        timesUsed: true,
        maxRedemptions: true,
        minOrderAmount: true,
      },
    });

    console.log(`✅ ${activeCoupons.length} cupons ativos encontrados para o restaurante ${restaurantId}`);
    
    if (activeCoupons.length > 0) {
      console.log("🎫 Cupons disponíveis:");
      activeCoupons.forEach(coupon => {
        const usage = coupon.maxRedemptions ? `${coupon.timesUsed}/${coupon.maxRedemptions}` : `${coupon.timesUsed}`;
        console.log(`   - ${coupon.code}: ${coupon.name} (${coupon.discountType} ${coupon.discountValue}) - Usos: ${usage}`);
      });
    }
    
    return activeCoupons;

  } catch (error) {
    console.error("❌ Erro ao buscar cupons do restaurante:", error);
    return [];
  }
};

// ✅ Função para validar se um cupom específico pode ser usado
const validateCouponForOrder = async (couponCode: string, restaurantId: string, orderTotal: number) => {
  try {
    const now = new Date();
    
    const coupon = await db.coupon.findFirst({
      where: {
        code: couponCode.toUpperCase(),
        restaurantId,
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } }
            ]
          }
        ]
      },
    });

    if (!coupon) {
      return { valid: false, error: "Cupom não encontrado ou inativo" };
    }

    // Verificar limite de uso
    if (coupon.maxRedemptions && coupon.timesUsed >= coupon.maxRedemptions) {
      return { valid: false, error: "Cupom atingiu o limite de uso" };
    }

    // Verificar valor mínimo do pedido
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return { 
        valid: false, 
        error: `Valor mínimo do pedido: R$ ${coupon.minOrderAmount.toFixed(2)}` 
      };
    }

    return { valid: true, coupon };

  } catch (error) {
    console.error("❌ Erro ao validar cupom:", error);
    return { valid: false, error: "Erro interno na validação" };
  }
};

// ✅ Função para sincronizar cupons do banco com Stripe
const syncCouponsWithStripe = async (restaurantCoupons: any[], stripe: Stripe) => {
  try {
    // Buscar todos os promotion codes do Stripe
    const stripePromotionCodes = await stripe.promotionCodes.list({
      limit: 100,
    });

    // Filtrar apenas os códigos que correspondem aos cupons do restaurante
    const availablePromotionCodes = stripePromotionCodes.data.filter(promoCode => {
      const matchingCoupon = restaurantCoupons.find(dbCoupon => 
        dbCoupon.stripePromotionCodeId === promoCode.id
      );

      return matchingCoupon && 
             promoCode.active && 
             (!promoCode.expires_at || promoCode.expires_at > Date.now() / 1000) &&
             (!promoCode.max_redemptions || promoCode.times_redeemed < promoCode.max_redemptions);
    });

    console.log(`✅ ${availablePromotionCodes.length} cupons sincronizados com o Stripe`);
    return availablePromotionCodes;

  } catch (error) {
    console.error("❌ Erro ao sincronizar cupons com Stripe:", error);
    return [];
  }
};

export const createStripeCheckout = async ({
  orderId,
  products,
  slug,
  consumptionMethod,
  cpf,
}: CreateStripeCheckoutInput) => {
  console.log("➡️ Dados recebidos para Stripe Checkout:");
  console.log({
    orderId,
    products,
    slug,
    consumptionMethod,
    cpf,
  });

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

  // ✅ Buscar informações do restaurante
  const restaurant = await getRestaurantBySlug(slug);
  console.log(`🏪 Restaurante encontrado: ${restaurant.name} (ID: ${restaurant.id})`);

  // ✅ Buscar produtos com preços
  const productsWithPrices = await db.product.findMany({
    where: {
      id: {
        in: products.map((product) => product.id),
      },
    },
  });

  // ✅ Calcular total do pedido
  const orderTotal = products.reduce((total, product) => {
    const dbProduct = productsWithPrices.find(p => p.id === product.id);
    return total + (dbProduct ? dbProduct.price * product.quantity : 0);
  }, 0);

  console.log(`💰 Total do pedido: R$ ${orderTotal.toFixed(2)}`);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  });

  // ✅ Buscar cupons ativos do restaurante no banco de dados
  const restaurantCoupons = await getActiveRestaurantCoupons(restaurant.id);
  
  // ✅ Sincronizar com Stripe para garantir que estão ativos
  const availableStripeCoupons = await syncCouponsWithStripe(restaurantCoupons, stripe);

  const searchParams = new URLSearchParams();
  searchParams.set("consumptionMethod", consumptionMethod);
  searchParams.set("cpf", removeCpfPunctuation(cpf));

  // ✅ Configurações do session
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${origin}/${slug}/orders?${searchParams.toString()}`,
    cancel_url: `${origin}/${slug}/orders?${searchParams.toString()}`,
    metadata: {
      orderId: orderId.toString(),
      restaurantId: restaurant.id,
      restaurantSlug: slug,
    },
    
    // ✅ Permite códigos promocionais - todos os cupons ativos do restaurante
    allow_promotion_codes: true,
    
    line_items: products.map((product) => {
      const dbProduct = productsWithPrices.find((p) => p.id === product.id);

      if (!dbProduct) {
        throw new Error(`Produto com ID ${product.id} não encontrado no banco.`);
      }

      const absoluteImageUrl = product.imageUrl
        ? getAbsoluteImageUrl(product.imageUrl, origin)
        : null;

      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: product.name,
            images: absoluteImageUrl ? [absoluteImageUrl] : [],
          },
          unit_amount: Math.round(dbProduct.price * 100),
        },
        quantity: product.quantity,
      };
    }),

    // ✅ Configurações adicionais
    invoice_creation: {
      enabled: true,
    },
    
    // ✅ Permitir apenas cupons específicos do restaurante (opcional)
    // Se quiser restringir apenas aos cupons do restaurante:
    // allowed_countries: ["BR"], // Exemplo de restrição adicional
  };

  // ✅ Configurar conta Stripe conectada se existir
  if (restaurant.stripeAccountId) {
    console.log(`💳 Usando conta Stripe conectada: ${restaurant.stripeAccountId}`);
    // sessionConfig.stripe_account = restaurant.stripeAccountId;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  console.log(`✅ Session criada com sucesso: ${session.id}`);
  console.log(`🎫 ${restaurantCoupons.length} cupons disponíveis no banco`);
  console.log(`✅ ${availableStripeCoupons.length} cupons sincronizados com Stripe`);
  
  return { 
    sessionId: session.id,
    availableCoupons: restaurantCoupons.length,
    restaurantId: restaurant.id,
  };
};

// ✅ Função adicional para validar cupom antes do checkout (opcional)
export const validateCouponCode = async (
  couponCode: string, 
  restaurantSlug: string, 
  orderTotal: number
) => {
  try {
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    return await validateCouponForOrder(couponCode, restaurant.id, orderTotal);
  } catch (error) {
    console.error("❌ Erro ao validar cupom:", error);
    return { valid: false, error: "Erro na validação do cupom" };
  }
};