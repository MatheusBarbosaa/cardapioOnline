import { redirect } from "next/navigation";

import { db } from "@/lib/prisma";

import OrdersManager from "./components/OrdersManager";

async function getOrders(slug: string) {
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          orderProducts: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!restaurant) return null;
  return restaurant.orders;
}

interface OrdersPageProps {
  params: Promise<{ slug: string }>; // 👈 agora é Promise
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { slug } = await params; // 👈 precisa de await

  // ✅ Validar slug antes de qualquer coisa
  if (!slug || slug === "undefined") {
    return (
      <div className="p-6 text-red-600 font-bold">❌ Slug inválido</div>
    );
  }

  const orders = await getOrders(slug);

  if (!orders) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedidos</h1>
        <p className="text-gray-600">
          Gerencie os pedidos do seu restaurante
        </p>
      </div>

      <OrdersManager initialOrders={orders} slug={slug} />
    </div>
  );
}
