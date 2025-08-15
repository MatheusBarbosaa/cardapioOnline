"use client";

import { useCallback, useEffect, useRef,useState } from "react";

export default function OrdersManager({ initialOrders, slug }) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isVisible, setIsVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs para controle de memória
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastFetchTime = useRef(Date.now());

  const statusLabels = {
    PAYMENT_CONFIRMED: "Pagamento Confirmado",
    IN_PREPARATION: "Em Preparo", 
    FINISHED: "Pronto",
    PENDING: "Pendente",
    PAYMENT_FAILED: "Pagamento Falhou",
  };

  const statusColors = {
    PAYMENT_CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_PREPARATION: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    FINISHED: "bg-green-100 text-green-800 border-green-200",
    PENDING: "bg-gray-100 text-gray-800 border-gray-200",
    PAYMENT_FAILED: "bg-red-100 text-red-800 border-red-200",
  };

  // Função otimizada para buscar apenas mudanças
  const fetchOrders = useCallback(async (forceRefresh = false) => {
    // Evita requests duplicadas muito próximas
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < 1500) {
      return;
    }
    lastFetchTime.current = now;

    // Cancela request anterior se ainda estiver rodando
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsRefreshing(true);
      
      // Busca apenas pedidos modificados recentemente (últimos 10 minutos)
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const res = await fetch(
        `/api/admin/orders/list?slug=${slug}&since=${since}&hash=${Date.now()}`,
        { 
          signal: abortControllerRef.current.signal,
          headers: { 'Cache-Control': 'no-cache' }
        }
      );
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.orders) {
        // Só atualiza se realmente houver mudanças
        const newOrdersJson = JSON.stringify(data.orders);
        const currentOrdersJson = JSON.stringify(orders);
        
        if (newOrdersJson !== currentOrdersJson) {
          setOrders(data.orders);
          setLastUpdate(new Date());
          
          // Som de notificação apenas para novos pedidos importantes
          if (data.orders.some(o => o.status === 'PAYMENT_CONFIRMED')) {
            playNotificationSound();
          }
        }
        
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Erro ao buscar pedidos:", error);
        setRetryCount(prev => Math.min(prev + 1, 5));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [slug, orders]);

  // Som de notificação
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3'); // Adicione um arquivo de som
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore se não conseguir tocar
    } catch (error) {
      // Ignore errors
    }
  }, []);

  async function updateStatus(orderId, newStatus) {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    
    // Optimistic update
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date() }
          : order
      )
    );
    
    try {
      const response = await fetch(`/api/admin/orders/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar status");

      // Força uma atualização imediata após mudança
      setTimeout(() => fetchOrders(true), 500);

    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
      await fetchOrders(true); // Reverte mudança otimista
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }

  // Controle de visibilidade da aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (visible) {
        // Quando volta a ser visível, busca atualizações
        fetchOrders(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchOrders]);

  // Polling inteligente baseado na atividade
  useEffect(() => {
    const clearCurrentInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (isVisible) {
      // Intervalo adaptativo baseado em retry count e tipos de pedidos
      const hasActivePedidos = orders.some(o => 
        o.status === 'PAYMENT_CONFIRMED' || o.status === 'IN_PREPARATION'
      );
      
      let interval = hasActivePedidos ? 3000 : 8000; // 3s para ativos, 8s para inativos
      interval = interval * Math.min(retryCount + 1, 3); // Aumenta intervalo em caso de erro
      
      intervalRef.current = setInterval(() => {
        if (isVisible) {
          fetchOrders();
        }
      }, interval);
    } else {
      clearCurrentInterval();
    }

    return clearCurrentInterval;
  }, [isVisible, fetchOrders, retryCount, orders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-500">Nenhum pedido encontrado</p>
          <StatusIndicator 
            isRefreshing={isRefreshing} 
            lastUpdate={lastUpdate} 
            retryCount={retryCount}
            isVisible={isVisible}
          />
        </div>
      </div>
    );
  }

  // Separar pedidos por prioridade
  const priorityOrders = orders.filter(o => o.status === 'PAYMENT_CONFIRMED');
  const activeOrders = orders.filter(o => o.status === 'IN_PREPARATION'); 
  const completedOrders = orders.filter(o => o.status === 'FINISHED');
  const otherOrders = orders.filter(o => 
    !['PAYMENT_CONFIRMED', 'IN_PREPARATION', 'FINISHED'].includes(o.status)
  );

  return (
    <div className="space-y-6">
      {/* Header com status inteligente */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold">Pedidos - Sistema Inteligente</h2>
            <p className="text-sm text-gray-600">
              Total: {orders.length} | Aguardando: {priorityOrders.length} | Em preparo: {activeOrders.length}
            </p>
          </div>
          <StatusIndicator 
            isRefreshing={isRefreshing} 
            lastUpdate={lastUpdate} 
            retryCount={retryCount}
            isVisible={isVisible}
          />
        </div>
      </div>

      {/* Seções organizadas por prioridade */}
      {priorityOrders.length > 0 && (
        <OrderSection 
          title={`🔔 Aguardando Preparo (${priorityOrders.length})`}
          orders={priorityOrders}
          updateStatus={updateStatus}
          updatingOrders={updatingOrders}
          statusLabels={statusLabels}
          statusColors={statusColors}
          priority={true}
          bgColor="bg-blue-50 border-blue-200"
        />
      )}

      {activeOrders.length > 0 && (
        <OrderSection 
          title={`🍳 Em Preparo (${activeOrders.length})`}
          orders={activeOrders}
          updateStatus={updateStatus}
          updatingOrders={updatingOrders}
          statusLabels={statusLabels}
          statusColors={statusColors}
          bgColor="bg-yellow-50 border-yellow-200"
        />
      )}

      {completedOrders.length > 0 && (
        <OrderSection 
          title={`✅ Prontos (${completedOrders.length})`}
          orders={completedOrders.slice(0, 5)} // Mostra apenas os 5 mais recentes
          updateStatus={updateStatus}
          updatingOrders={updatingOrders}
          statusLabels={statusLabels}
          statusColors={statusColors}
          bgColor="bg-green-50 border-green-200"
        />
      )}

      {otherOrders.length > 0 && (
        <OrderSection 
          title={`📋 Outros (${otherOrders.length})`}
          orders={otherOrders.slice(0, 3)} // Mostra apenas os 3 mais recentes
          updateStatus={updateStatus}
          updatingOrders={updatingOrders}
          statusLabels={statusLabels}
          statusColors={statusColors}
        />
      )}
    </div>
  );
}

// Componente para indicador de status
function StatusIndicator({ isRefreshing, lastUpdate, retryCount, isVisible }) {
  const getStatusColor = () => {
    if (!isVisible) return 'bg-gray-400';
    if (retryCount > 0) return 'bg-yellow-500';
    if (isRefreshing) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isVisible) return 'Aba inativa';
    if (retryCount > 0) return `Tentativa ${retryCount}/5`;
    if (isRefreshing) return 'Atualizando...';
    return `Última: ${lastUpdate.toLocaleTimeString()}`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isRefreshing && isVisible ? 'animate-pulse' : ''}`}></div>
      {getStatusText()}
    </div>
  );
}

