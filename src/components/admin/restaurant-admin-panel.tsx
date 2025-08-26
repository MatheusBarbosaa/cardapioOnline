/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import { MenuCategory, Order, Product, Restaurant, User } from "@prisma/client";
import { 
  BarChart3, 
  DollarSign,
  MenuSquare,
  Package,
  Settings, 
  ShoppingBag, 
  Users
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JWTPayload } from "@/lib/auth";
import CardapioPageClient from "@/app/admin/[slug]/settings/CardapioPageClient";

interface RestaurantWithRelations extends Restaurant {
  menuCategories: (MenuCategory & { products: Product[] })[];
  products: (Product & { menuCategory: MenuCategory })[];
  orders: (Order & { orderProducts: any[] })[];
  users: User[];
}

interface RestaurantAdminPanelProps {
  restaurant: RestaurantWithRelations;
}

const RestaurantAdminPanel = ({ restaurant }: RestaurantAdminPanelProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState<JWTPayload | null>(null);

  // --- JWT AUTH CHECK ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const payloadBase64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadBase64)) as JWTPayload;
      if (Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        router.push("/login");
      } else {
        setCurrentUser(payload);
      }
    } catch {
      localStorage.removeItem("token");
      router.push("/login");
    }
  }, [router]);

  if (!currentUser) return null; // evita renderizar antes da checagem do token

  // --- Estatísticas ---
  const totalProducts = restaurant.products.length;
  const activeProducts = restaurant.products.filter(p => p.isActive).length;
  const totalCategories = restaurant.menuCategories.length;
  const totalOrders = restaurant.orders.length;
  const totalRevenue = restaurant.orders.reduce((sum, order) => sum + order.total, 0);

  const canManageUsers = currentUser.role === "ADMIN";
  const canViewFinancials = ["ADMIN", "MANAGER"].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src={restaurant.avatarImageUrl} 
                alt={restaurant.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
                <p className="text-gray-600">{restaurant.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                {restaurant.isActive ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant={restaurant.stripeOnboarded ? "default" : "destructive"}>
                {restaurant.stripeOnboarded ? "Pagamentos OK" : "Configurar Pagamentos"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />Dashboard
            </TabsTrigger>
            <TabsTrigger value="cardapio" className="flex items-center gap-2">
              <MenuSquare className="w-4 h-4" />Cardápio
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />Pedidos
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="w-4 h-4" />Usuários
              </TabsTrigger>
            )}
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />Configurações
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Cards de estatísticas */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Todos os tempos</p>
                </CardContent>
              </Card>

              {canViewFinancials && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Todos os tempos</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeProducts}</div>
                  <p className="text-xs text-muted-foreground">de {totalProducts} produtos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                  <MenuSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCategories}</div>
                  <p className="text-xs text-muted-foreground">No cardápio</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cardápio */}
          <TabsContent value="cardapio">
            <CardapioPageClient categories={restaurant.menuCategories} restaurantSlug={restaurant.slug} />
          </TabsContent>

          {/* Pedidos */}
          <TabsContent value="pedidos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                {restaurant.orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pedido encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {restaurant.orders.map(order => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">Pedido #{order.id}</h3>
                            <p className="text-sm text-muted-foreground">{order.customerName} • {order.customerCpf}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">R$ {order.total.toFixed(2)}</p>
                            <Badge variant={
                              order.status === "FINISHED" ? "default" :
                              order.status === "IN_PREPARATION" ? "secondary" :
                              order.status === "PENDING" ? "destructive" : "outline"
                            }>
                              {order.status}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.consumptionMethod === "TAKEAWAY" ? "Retirada" : "No Local"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {order.orderProducts?.map((orderProduct: any) => (
                            <div key={orderProduct.id} className="flex justify-between text-sm">
                              <span>{orderProduct.quantity}x {orderProduct.product?.name}</span>
                              <span>R$ {(orderProduct.quantity * orderProduct.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usuários */}
          {canManageUsers && (
            <TabsContent value="usuarios" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usuários do Restaurante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {restaurant.users.map(user => (
                      <div key={user.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline">{user.role}</Badge>
                          {user.lastLogin && (
                            <p className="text-sm text-muted-foreground">
                              Último login: {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Configurações */}
          <TabsContent value="configuracoes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Restaurante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações e status */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RestaurantAdminPanel;
