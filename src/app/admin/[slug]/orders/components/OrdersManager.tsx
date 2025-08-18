'use client';

import { useCallback, useEffect, useRef, useState } from "react";

export default function OrdersManager({ initialOrders, slug }) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isVisible, setIsVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Refs para controle de memória
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastFetchTime = useRef(Date.now());

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

  const fetchOrders = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < 2000) return;
    lastFetchTime.current = now;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsRefreshing(true);

      const res = await fetch(
        `/api/admin/orders/list?slug=${slug}&hash=${Date.now()}`,
        { 
          signal: abortControllerRef.current.signal,
          headers: { 'Cache-Control': 'no-cache' }
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.orders) {
        setOrders(currentOrders => {
          const newOrders = data.orders;

          if (forceRefresh) return newOrders;

          const currentOrdersMap = new Map(
            currentOrders.map(order => [order.id, order])
          );

          const mergedOrders = newOrders.map(newOrder => {
            const currentOrder = currentOrdersMap.get(newOrder.id);

            if (currentOrder) {
              const currentUpdated = new Date(currentOrder.updatedAt || currentOrder.createdAt).getTime();
              const newUpdated = new Date(newOrder.updatedAt || newOrder.createdAt).getTime();
              return newUpdated > currentUpdated ? newOrder : currentOrder;
            }

            return newOrder;
          });

          const hasChanges = JSON.stringify(mergedOrders) !== JSON.stringify(currentOrders);

          if (hasChanges) {
            setLastUpdate(new Date());

            const currentOrderIds = new Set(currentOrders.map(o => o.id));
            const hasNewPaidOrders = newOrders.some(o => 
              !currentOrderIds.has(o.id) && o.status === 'PAYMENT_CONFIRMED'
            );

            if (hasNewPaidOrders && soundEnabled) {
              playNotificationSound();
            }

            return mergedOrders;
          }

          return currentOrders;
        });

        setRetryCount(0);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Erro ao buscar pedidos:", error);
        setRetryCount(prev => Math.min(prev + 1, 5));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [slug, soundEnabled]);

  // --- FUNÇÃO DE SOM ATUALIZADA ---
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!window._audioContext) {
        window._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = window._audioContext;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Áudio não suportado');
    }
  }, [soundEnabled]);

  async function updateStatus(orderId, newStatus) {
    setUpdatingOrders(prev => new Set(prev).add(orderId));

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
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

      setTimeout(() => fetchOrders(true), 500);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
      await fetchOrders(true);
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible) fetchOrders(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchOrders]);

  useEffect(() => {
    const clearCurrentInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (isVisible) {
      const hasActivePedidos = orders.some(o => 
        o.status === 'PAYMENT_CONFIRMED' || o.status === 'IN_PREPARATION'
      );
      
      let interval = hasActivePedidos ? 3000 : 8000;
      interval = interval * Math.min(retryCount + 1, 3);

      intervalRef.current = setInterval(() => {
        if (isVisible) fetchOrders();
      }, interval);
    } else {
      clearCurrentInterval();
    }

    return clearCurrentInterval;
  }, [isVisible, fetchOrders, retryCount, orders]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesFilter = selectedFilter === 'all' || order.status === selectedFilter;
    const matchesSearch = searchTerm === '' || 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerCpf.includes(searchTerm) ||
      order.id.toString().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'PAYMENT_CONFIRMED').length,
    preparing: orders.filter(o => o.status === 'IN_PREPARATION').length,
    finished: orders.filter(o => o.status === 'FINISHED').length,
    failed: orders.filter(o => o.status === 'PAYMENT_FAILED').length,
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-500 mb-4">Os pedidos aparecerão aqui quando chegarem</p>
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

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerenciador de Pedidos</h2>
            <div className="grid grid-cols-2 lg:flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Confirmados: <strong>{stats.confirmed}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span>Em Preparo: <strong>{stats.preparing}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Prontos: <strong>{stats.finished}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Total: <strong>{stats.total}</strong></span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                soundEnabled 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
              title={soundEnabled ? 'Som ativado' : 'Som desativado'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            
            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <span className={`${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
            
            <StatusIndicator 
              isRefreshing={isRefreshing} 
              lastUpdate={lastUpdate} 
              retryCount={retryCount}
              isVisible={isVisible}
            />
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou ID do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos', count: stats.total },
              { key: 'PAYMENT_CONFIRMED', label: 'Confirmados', count: stats.confirmed },
              { key: 'IN_PREPARATION', label: 'Em Preparo', count: stats.preparing },
              { key: 'FINISHED', label: 'Prontos', count: stats.finished },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedFilter === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado com os filtros aplicados</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              updateStatus={updateStatus}
              updatingOrders={updatingOrders}
              statusLabels={statusLabels}
              statusColors={statusColors}
              statusIcons={statusIcons}
            />
          ))
        )}
      </div>
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
    if (retryCount > 0) return `Erro ${retryCount}/5`;
    if (isRefreshing) return 'Sincronizando...';
    return `Última sync: ${lastUpdate.toLocaleTimeString()}`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isRefreshing && isVisible ? 'animate-pulse' : ''}`}></div>
      {getStatusText()}
    </div>
  );
}

