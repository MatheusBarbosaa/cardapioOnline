// src/app/admin/restaurant/page.tsx
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

import RestaurantAdminPanel from "@/components/admin/restaurant-admin-panel";
import { verifyAuthServer } from "@/lib/auth"; // Função para verificar auth no servidor

const prisma = new PrismaClient();

export default async function AdminRestaurantPage() {
  // Verificar autenticação
  const user = await verifyAuthServer();
  
  if (!user) {
    redirect("/login");
  }

  // Buscar o restaurante do usuário com todos os dados necessários
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      users: {
        some: {
          id: user.userId
        }
      }
    },
    include: {
      menuCategories: {
        include: {
          products: true
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      products: {
        include: {
          menuCategory: true
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      orders: {
        include: {
          orderProducts: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      users: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!restaurant) {
    // Redirecionar para criar restaurante se não existir
    redirect("/admin/restaurant/create");
  }

  return (
    <RestaurantAdminPanel 
      restaurant={restaurant}
      currentUser={user}
    />
  );
}