/* eslint-disable @typescript-eslint/no-explicit-any */
import { verify } from 'jsonwebtoken';
import { 
  DollarSign, 
  ExternalLink,
  Settings,
  ShoppingCart, 
  TrendingUp,
  Users
} from 'lucide-react';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

import { db } from '@/lib/prisma';

// Tipo para changeType
type ChangeType = 'positive' | 'negative' | 'neutral';

// Função para buscar dados do restaurante
async function getRestaurantData(slug: string) {
  const cookieStore = cookies();
  const token = (await cookieStore).get('auth-token')?.value;

  if (!token) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
            // orders: true, // Adicionar quando implementar orders
          }
        }
      }
    });

    return restaurant;
  } catch {
    return null;
  }
}

interface AdminDashboardProps {
  params: { slug: string };
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  const { slug } = await params; // AQUI é async await!
  const restaurant = await getRestaurantData(slug);

  if (!restaurant) {
    return <div>Erro ao carregar dados do restaurante</div>;
  }

  // Mock data - substitua por dados reais quando implementar
  const stats: {
    name: string;
    value: string;
    icon: React.ComponentType<any>;
    change: string;
    changeType: ChangeType;
  }[] = [
    {
      name: 'Pedidos Hoje',
      value: '0',
      icon: ShoppingCart,
      change: '+0%',
      changeType: 'positive'
    },
    {
      name: 'Faturamento',
      value: 'R$ 0,00',
      icon: DollarSign,
      change: '+0%',
      changeType: 'positive'
    },
    {
      name: 'Clientes',
      value: '0',
      icon: Users,
      change: '+0%',
      changeType: 'positive'
    },
    {
      name: 'Produtos',
      value: restaurant._count.products.toString(),
      icon: TrendingUp,
      change: '',
      changeType: 'neutral'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden">
              <Image
                src={restaurant.avatarImageUrl || '/placeholder-avatar.png'}
                alt={restaurant.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {restaurant.name}
              </h1>
              <p className="text-gray-600">{restaurant.description}</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  restaurant.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {restaurant.isActive ? 'Ativo' : 'Inativo'}
                </span>
                <Link 
                  href={`/${restaurant.slug}`}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  Ver loja
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
          
          <Link
            href={`/admin/${slug}/settings`}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="bg-white overflow-hidden rounded-lg shadow-sm border">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {item.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {item.value}
                        </div>
                        {item.change && (
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                            item.changeType === 'positive' 
                              ? 'text-green-600' 
                              : item.changeType === 'negative'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {item.change}
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href={`/admin/${slug}/menu`}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Gerenciar Cardápio</h3>
                <p className="text-sm text-gray-500">Adicionar e editar produtos</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/admin/${slug}/orders`}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Ver Pedidos</h3>
                <p className="text-sm text-gray-500">Acompanhar pedidos ativos</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/admin/${slug}/stripe`}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Configurar Pagamentos</h3>
                <p className="text-sm text-gray-500">
                  {restaurant.stripeOnboarded ? 'Gerenciar Stripe' : 'Conectar Stripe'}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Atividade Recente
        </h2>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma atividade recente</p>
          <p className="text-sm">Os pedidos e atividades aparecerão aqui</p>
        </div>
      </div>
    </div>
  );
}
