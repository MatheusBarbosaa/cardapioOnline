import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/prisma";

import OrdersManager from "./components/OrdersManager";

interface OrdersPageProps {
  params: Promise<{ slug: string }>;
}

async function getOrders(slug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  try {
    const decoded: any = verify(token, process.env.JWT_SECRET!);

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      include: {
        orders: {
          include: {
            orderProducts: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!restaurant || restaurant.id !== decoded.restaurantId) return null;

    return restaurant.orders;
  } catch {
    return null;
  }
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { slug } = await params;
  const orders = await getOrders(slug);

  if (!orders) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedidos</h1>
        <p className="text-gray-600">Gerencie os pedidos do seu restaurante</p>
      </div>
      <OrdersManager initialOrders={orders} slug={slug} />
    </div>
  );
}
