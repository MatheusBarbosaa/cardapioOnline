"use client";

import { OrderStatus, Prisma } from "@prisma/client";
import { AlertCircle,CheckCircle, ChefHat, ChevronLeftIcon, Clock, ScrollTextIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef,useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/helpers/format-currency";

interface OrderListProps {
  orders: Array<
    Prisma.OrderGetPayload<{
      include: {
        restaurant: {
          select: {
            name: true;
            avatarImageUrl: true;
          };
        };
        orderProducts: {
          include: {
            product: true;
          };
        };
      };
    }>
  >;
}

const getStatusLabel = (status: OrderStatus) => {
  if (status === "FINISHED") return "Pedido Pronto! 🎉";
  if (status === "IN_PREPARATION") return "Preparando seu Pedido";
  if (status === "PENDING") return "Aguardando Pagamento";
  if (status === "PAYMENT_CONFIRMED") return "Pagamento Confirmado";
  if (status === "PAYMENT_FAILED") return "Pagamento Falhou";
  return "";
};

const getStatusIcon = (status: OrderStatus) => {
  if (status === "FINISHED") return <CheckCircle className="w-5 h-5" />;
  if (status === "IN_PREPARATION") return <ChefHat className="w-5 h-5" />;
  if (status === "PENDING") return <Clock className="w-5 h-5" />;
  if (status === "PAYMENT_CONFIRMED") return <CheckCircle className="w-5 h-5" />;
  if (status === "PAYMENT_FAILED") return <AlertCircle className="w-5 h-5" />;
  return <Clock className="w-5 h-5" />;
};

const getStatusColor = (status: OrderStatus) => {
  if (status === "FINISHED") return "bg-green-500 text-white";
  if (status === "IN_PREPARATION") return "bg-orange-500 text-white";
  if (status === "PENDING") return "bg-gray-400 text-white";
  if (status === "PAYMENT_CONFIRMED") return "bg-blue-500 text-white";
  if (status === "PAYMENT_FAILED") return "bg-red-500 text-white";
  return "bg-gray-400 text-white";
};

const getStatusMessage = (status: OrderStatus) => {
  if (status === "FINISHED") return "Seu pedido está pronto! Você pode retirá-lo no balcão.";
  if (status === "IN_PREPARATION") return "Nossos chefs estão preparando seu pedido com carinho!";
  if (status === "PENDING") return "Aguardando confirmação do pagamento...";
  if (status === "PAYMENT_CONFIRMED") return "Pagamento confirmado! Seu pedido entrará em preparo em breve.";
  if (status === "PAYMENT_FAILED") return "Houve um problema com o pagamento. Entre em contato conosco.";
  return "";
};

const OrderList = ({ orders: initialOrders }: OrderListProps) => {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [notifications, setNotifications] = useState<{[key: number]: string}>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevOrdersRef = useRef(initialOrders);
  
  const handleBackClick = () => router.back();

  // Função para buscar atualizações dos pedidos
  const fetchOrdersUpdate = async () => {
    if (orders.length === 0) return;
    
    try {
      setIsRefreshing(true);
      
      // Busca atualizações para cada pedido com cache-busting
      const updatedOrders = await Promise.all(
        orders.map(async (order) => {
          try {
            // Força bypass do cache com timestamp
            const timestamp = Date.now();
            const response = await fetch(`/api/orders/${order.id}?includeProducts=true&t=${timestamp}`, {
              method: 'GET',
              headers: { 
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              cache: 'no-store'
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Pedido ${order.id} - Status atual: ${order.status}, Novo status: ${data.data?.status}`);
              return data.data || order;
            } else {
              console.error(`Erro na response para pedido ${order.id}:`, response.status);
            }
            return order;
          } catch (error) {
            console.error(`Erro ao buscar pedido ${order.id}:`, error);
            return order;
          }
        })
      );

      // Detecta mudanças de status para mostrar notificações
      const newNotifications: {[key: number]: string} = {};
      updatedOrders.forEach((newOrder, index) => {
        const oldOrder = prevOrdersRef.current[index];
        if (oldOrder && oldOrder.status !== newOrder.status) {
          newNotifications[newOrder.id] = `Status atualizado: ${getStatusLabel(newOrder.status)}`;
          
          // Som de notificação para mudanças importantes
          if (newOrder.status === 'IN_PREPARATION' || newOrder.status === 'FINISHED') {
            playNotificationSound();
          }
        }
      });

      if (Object.keys(newNotifications).length > 0) {
        setNotifications(newNotifications);
        // Remove notificações após 5 segundos
        setTimeout(() => setNotifications({}), 5000);
      }

      setOrders(updatedOrders);
      prevOrdersRef.current = updatedOrders;
      setLastUpdate(new Date());

    } catch (error) {
      console.error("Erro ao atualizar pedidos:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Som de notificação
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      // Ignore errors
    }
  };

  // Polling automático mais agressivo
  useEffect(() => {
    // Busca imediatamente ao montar
    fetchOrdersUpdate();

    // Interval mais curto para detectar mudanças de pagamento rapidamente
    const intervalTime = 2000; // 2 segundos sempre (mais rápido)
    
    intervalRef.current = setInterval(() => {
      console.log('Executando polling automático...');
      fetchOrdersUpdate();
    }, intervalTime);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Remove dependência de orders.length

  // Para o polling quando a aba não está visível (simplificado)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Aba ficou visível - forçando atualização');
        fetchOrdersUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className="space-y-6 p-6 relative">
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onClick={handleBackClick}
      >
        <ChevronLeftIcon />
      </Button>

      {/* Header com status de atualização */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollTextIcon />
          <h2 className="text-lg font-semibold">Meus Pedidos</h2>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
          {isRefreshing ? 'Atualizando...' : `Última: ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      {/* Notificações flutuantes */}
      {Object.entries(notifications).map(([orderId, message]) => (
        <div 
          key={orderId}
          className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce"
        >
          {message}
        </div>
      ))}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ScrollTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">Você ainda não fez nenhum pedido</p>
            <p className="text-gray-400 text-sm mt-2">Quando fizer um pedido, ele aparecerá aqui</p>
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className={`transition-all duration-500 ${
            notifications[order.id] ? 'ring-2 ring-blue-500 shadow-lg' : ''
          }`}>
            <CardContent className="space-y-4 p-5">
              {/* Status com ícone e animação */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(order.status)} transition-all duration-300`}>
                  {getStatusIcon(order.status)}
                  {getStatusLabel(order.status)}
                </div>
                
                {(order.status === 'IN_PREPARATION' || order.status === 'FINISHED') && (
                  <div className="text-xs text-gray-500">
                    Atualizado: {new Date(order.updatedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Mensagem do status */}
              <div className={`p-3 rounded-lg text-sm ${
                order.status === 'FINISHED' ? 'bg-green-50 text-green-800 border border-green-200' :
                order.status === 'IN_PREPARATION' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                order.status === 'PAYMENT_CONFIRMED' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {getStatusMessage(order.status)}
              </div>

              {/* Progresso visual */}
              {order.status !== 'PAYMENT_FAILED' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pedido</span>
                    <span>Pagamento</span>
                    <span>Preparo</span>
                    <span>Pronto</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        order.status === 'FINISHED' ? 'bg-green-500 w-full' :
                        order.status === 'IN_PREPARATION' ? 'bg-orange-500 w-3/4' :
                        order.status === 'PAYMENT_CONFIRMED' ? 'bg-blue-500 w-2/4' :
                        'bg-gray-400 w-1/4'
                      }`}
                    ></div>
                  </div>
                </div>
              )}

              {/* Restaurante */}
              <div className="flex items-center gap-2">
                <div className="relative h-5 w-5">
                  <Image
                    src={order.restaurant.avatarImageUrl}
                    alt={order.restaurant.name}
                    className="rounded-sm"
                    fill
                  />
                </div>
                <p className="text-sm font-semibold">{order.restaurant.name}</p>
              </div>

              <Separator />

              {/* Produtos */}
              <div className="space-y-2">
                {order.orderProducts.map((orderProduct) => (
                  <div key={orderProduct.id} className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs font-semibold text-white">
                      {orderProduct.quantity}
                    </div>
                    <p className="text-sm">{orderProduct.product.name}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Total e informações do pedido */}
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                <div className="text-xs text-gray-500">
                  Pedido #{order.id} • {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Tempo estimado para pedidos em preparo */}
              {order.status === 'IN_PREPARATION' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <ChefHat className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-orange-800 font-medium">Tempo estimado: 15-20 minutos</p>
                </div>
              )}

              {/* Call-to-action para pedidos prontos */}
              {order.status === 'FINISHED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">Seu pedido está pronto para retirada!</p>
                  <p className="text-xs text-green-600 mt-1">Dirija-se ao balcão do restaurante</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Indicador de atualização automática */}
      <div className="text-center text-xs text-gray-400 py-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Atualizando automaticamente • Última atualização: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default OrderList;