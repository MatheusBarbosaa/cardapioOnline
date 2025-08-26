"use client";

import PusherJS from "pusher-js";
import { useCallback, useEffect, useState } from "react";

export default function OrderStatusClient({ initialOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState("connected");

  const statusLabels = {
    PAYMENT_CONFIRMED: "Pagamento Confirmado",
    IN_PREPARATION: "Em Preparo",
    FINISHED: "Pronto para Retirada",
    PENDING: "Aguardando Pagamento",
    PAYMENT_FAILED: "Pagamento Falhou",
  };

  const statusColors = {
    PAYMENT_CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
    IN_PREPARATION: "bg-amber-100 text-amber-800 border-amber-300",
    FINISHED: "bg-green-100 text-green-800 border-green-300",
    PENDING: "bg-gray-100 text-gray-800 border-gray-300",
    PAYMENT_FAILED: "bg-red-100 text-red-800 border-red-300",
  };

  const statusIcons = {
    PAYMENT_CONFIRMED: "💳",
    IN_PREPARATION: "👨‍🍳",
    FINISHED: "✅",
    PENDING: "⏳",
    PAYMENT_FAILED: "❌",
  };

  const statusDescriptions = {
    PAYMENT_CONFIRMED: "Pagamento confirmado! Seu pedido entrará em preparo em breve.",
    IN_PREPARATION: "Nossos chefs estão preparando seu pedido com carinho.",
    FINISHED: "Seu pedido está pronto! Você pode vir buscar.",
    PENDING: "Aguardando confirmação do pagamento.",
    PAYMENT_FAILED: "Houve um problema com o pagamento. Entre em contato conosco.",
  };

  // Som de notificação quando pedido fica pronto
  const playFinishedSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      [523.25, 659.25, 783.99].forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = "sine";

        const startTime = audioContext.currentTime + index * 0.15;
        const duration = 0.3;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      setTimeout(() => {
        if (audioContext.state !== "closed") audioContext.close();
      }, 1000);
    } catch {
      console.log("Som não disponível");
    }
  }, []);

  // Configurar Pusher autenticado
  useEffect(() => {
    const pusherClient = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      auth: {
        params: { orderId: order.id },
      },
    });

    const channel = pusherClient.subscribe(`order-${order.id}`);

    channel.bind("status-update", (data: { status: string }) => {
      setOrder((prevOrder) => {
        if (prevOrder.status !== data.status) {
          setLastUpdate(new Date());
          if (data.status === "FINISHED") playFinishedSound();
        }
        return { ...prevOrder, status: data.status };
      });
    });

    pusherClient.connection.bind("state_change", (states: any) => {
      setConnectionStatus(states.current);
    });

    return () => {
      channel.unsubscribe();
      pusherClient.disconnect();
    };
  }, [order.id, playFinishedSound]);

  const getProgressPercentage = () => {
    const statusOrder = ["PENDING", "PAYMENT_CONFIRMED", "IN_PREPARATION", "FINISHED"];
    const currentIndex = statusOrder.indexOf(order.status);
    if (order.status === "PAYMENT_FAILED") return 0;
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case "connecting":
        return { color: "text-blue-600", text: "Conectando...", icon: "🔄" };
      case "connected":
        return { color: "text-green-600", text: `Última atualização: ${lastUpdate.toLocaleTimeString()}`, icon: "✅" };
      case "unavailable":
      case "failed":
        return { color: "text-red-600", text: "Erro de conexão", icon: "⚠️" };
      default:
        return { color: "text-gray-600", text: "Conectando...", icon: "⏳" };
    }
  };

  const connectionInfo = getConnectionStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido #{order.id}</h1>
              <p className="text-gray-600">Cliente: <strong>{order.customerName}</strong></p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{connectionInfo.icon}</span>
              <span className={connectionInfo.color}>{connectionInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Status atual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">{statusIcons[order.status]}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{statusLabels[order.status]}</h2>
              <p className="text-gray-600 mt-1">{statusDescriptions[order.status]}</p>
            </div>
          </div>

          {/* Badge do status */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>

          {/* Barra de progresso */}
          {order.status !== "PAYMENT_FAILED" && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Progresso do pedido</span>
                <span>{Math.round(getProgressPercentage())}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Produtos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos do Pedido</h3>
          <div className="space-y-3">
            {order.orderProducts.map((op) => (
              <div key={op.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <span className="font-medium text-gray-900">{op.product.name}</span>
                  <span className="text-gray-600 ml-2">x {op.quantity}</span>
                </div>
                <span className="font-semibold text-gray-900">R$ {(op.product.price * op.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
