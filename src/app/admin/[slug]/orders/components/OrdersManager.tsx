"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePusher } from "@/hooks/usePusher";

import StatusIndicator from "./StatusIndicator";

export default function OrdersManager({ initialOrders, slug }) {
  if (!slug || slug === "undefined") {
    console.error("OrdersManager: slug inválido recebido:", slug);
    return (
      <div className="p-8 text-center text-red-600">
        Slug inválido. Não é possível carregar pedidos.
      </div>
    );
  }

  const [orders, setOrders] = useState(initialOrders);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Refs
  const intervalRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTime = useRef(0);
  const audioContextRef = useRef<any>(null);

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

  // Hidratação
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
      setLastUpdate(new Date());
      lastFetchTime.current = Date.now();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Valida slug (evita chamadas indevidas)
  useEffect(() => {
    if (!slug || slug === "undefined") {
      console.error("OrdersManager: slug inválido recebido:", slug);
    }
  }, [slug]);

  // Áudio
  const initializeAudio = useCallback(() => {
    if (audioInitialized || audioContextRef.current) return;
    try {
      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio API não suportada neste navegador");
        return;
      }
      audioContextRef.current = new AudioContext();
      setAudioInitialized(true);
      console.log("Áudio inicializado com sucesso");
    } catch (error) {
      console.error("Erro ao inicializar áudio:", error);
    }
  }, [audioInitialized]);

  const fallbackSimpleBeep = useCallback(() => {
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.error("Até o fallback falhou:", error);
    }
  }, []);

  const playNotificationSound = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) initializeAudio();
      const audioContext = audioContextRef.current;
      if (!audioContext) return;
      if (audioContext.state === "suspended") await audioContext.resume();
      const notes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.15 },
        { freq: 783.99, time: 0.3 },
      ];
      notes.forEach(({ freq, time }) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = "sine";
        const startTime = audioContext.currentTime + time;
        const duration = 0.2;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (error) {
      console.error("Erro ao tocar som:", error);
      fallbackSimpleBeep();
    }
  }, [soundEnabled, initializeAudio, fallbackSimpleBeep]);

  const testSound = useCallback(async () => {
    if (!audioInitialized) {
      initializeAudio();
      setTimeout(() => {
        playNotificationSound();
      }, 100);
    } else {
      playNotificationSound();
    }
  }, [audioInitialized, initializeAudio, playNotificationSound]);

  // 🔧 CORREÇÃO: usar o hook que já escuta "new-order" e "update-order"
  usePusher({
    slug,
    setOrders,
    soundEnabled,
    playNotificationSound,
  });

  const fetchOrders = useCallback(
    async (forceRefresh = false) => {
      if (!slug || slug === "undefined") {
        console.error("fetchOrders: slug inválido:", slug);
        return;
      }

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
          `/api/admin/orders/list?slug=${encodeURIComponent(slug)}&_=${isHydrated ? Date.now() : "init"}`,
          {
            signal: abortControllerRef.current.signal,
            headers: { "Cache-Control": "no-cache" },
            credentials: "include",
          },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // 🔧 CORREÇÃO: aceitar tanto { orders } quanto { data }
        const newOrders = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data?.data)
            ? data.data
            : null;

        if (newOrders) {
          setOrders((currentOrders) => {
            if (forceRefresh) {
              if (isHydrated) setLastUpdate(new Date());
              return newOrders;
            }

            const currentOrdersMap = new Map(
              currentOrders.map((o: any) => [o.id, o]),
            );
            const mergedOrders = newOrders.map((n: any) => {
              const c = currentOrdersMap.get(n.id);
              if (c) {
                const cu = new Date(c.updatedAt || c.createdAt).getTime();
                const nu = new Date(n.updatedAt || n.createdAt).getTime();
                return nu > cu ? n : c;
              }
              return n;
            });

            const hasChanges =
              mergedOrders.length !== currentOrders.length ||
              mergedOrders.some(
                (o, i) =>
                  o.id !== currentOrders[i].id ||
                  o.status !== currentOrders[i].status,
              );

            if (hasChanges && isHydrated) {
              setLastUpdate(new Date());

              const currentIds = new Set(currentOrders.map((o: any) => o.id));
              const hasNewPaid = newOrders.some(
                (o: any) =>
                  !currentIds.has(o.id) && o.status === "PAYMENT_CONFIRMED",
              );
              if (hasNewPaid && soundEnabled) {
                playNotificationSound();
              }
              return mergedOrders;
            }
            return hasChanges ? mergedOrders : currentOrders;
          });

          setRetryCount(0);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Erro ao buscar pedidos:", error);
          setRetryCount((prev) => Math.min(prev + 1, 5));
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [slug, soundEnabled, playNotificationSound, isHydrated],
  );

  async function updateStatus(orderId: number, newStatus: string) {
    setUpdatingOrders((prev) => new Set(prev).add(orderId));

    setOrders((prevOrders) =>
      prevOrders.map((order: any) =>
        order.id === orderId
          ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
          : order,
      ),
    );

    try {
      const response = await fetch(`/api/admin/orders/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Erro ao atualizar status");

      // Opcional: um refresh curto para garantir consistência
      setTimeout(() => fetchOrders(true), 500);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
      await fetchOrders(true);
    } finally {
      setUpdatingOrders((prev) => {
        const s = new Set(prev);
        s.delete(orderId);
        return s;
      });
    }
  }

  // Visibilidade
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible) fetchOrders(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchOrders]);

  // Polling adaptativo (fallback ao realtime)
  useEffect(() => {
    const clearCurrentInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (isVisible) {
      const hasActive = orders.some(
        (o: any) =>
          o.status === "PAYMENT_CONFIRMED" || o.status === "IN_PREPARATION",
      );
      let interval = hasActive ? 15000 : 60000;
      interval = interval * Math.min(retryCount + 1, 3);

      intervalRef.current = setInterval(() => {
        if (isVisible) fetchOrders();
      }, interval);
    } else {
      clearCurrentInterval();
    }
    return clearCurrentInterval;
  }, [isVisible, fetchOrders, retryCount, orders]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const filteredOrders = orders.filter((order: any) => {
    const matchesFilter =
      selectedFilter === "all" || order.status === selectedFilter;
    const matchesSearch =
      searchTerm === "" ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerCpf.includes(searchTerm) ||
      order.id.toString().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o: any) => o.status === "PENDING").length,
    confirmed: orders.filter((o: any) => o.status === "PAYMENT_CONFIRMED")
      .length,
    preparing: orders.filter((o: any) => o.status === "IN_PREPARATION").length,
    finished: orders.filter((o: any) => o.status === "FINISHED").length,
    failed: orders.filter((o: any) => o.status === "PAYMENT_FAILED").length,
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Nenhum pedido encontrado
          </h3>
          <p className="mb-4 text-gray-500">
            Os pedidos aparecerão aqui quando chegarem
          </p>
          {isHydrated && (
            <StatusIndicator
              isRefreshing={isRefreshing}
              lastUpdate={lastUpdate}
              retryCount={retryCount}
              isVisible={isVisible}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Gerenciador de Pedidos
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm lg:flex">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span>
                  Confirmados: <strong>{stats.confirmed}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                <span>
                  Em Preparo: <strong>{stats.preparing}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span>
                  Prontos: <strong>{stats.finished}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                <span>
                  Total: <strong>{stats.total}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  soundEnabled
                    ? "border border-blue-200 bg-blue-100 text-blue-700"
                    : "border border-gray-200 bg-gray-100 text-gray-700"
                }`}
                title={
                  soundEnabled
                    ? "Som ativado - clique para desativar"
                    : "Som desativado - clique para ativar"
                }
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>

              {soundEnabled && (
                <button
                  onClick={testSound}
                  className="rounded-lg border border-green-200 bg-green-100 px-2 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                  title="Testar som de notificação"
                >
                  🎵
                </button>
              )}
            </div>

            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700 disabled:bg-blue-400"
            >
              <span className={`${isRefreshing ? "animate-spin" : ""}`}>
                🔄
              </span>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>

            {isHydrated && (
              <StatusIndicator
                isRefreshing={isRefreshing}
                lastUpdate={lastUpdate}
                retryCount={retryCount}
                isVisible={isVisible}
              />
            )}
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou ID do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {[
              { key: "all", label: "Todos", count: stats.total },
              {
                key: "PAYMENT_CONFIRMED",
                label: "Confirmados",
                count: stats.confirmed,
              },
              {
                key: "IN_PREPARATION",
                label: "Em Preparo",
                count: stats.preparing,
              },
              { key: "FINISHED", label: "Prontos", count: stats.finished },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedFilter === filter.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              Nenhum pedido encontrado com os filtros aplicados
            </p>
          </div>
        ) : (
          filteredOrders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              updateStatus={updateStatus}
              updatingOrders={updatingOrders}
              statusLabels={statusLabels}
              statusColors={statusColors}
              statusIcons={statusIcons}
              isHydrated={isHydrated}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  updateStatus,
  updatingOrders,
  statusLabels,
  statusColors,
  statusIcons,
  isHydrated,
}) {
  const [timeDiff, setTimeDiff] = useState<number | null>(null);
  const isPriority = order.status === "PAYMENT_CONFIRMED";
  const isUrgent = order.status === "IN_PREPARATION";

  useEffect(() => {
    if (!isHydrated) return;

    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const diff = Math.floor((+now - +orderTime) / (1000 * 60));
    setTimeDiff(diff);

    const interval = setInterval(() => {
      const currentTime = new Date();
      const newDiff = Math.floor((+currentTime - +orderTime) / (1000 * 60));
      setTimeDiff(newDiff);
    }, 60000);

    return () => clearInterval(interval);
  }, [order.createdAt, isHydrated]);

  const getTimeColor = () => {
    if (timeDiff === null) return "text-gray-600";
    if (timeDiff > 30) return "text-red-600";
    if (timeDiff > 15) return "text-yellow-600";
    return "text-gray-600";
  };

  const cardClasses = `
    border rounded-xl p-6 transition-all duration-200 hover:shadow-md
    ${isPriority ? "bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-200" : ""}
    ${isUrgent ? "bg-amber-50 border-amber-200 shadow-md ring-1 ring-amber-200" : ""}
    ${!isPriority && !isUrgent ? "bg-white border-gray-200" : ""}
  `;

  if (!isHydrated || timeDiff === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
          <div className="h-4 w-1/2 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClasses}>
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">
                  {order.customerName}
                </h3>
                <span className="text-lg">{statusIcons[order.status]}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>
                  CPF: <strong>{order.customerCpf}</strong>
                </span>
                <span>
                  ID: <strong>#{order.id}</strong>
                </span>
                <span className={getTimeColor()}>
                  <strong>{timeDiff}min atrás</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                R$ {order.total?.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                statusColors[order.status] ||
                "border-gray-200 bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Produtos do Pedido:
            </p>
            <div className="space-y-2">
              {order.orderProducts?.map((op: any) => (
                <div key={op.id} className="flex items-center justify-between">
                  <span className="font-medium">
                    {op.product?.name} x {op.quantity}
                  </span>
                  <span className="font-bold text-gray-900">
                    R$ {(op.product?.price * op.quantity)?.toFixed(2)}
                  </span>
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
              className="flex w-full transform items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-medium text-white shadow-md transition-all hover:scale-105 hover:bg-amber-600 disabled:bg-amber-300"
            >
              {updatingOrders.has(order.id) ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processando...
                </>
              ) : (
                <>🍳 Iniciar Preparo</>
              )}
            </button>
          )}

          {order.status === "IN_PREPARATION" && (
            <button
              onClick={() => updateStatus(order.id, "FINISHED")}
              disabled={updatingOrders.has(order.id)}
              className="flex w-full transform items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-3 font-medium text-white shadow-md transition-all hover:scale-105 hover:bg-green-600 disabled:bg-green-300"
            >
              {updatingOrders.has(order.id) ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Finalizando...
                </>
              ) : (
                <>✅ Marcar como Pronto</>
              )}
            </button>
          )}

          <div className="text-center text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleDateString()} às{" "}
            {new Date(order.createdAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
