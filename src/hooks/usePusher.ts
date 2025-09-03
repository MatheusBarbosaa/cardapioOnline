// src/hooks/usePusher.ts

import Pusher from 'pusher-js';
import { useEffect, useRef } from 'react';

interface UsePusherProps {
  slug: string;
  setOrders: (updater: (orders: any[]) => any[]) => void;
  soundEnabled: boolean;
  playNotificationSound: () => void;
}

export function usePusher({ 
  slug, 
  setOrders, 
  soundEnabled, 
  playNotificationSound 
}: UsePusherProps) {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Não conectar se não tiver slug válido
    if (!slug || slug === 'undefined') {
      console.warn('usePusher: slug inválido, não conectando:', slug);
      return;
    }

    // Verificar se as chaves do Pusher estão configuradas
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.warn('usePusher: Chaves do Pusher não configuradas');
      return;
    }

    try {
      console.log('🔗 Conectando ao Pusher para restaurante:', slug);

      // Criar instância do Pusher
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'], // Forçar WebSocket
        disabledTransports: ['xhr_polling', 'xhr_streaming', 'sockjs'], // Desabilitar fallbacks
        authEndpoint: '/api/pusher/auth',
        auth: {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      });

      // Subscrever ao canal do restaurante
      channelRef.current = pusherRef.current.subscribe(`restaurant-${slug}`);

      // Eventos de conexão
      pusherRef.current.connection.bind('connected', () => {
        console.log('✅ Pusher conectado com sucesso para:', slug);
      });

      pusherRef.current.connection.bind('disconnected', () => {
        console.log('❌ Pusher desconectado para:', slug);
      });

      pusherRef.current.connection.bind('error', (error: any) => {
        console.error('❌ Erro de conexão Pusher:', error);
      });

      // Escutar novos pedidos
      channelRef.current.bind('new-order', (data: any) => {
        console.log('📦 Novo pedido recebido:', data);
        
        if (data.order) {
          setOrders((currentOrders) => {
            // Evitar duplicatas
            const orderExists = currentOrders.some(order => order.id === data.order.id);
            if (orderExists) {
              return currentOrders;
            }
            
            // Adicionar novo pedido no topo
            const updatedOrders = [data.order, ...currentOrders];
            
            // Tocar som se habilitado e for pedido confirmado
            if (soundEnabled && data.order.status === 'PAYMENT_CONFIRMED') {
              setTimeout(playNotificationSound, 100);
            }
            
            return updatedOrders;
          });
        }
      });

      // Escutar atualizações de pedidos
      channelRef.current.bind('update-order', (data: any) => {
        console.log('🔄 Pedido atualizado:', data);
        
        if (data.order) {
          setOrders((currentOrders) => {
            return currentOrders.map(order => 
              order.id === data.order.id 
                ? { ...data.order, updatedAt: new Date().toISOString() }
                : order
            );
          });
        }
      });

      // Bind de subscription succeeded
      channelRef.current.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Subscription realizada com sucesso para:', `restaurant-${slug}`);
      });

      channelRef.current.bind('pusher:subscription_error', (error: any) => {
        console.error('❌ Erro na subscription:', error);
      });

    } catch (error) {
      console.error('❌ Erro ao configurar Pusher:', error);
    }

    // Cleanup
    return () => {
      console.log('🔌 Limpando conexões Pusher para:', slug);
      
      if (channelRef.current) {
        channelRef.current.unbind_all();
        if (pusherRef.current) {
          pusherRef.current.unsubscribe(`restaurant-${slug}`);
        }
        channelRef.current = null;
      }
      
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, [slug, soundEnabled, playNotificationSound, setOrders]);

  // Função para reconectar manualmente
  const reconnect = () => {
    if (pusherRef.current) {
      pusherRef.current.connect();
    }
  };

  return { reconnect };
}