// Componente otimizado para cada pedido
function OrderCard({ order, updateStatus, updatingOrders, statusLabels, statusColors, statusIcons }) {
  const isPriority = order.status === 'PAYMENT_CONFIRMED';
  const isUrgent = order.status === 'IN_PREPARATION';
  const orderTime = new Date(order.createdAt);
  const now = new Date();
  const timeDiff = Math.floor((now - orderTime) / (1000 * 60)); // em minutos
  
  const getTimeColor = () => {
    if (timeDiff > 30) return 'text-red-600';
    if (timeDiff > 15) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const cardClasses = `
    border rounded-xl p-6 transition-all duration-200 hover:shadow-md
    ${isPriority ? 'bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-200' : ''}
    ${isUrgent ? 'bg-amber-50 border-amber-200 shadow-md ring-1 ring-amber-200' : ''}
    ${!isPriority && !isUrgent ? 'bg-white border-gray-200' : ''}
  `;

  return (
    <div className={cardClasses}>
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900">{order.customerName}</h3>
                <span className="text-lg">{statusIcons[order.status]}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>CPF: <strong>{order.customerCpf}</strong></span>
                <span>ID: <strong>#{order.id}</strong></span>
                <span className={getTimeColor()}>
                  <strong>{timeDiff}min atrás</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">R$ {order.total?.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Produtos do Pedido:</p>
            <div className="space-y-2">
              {order.orderProducts?.map((op) => (
                <div key={op.id} className="flex justify-between items-center">
                  <span className="font-medium">{op.product?.name} x {op.quantity}</span>
                  <span className="font-bold text-gray-900">R$ {(op.product?.price * op.quantity)?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 lg:min-w-[200px]">
          {order.status === "PAYMENT_CONFIRMED" && (
            <button
              onClick={() => updateStatus(order.id, "IN_PREPARATION")}
              disabled={updatingOrders.has(order.id)}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
            >
              {updatingOrders.has(order.id) ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processando...
                </>
              ) : (
                <>
                  🍳 Iniciar Preparo
                </>
              )}
            </button>
          )}
          
          {order.status === "IN_PREPARATION" && (
            <button
              onClick={() => updateStatus(order.id, "FINISHED")}
              disabled={updatingOrders.has(order.id)}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
            >
              {updatingOrders.has(order.id) ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Finalizando...
                </>
              ) : (
                <>
                  ✅ Marcar como Pronto
                </>
              )}
            </button>
          )}
          
          <div className="text-xs text-gray-500 text-center">
            {orderTime.toLocaleDateString()} às {orderTime.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
