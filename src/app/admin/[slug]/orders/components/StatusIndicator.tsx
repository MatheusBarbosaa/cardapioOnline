"use client";

import { useEffect, useState } from "react";

interface StatusIndicatorProps {
  isRefreshing: boolean;
  lastUpdate: Date;
  retryCount: number;
  isVisible: boolean;
}

function StatusIndicator({ isRefreshing, lastUpdate, retryCount, isVisible }: StatusIndicatorProps) {
  // Estado para controlar se estamos no cliente
  const [mounted, setMounted] = useState(false);

  // Só renderizar o timestamp após a hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  const getStatusColor = () => {
    if (!isVisible) return "bg-gray-400";
    if (retryCount > 0) return "bg-yellow-500";
    if (isRefreshing) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (!isVisible) return "Aba inativa";
    if (retryCount > 0) return `Erro ${retryCount}/5`;
    if (isRefreshing) return "Sincronizando...";
    
    // Só mostrar o timestamp após a hidratação
    if (!mounted) return "Carregando...";
    
    return `Última sync: ${lastUpdate.toLocaleTimeString()}`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div
        className={`h-2 w-2 rounded-full ${getStatusColor()} ${isRefreshing && isVisible ? "animate-pulse" : ""}`}
      ></div>
      {getStatusText()}
    </div>
  );
}

export default StatusIndicator;