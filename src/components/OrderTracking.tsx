"use client"

import { Order, OrderProduct, Product } from "@prisma/client"
import { AlertCircle, CheckCircle, Clock, CreditCard, Package } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { pusherClient } from "@/lib/pusher"

interface OrderWithDetails extends Order {
  orderProducts: (OrderProduct & {
    product: Product
  })[]
}

interface OrderTrackingProps {
  order: OrderWithDetails
  restaurantName: string
}

const statusSteps = [
  {
    key: "PAYMENT_CONFIRMED",
    label: "Pagamento Confirmado",
    description: "Seu pagamento foi processado com sucesso",
    icon: CreditCard,
    color: "text-green-600",
  },
  {
    key: "IN_PREPARATION",
    label: "Em Preparo",
    description: "Seu pedido está sendo preparado",
    icon: Clock,
    color: "text-yellow-600",
  },
  {
    key: "FINISHED",
    label: "Pedido Pronto",
    description: "Seu pedido está pronto para retirada!",
    icon: Package,
    color: "text-blue-600",
  },
]

export function OrderTracking({ order: initialOrder, restaurantName }: OrderTrackingProps) {
  const [order, setOrder] = useState<OrderWithDetails>(initialOrder)
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")

  useEffect(() => {
    if (!pusherClient) {
      console.error("❌ Pusher client não está disponível")
      return
    }

    const channelName = `order-${order.id}`
    const channel = pusherClient.subscribe(channelName)

    console.log("📡 Cliente inscrito no canal:", channelName)

    const handleStatusUpdate = (data: { status: string; orderId: number }) => {
      console.log("📩 Evento recebido via Pusher:", data)

      if (data.orderId === order.id) {
        setOrder(prev => ({ ...prev, status: data.status }))

        if (data.status === "IN_PREPARATION") {
          showNotification("Seu pedido começou a ser preparado!", "👨‍🍳")
        } else if (data.status === "FINISHED") {
          showNotification("Seu pedido está pronto para retirada!", "🎉")
          playFinishedSound()
        }
      }
    }

    channel.bind("status-updated", handleStatusUpdate)

    pusherClient.connection.bind("state_change", (states: any) => {
      setConnectionStatus(states.current)
      console.log("🔌 Estado da conexão Pusher:", states.current)
    })

    return () => {
      console.log("❌ Cleanup do canal:", channelName)
      channel.unbind("status-updated", handleStatusUpdate)
      pusherClient.unsubscribe(channelName)
      pusherClient.connection.unbind("state_change")
    }
  }, [order.id])

  // 🔔 Notificações do navegador
  function showNotification(message: string, emoji: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(restaurantName, {
        body: message,
        icon: "/favicon.ico",
      })
    }
    console.log(`${emoji} ${message}`)
  }

  // 🔊 Som quando o pedido fica pronto
  function playFinishedSound() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return

      const audioContext = new AudioContext()
      ;[523.25, 659.25, 783.99].forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = freq
        oscillator.type = "sine"

        const startTime = audioContext.currentTime + index * 0.15
        const duration = 0.3

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      })

      setTimeout(() => {
        if (audioContext.state !== "closed") audioContext.close()
      }, 1000)
    } catch {
      console.log("🔇 Som não disponível")
    }
  }

  // Solicita permissão para notificações no primeiro render
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const getCurrentStepIndex = () => {
    const currentStatus = order.status
    if (currentStatus === "PAYMENT_FAILED" || currentStatus === "PENDING") return -1
    return statusSteps.findIndex(step => step.key === currentStatus)
  }

  const currentStepIndex = getCurrentStepIndex()
  const isOrderCompleted = order.status === "FINISHED"

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case "connecting":
        return { color: "text-blue-600", text: "Conectando...", icon: "🔄" }
      case "connected":
        return { color: "text-green-600", text: "Conectado - Atualizações em tempo real", icon: "✅" }
      case "unavailable":
      case "failed":
        return { color: "text-red-600", text: "Erro de conexão", icon: "⚠️" }
      default:
        return { color: "text-gray-600", text: "Conectando...", icon: "⏳" }
    }
  }

  const connectionInfo = getConnectionStatusInfo()

  // Casos especiais de status
  if (order.status === "PAYMENT_FAILED") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Pagamento não aprovado</CardTitle>
          <p className="text-gray-600">Houve um problema com o pagamento do seu pedido #{order.id}</p>
        </CardHeader>
      </Card>
    )
  }

  if (order.status === "PENDING") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle>Aguardando Pagamento</CardTitle>
          <p className="text-gray-600">Finalize o pagamento para que seu pedido seja processado</p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header do pedido */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Pedido #{order.id}</CardTitle>
              <p className="text-gray-600 mt-1">
                {restaurantName} • {new Date(order.createdAt).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {order.consumptionMethod === "TAKEAWAY" ? "Retirada no local" : "Consumo no local"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">R$ {order.total.toFixed(2)}</div>
              <Badge className={isOrderCompleted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                {isOrderCompleted ? "Concluído" : "Em andamento"}
              </Badge>
              <div className="flex items-center gap-2 text-xs mt-2">
                <span>{connectionInfo.icon}</span>
                <span className={connectionInfo.color}>{connectionInfo.text}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = index <= currentStepIndex
              const isCurrent = index === currentStepIndex

              return (
                <div key={step.key} className="flex items-center space-x-4">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}
                      ${isCurrent ? "ring-2 ring-blue-500" : ""}
                    `}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>

                  <div className="flex-1">
                    <h3 className={`font-medium ${isCompleted ? "text-green-800" : "text-gray-500"}`}>
                      {step.label}
                    </h3>
                    <p className={`text-sm ${isCompleted ? "text-green-600" : "text-gray-400"}`}>
                      {step.description}
                    </p>
                  </div>

                  <div>
                    {isCompleted && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Concluído
                      </Badge>
                    )}
                    {isCurrent && !isCompleted && (
                      <Badge className="bg-blue-100 text-blue-800">Em andamento</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Itens do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.orderProducts.map(orderProduct => (
              <div
                key={orderProduct.id}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <h4 className="font-medium">{orderProduct.product.name}</h4>
                  <p className="text-sm text-gray-600">Quantidade: {orderProduct.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    R$ {(orderProduct.quantity * orderProduct.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">R$ {orderProduct.price.toFixed(2)} cada</p>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de Pedido Concluído */}
      {isOrderCompleted && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-800">Pedido Pronto! 🎉</h3>
                <p className="text-green-700">
                  Seu pedido está pronto para retirada. Dirija-se ao balcão com este código:{" "}
                  <strong>#{order.id}</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