// Componente para seção de pedidos
function OrderSection({ title, orders, updateStatus, updatingOrders, statusLabels, statusColors, priority = false, bgColor = "bg-gray-50" }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${bgColor}`}>
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            updateStatus={updateStatus}
            updatingOrders={updatingOrders}
            statusLabels={statusLabels}
            statusColors={statusColors}
            priority={priority}
          />
        ))}
      </div>
    </div>
  );
}

// Componente otimizado para cada pedido
function OrderCard({ order, updateStatus, updatingOrders, statusLabels, statusColors, priority = false }) {
  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-3 transition-all ${priority ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-gray-50'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-bold text-lg">{order.customerName}</p>
          <p className="text-sm text-gray-600">CPF: {order.customerCpf}</p>
          <p className="text-sm font-semibold">Total: R$ {order.total?.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {order.status === "PAYMENT_CONFIRMED" && (
            <button
              onClick={() => updateStatus(order.id, "IN_PREPARATION")}
              disabled={updatingOrders.has(order.id)}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 shadow-md"
            >
              {updatingOrders.has(order.id) ? "⏳ Atualizando..." : "🍳 Iniciar Preparo"}
            </button>
          )}
          
          {order.status === "IN_PREPARATION" && (
            <button
              onClick={() => updateStatus(order.id, "FINISHED")}
              disabled={updatingOrders.has(order.id)}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 shadow-md"
            >
              {updatingOrders.has(order.id) ? "⏳ Finalizando..." : "✅ Marcar Pronto"}
            </button>
          )}
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Produtos:</p>
        <div className="space-y-1">
          {order.orderProducts?.map((op) => (
            <div key={op.id} className="flex justify-between text-sm">
              <span>{op.product?.name} x {op.quantity}</span>
              <span className="text-gray-600">R$ {(op.product?.price * op.quantity)?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 border-t pt-2 flex justify-between">
        <span>#{order.id}</span>
        <span>{new Date(order.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
}