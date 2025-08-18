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
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Refs
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

  // Inicializa AudioContext após primeira interação
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
      }
      window.removeEventListener('click', initAudioContext);
    };
    window.addEventListener('click', initAudioContext);
    return () => window.removeEventListener('click', initAudioContext);
  }, [audioContext]);

  // Som de notificação
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, [soundEnabled, audioContext]);

  const fetchOrders = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < 2000) return;
    lastFetchTime.current = now;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setIsRefreshing(true);

      const res = await fetch(`/api/admin/orders/list?slug=${slug}&hash=${Date.now()}`, {
        signal: abortControllerRef.current.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.orders) {
        setOrders(currentOrders => {
          const newOrders = data.orders;
          if (forceRefresh) return newOrders;

          const currentOrdersMap = new Map(currentOrders.map(order => [order.id, order]));
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

            // Som apenas para pedidos novos pagos
            const currentOrderIds = new Set(currentOrders.map(o => o.id));
            const hasNewPaidOrders = newOrders.some(o =>
              !currentOrderIds.has(o.id) && o.status === 'PAYMENT_CONFIRMED'
            );
            if (hasNewPaidOrders && soundEnabled) playNotificationSound();

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
  }, [slug, soundEnabled, playNotificationSound]);

  async function updateStatus(orderId, newStatus) {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order
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
      const hasActivePedidos = orders.some(o => o.status === 'PAYMENT_CONFIRMED' || o.status === 'IN_PREPARATION');
      let interval = hasActivePedidos ? 3000 : 8000;
      interval = interval * Math.min(retryCount + 1, 3);

      intervalRef.current = setInterval(() => { if (isVisible) fetchOrders(); }, interval);
    } else clearCurrentInterval();
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

  // JSX completo permanece igual
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

      {/* Filtros e busca */}
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
            {[{ key: 'all', label: 'Todos', count: stats.total },
              { key: 'PAYMENT_CONFIRMED', label: 'Confirmados', count: stats.confirmed },
              { key: 'IN_PREPARATION', label: 'Em Preparo', count: stats.preparing },
              { key: 'FINISHED', label: 'Prontos', count: stats.finished }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedFilter === filter.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="grid gap-4">
        {filteredOrders.map(order => (
          <OrderCard 
            key={order.id} 
            order={order} 
            updatingOrders={updatingOrders} 
            updateStatus={updateStatus} 
            statusLabels={statusLabels} 
            statusColors={statusColors} 
            statusIcons={statusIcons} 
          />
        ))}
      </div>
    </div>
  );
}

// --- OrderCard Component ---
function OrderCard({ order, updatingOrders, updateStatus, statusLabels, statusColors, statusIcons }) {
  const isUpdating = updatingOrders.has(order.id);

  return (
    <div className={`p-4 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${statusColors[order.status]}`}>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span className="font-medium">Pedido #{order.id}</span>
          <span className="text-sm text-gray-700">{order.customerName}</span>
        </div>
        <div className="text-sm text-gray-700">{order.customerCpf}</div>
        <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => updateStatus(order.id, 'IN_PREPARATION')}
          disabled={isUpdating}
          className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-sm"
        >
          👨‍🍳 Em Preparo
        </button>
        <button
          onClick={() => updateStatus(order.id, 'FINISHED')}
          disabled={isUpdating}
          className="px-3 py-1 rounded-lg bg-green-200 hover:bg-green-300 text-green-900 text-sm"
        >
          ✅ Pronto
        </button>
      </div>

      <div className="text-sm font-medium flex items-center gap-1">
        {statusIcons[order.status]} {statusLabels[order.status]}
      </div>
    </div>
  );
}

// --- StatusIndicator Component ---
function StatusIndicator({ isRefreshing, lastUpdate, retryCount, isVisible }) {
  return (
    <div className="text-sm text-gray-600 flex flex-col items-end">
      <span>{isRefreshing ? 'Atualizando...' : `Última atualização: ${lastUpdate.toLocaleTimeString()}`}</span>
      {retryCount > 0 && <span className="text-red-500">Tentativa de reconexão: {retryCount}</span>}
      {!isVisible && <span className="text-gray-400">Janela inativa</span>}
    </div>
  );
}
