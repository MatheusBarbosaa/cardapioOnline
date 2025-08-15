import { db } from "@/lib/prisma";

import OrderStatusClient from "./OrderStatusClient";

export default async function OrderStatusPage({ params }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id: Number(id) },
    include: { orderProducts: { include: { product: true } } },
  });

  if (!order) {
    return <div className="p-6">Pedido não encontrado</div>;
  }

  return <OrderStatusClient initialOrder={order} />;
}
