/* eslint-disable @typescript-eslint/no-explicit-any */
import { verify } from 'jsonwebtoken';
import {
  DollarSign,
  ExternalLink,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

import { db } from '@/lib/prisma';


// Tipo para changeType
type ChangeType = 'positive' | 'negative' | 'neutral';

// Função para buscar dados do restaurante
async function getRestaurantData(slug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

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
          },
        },
      },
    });

    return restaurant;
  } catch {
    return null;
  }
}

interface AdminDashboardProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantData(slug);

  if (!restaurant) {
    return <div>Erro ao carregar dados do restaurante</div>;
  }

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
      changeType: 'positive',
    },
    {
      name: 'Faturamento',
      value: 'R$ 0,00',
      icon: DollarSign,
      change: '+0%',
      changeType: 'positive',
    },
    {
      name: 'Clientes',
      value: '0',
      icon: Users,
      change: '+0%',
      changeType: 'positive',
    },
    {
      name: 'Produtos',
      value: restaurant._count.products.toString(),
      icon: TrendingUp,
      change: '',
      changeType: 'neutral',
    },
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
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
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-gray-600">{restaurant.description}</p>
              <div className="flex items-center mt-2 space-x-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    restaurant.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
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
            <div
              key={item.name}
              className="bg-white overflow-hidden rounded-lg shadow-sm border"
            >
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
                          <div
                            className={`ml-2 flex items-baseline text-sm font-semibold ${
                              item.changeType === 'positive'
                                ? 'text-green-600'
                                : item.changeType === 'negative'
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
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
    </div>
  );
}