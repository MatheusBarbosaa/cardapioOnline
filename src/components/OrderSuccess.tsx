/* eslint-disable simple-import-sort/imports */
 
/* eslint-disable @next/next/no-img-element */
 
"use client";

import { MenuCategory, Order, OrderProduct, Product, Restaurant, User } from "@prisma/client";
import { 
  BarChart3, 
  DollarSign,
  MenuSquare,
  Package,
  Settings, 
  ShoppingBag, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TrendingUp,
  Users,
  Bell
} from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JWTPayload } from "@/lib/auth";
import { OrdersManagement } from "@/components/OrdersManagement"; // Importe o componente que criamos
import CardapioPageClient from "@/app/admin/[slug]/settings/CardapioPageClient";

interface OrderWithDetails extends Order {
  orderProducts: (OrderProduct & {
    product: Product;
  })[];
}

interface RestaurantWithRelations extends Restaurant {
  menuCategories: (MenuCategory & { products: Product[] })[];
  products: (Product & { menuCategory: MenuCategory })[];
  orders: OrderWithDetails[];
  users: User[];
}

interface RestaurantAdminPanelProps {
  restaurant: RestaurantWithRelations;
  currentUser: JWTPayload;
}

const RestaurantAdminPanel = ({ restaurant, currentUser }: RestaurantAdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState<OrderWithDetails[]>(restaurant.orders);

  // Calcular estatísticas
  const totalProducts = restaurant.products.length;
  const activeProducts = restaurant.products.filter(p => p.isActive).length;
  const totalCategories = restaurant.menuCategories.length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  
  // Estatísticas de pedidos por status
  const pendingOrders = orders.filter(o => ["PAYMENT_CONFIRMED", "IN_PREPARATION"].includes(o.status)).length;
  const finishedOrders = orders.filter(o => o.status === "FINISHED").length;
  const todaysOrders = orders.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  }).length;
  
  const todaysRevenue = orders.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  }).reduce((sum, order) => sum + order.total, 0);

  // Verificar permissões baseadas no role
  const canManageUsers = currentUser.role === "ADMIN";
  const canViewFinancials = ["ADMIN", "MANAGER"].includes(currentUser.role);

  // Efeito para atualizar a lista de pedidos quando necessário
  useEffect(() => {
    // Aqui você pode adicionar lógica adicional se necessário
    setOrders(restaurant.orders);
  }, [restaurant.orders]);

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
              {pendingOrders > 0 && (
                <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full">
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">{pendingOrders} novo(s)</span>
                </div>
              )}
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
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="cardapio" className="flex items-center gap-2">
              <MenuSquare className="w-4 h-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="flex items-center gap-2 relative">
              <ShoppingBag className="w-4 h-4" />
              Pedidos
              {pendingOrders > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingOrders}
                </span>
              )}
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários
              </TabsTrigger>
            )}
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todaysOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {pendingOrders > 0 ? `${pendingOrders} pendente(s)` : "Nenhum pendente"}
                  </p>
                </CardContent>
              </Card>

              {canViewFinancials && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {todaysRevenue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total: R$ {totalRevenue.toFixed(2)}
                    </p>
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
                  <p className="text-xs text-muted-foreground">
                    de {totalProducts} produtos
                  </p>
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

            {/* Resumo de Pedidos */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pagamento Confirmado</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {orders.filter(o => o.status === "PAYMENT_CONFIRMED").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Em Preparo</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      {orders.filter(o => o.status === "IN_PREPARATION").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Finalizados</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {finishedOrders}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Pedidos Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum pedido ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Pedido #{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerName} - {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                            <Badge variant={
                              order.status === "FINISHED" ? "default" :
                              order.status === "IN_PREPARATION" ? "secondary" :
                              order.status === "PAYMENT_CONFIRMED" ? "outline" :
                              "destructive"
                            }>
                              {order.status === "PAYMENT_CONFIRMED" ? "Novo" :
                               order.status === "IN_PREPARATION" ? "Preparo" :
                               order.status === "FINISHED" ? "Pronto" : order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cardápio - Usando o componente que você já tem */}
          <TabsContent value="cardapio">
            <CardapioPageClient 
              categories={restaurant.menuCategories}
              restaurantSlug={restaurant.slug}
            />
          </TabsContent>

          {/* Pedidos - Novo componente de gestão */}
          <TabsContent value="pedidos">
            <OrdersManagement 
              initialOrders={orders}
              restaurantId={restaurant.id}
            />
          </TabsContent>

          {/* Usuários - Apenas para ADMINs */}
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
                <div>
                  <h3 className="font-medium mb-2">Informações Básicas</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{restaurant.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Slug</p>
                      <p className="font-medium">{restaurant.slug}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="font-medium">{restaurant.description}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Status da Conta</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Status do Restaurante</p>
                      <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                        {restaurant.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pagamentos Stripe</p>
                      <Badge variant={restaurant.stripeOnboarded ? "default" : "destructive"}>
                        {restaurant.stripeOnboarded ? "Configurado" : "Pendente"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plano</p>
                      <Badge variant="outline">
                        {restaurant.subscriptionStatus.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {!restaurant.stripeOnboarded && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Configure os pagamentos
                    </h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Para receber pedidos, você precisa configurar sua conta do Stripe.
                    </p>
                    <Button>Configurar Pagamentos</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RestaurantAdminPanel;