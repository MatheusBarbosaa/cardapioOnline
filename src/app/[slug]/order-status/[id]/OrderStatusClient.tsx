"use client";

import { useEffect,useState } from "react";

export default function OrderStatusClient({ initialOrder }) {
  const [order, setOrder] = useState(initialOrder);

  const statusLabels = {
    PAYMENT_CONFIRMED: "Pagamento Confirmado",
    IN_PREPARATION: "Em Preparo",
    FINISHED: "Pronto para Retirada",
    PENDING: "Pendente",
    PAYMENT_FAILED: "Pagamento Falhou",
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/orders/status?id=${order.id}`);
      const data = await res.json();
      setOrder(data.order);
    }, 5000);

    return () => clearInterval(interval);
  }, [order.id]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Status do Pedido #{order.id}</h1>
      <p>
        Status Atual:{" "}
        <span className="font-semibold">{statusLabels[order.status]}</span>
      </p>

      <div>
        <p className="font-semibold">Produtos:</p>
        <ul className="list-disc ml-5">
          {order.orderProducts.map((op) => (
            <li key={op.id}>
              {op.product.name} x {op.quantity}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
