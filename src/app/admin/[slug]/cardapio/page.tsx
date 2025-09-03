// src/app/admin/[slug]/cardapio/page.tsx
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/prisma";

import CardapioManager from "./components/CardapioManager";

interface CardapioPageProps {
  params: Promise<{ slug: string }>; // agora é Promise
}

async function getRestaurantWithMenu(slug: string) {
  const cookieStore = await cookies(); // 👈 precisa de await
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded: any = verify(token, process.env.JWT_SECRET!);

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      include: {
        menuCategories: {
          include: {
            products: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!restaurant || restaurant.id !== decoded.restaurantId) {
      return null;
    }

    return restaurant;
  } catch {
    return null;
  }
}

export default async function CardapioPage({ params }: CardapioPageProps) {
  const { slug } = await params; 

  if (!slug || slug === "undefined") {
    redirect("/admin/login");
  }

  const restaurant = await getRestaurantWithMenu(slug);

  if (!restaurant) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Gerenciar Cardápio
        </h1>
        <p className="text-gray-600">
          Organize suas categorias e produtos para criar o cardápio perfeito
        </p>
      </div>

      <CardapioManager restaurant={restaurant} />
    </div>
  );
}
