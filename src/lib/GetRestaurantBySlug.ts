// src/lib/getRestaurantBySlug.ts
import { db } from '@/lib/prisma';

export async function getRestaurantBySlug(slug: string) {
  try {
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          include: {
            products: true
          }
        }
      }
    });
    
    return restaurant;
  } catch (error) {
    console.error('Erro ao buscar restaurante:', error);
    return null;
  }
}