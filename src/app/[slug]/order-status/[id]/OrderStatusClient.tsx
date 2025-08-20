"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function OrderStatusClient({ initialOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [isVisible, setIsVisible] = useState(true);
  
  // Refs para controle
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastFetchTime = useRef(Date.now());
  const retryCount = useRef(0);

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

  // Função melhorada para buscar status
  const fetchOrderStatus = useCallback(async (showLoading = false) => {
    const now = Date.now();
    // Evitar muitas requisições seguidas
    if (now - lastFetchTime.current < 1000) return;
    lastFetchTime.current = now;

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) setIsLoading(true);
      setConnectionStatus('connecting');

      const response = await fetch(
        `/api/orders/status?id=${order.id}&t=${Date.now()}`,
        {
          signal: abortControllerRef.current.signal,
          headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.order) {
        setOrder(prevOrder => {
          // Verificar se houve mudança no status
          if (prevOrder.status !== data.order.status) {
            console.log(`📦 Status atualizado: ${prevOrder.status} → ${data.order.status}`);
            setLastUpdate(new Date());
            
            // Som de notificação quando pedido fica pronto
            if (data.order.status === 'FINISHED') {
              playFinishedSound();
            }
          }
          
          return data.order;
        });
        
        setConnectionStatus('connected');
        retryCount.current = 0;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao buscar status do pedido:', error);
        setConnectionStatus('error');
        retryCount.current = Math.min(retryCount.current + 1, 5);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [order.id]);

  // Som de notificação quando pedido fica pronto
  const playFinishedSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const audioContext = new AudioContext();
      
      // Som alegre: três notas ascendentes
      [523.25, 659.25, 783.99].forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (index * 0.15);
        const duration = 0.3;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
      
      setTimeout(() => {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      }, 1000);
      
    } catch (error) {
      console.log('Som não disponível');
    }
  }, []);

  // Controle de visibilidade da aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      // Buscar imediatamente quando a aba fica visível
      if (visible) {
        fetchOrderStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchOrderStatus]);

  // Polling inteligente baseado no status
  useEffect(() => {
    const clearCurrentInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (isVisible) {
      // Intervalos diferentes baseados no status
      let interval = 5000; // padrão 5 segundos
      
      if (order.status === 'PAYMENT_CONFIRMED' || order.status === 'IN_PREPARATION') {
        interval = 2000; // 2 segundos para pedidos ativos
      } else if (order.status === 'FINISHED' || order.status === 'PAYMENT_FAILED') {
        interval = 10000; // 10 segundos para pedidos finalizados
      }

      // Aumentar intervalo em caso de erro
      if (retryCount.current > 0) {
        interval = interval * Math.min(retryCount.current + 1, 3);
      }

      intervalRef.current = setInterval(() => {
        if (isVisible) fetchOrderStatus();
      }, interval);
    } else {
      clearCurrentInterval();
    }

    return clearCurrentInterval;
  }, [isVisible, fetchOrderStatus, order.status, retryCount.current]);

  // Limpeza no unmount
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

  // Função para refresh manual
  const handleRefresh = () => {
    fetchOrderStatus(true);
  };

  const getProgressPercentage = () => {
    const statusOrder = ['PENDING', 'PAYMENT_CONFIRMED', 'IN_PREPARATION', 'FINISHED'];
    const currentIndex = statusOrder.indexOf(order.status);
    
    if (order.status === 'PAYMENT_FAILED') return 0;
    if (currentIndex === -1) return 0;
    
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connecting':
        return { color: 'text-blue-600', text: 'Atualizando...', icon: '🔄' };
      case 'connected':
        return { color: 'text-green-600', text: `Última atualização: ${lastUpdate.toLocaleTimeString()}`, icon: '✅' };
      case 'error':
        return { color: 'text-red-600', text: `Erro (tentativa ${retryCount.current}/5)`, icon: '⚠️' };
      default:
        return { color: 'text-gray-600', text: 'Conectando...', icon: '⏳' };
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pedido #{order.id}
              </h1>
              <p className="text-gray-600">Cliente: <strong>{order.customerName}</strong></p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
              {isLoading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
          
          {/* Status de conexão */}
          <div className="flex items-center gap-2 text-xs">
            <span>{connectionInfo.icon}</span>
            <span className={connectionInfo.color}>{connectionInfo.text}</span>
          </div>
        </div>

        {/* Status atual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">{statusIcons[order.status]}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {statusLabels[order.status]}
              </h2>
              <p className="text-gray-600 mt-1">
                {statusDescriptions[order.status]}
              </p>
            </div>
          </div>

          {/* Badge do status */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>

          {/* Barra de progresso */}
          {order.status !== 'PAYMENT_FAILED' && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Progresso do pedido</span>
                <span>{Math.round(getProgressPercentage())}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Timeline de status */}
          <div className="grid grid-cols-4 gap-2 text-xs text-center mt-6">
            {['PENDING', 'PAYMENT_CONFIRMED', 'IN_PREPARATION', 'FINISHED'].map((status, index) => {
              const statusOrder = ['PENDING', 'PAYMENT_CONFIRMED', 'IN_PREPARATION', 'FINISHED'];
              const currentIndex = statusOrder.indexOf(order.status);
              const isCompleted = index <= currentIndex;
              const isCurrent = status === order.status;
              
              return (
                <div key={status} className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                    isCurrent ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className={`${isCurrent ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                    {statusLabels[status].split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
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
                <span className="font-semibold text-gray-900">
                  R$ {(op.product.price * op.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-600">R$ {order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ Informações Importantes</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Esta tela é atualizada automaticamente a cada poucos segundos</p>
            <p>• Você receberá uma notificação sonora quando seu pedido estiver pronto</p>
            <p>• Mantenha esta aba aberta para receber atualizações em tempo real</p>
            {order.status === 'FINISHED' && (
              <p className="font-semibold">🎉 Seu pedido está pronto para retirada!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}