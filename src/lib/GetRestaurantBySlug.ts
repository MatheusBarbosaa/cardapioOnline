// src/lib/getRestaurantBySlug.ts
import { db } from '@/lib/prisma';

export async function GetRestaurantBySlug(slug: string) {
  try {
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      include: {
        menuCategories: {
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