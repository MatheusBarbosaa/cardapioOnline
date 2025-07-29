/* eslint-disable @typescript-eslint/no-explicit-any */
import { verify } from 'jsonwebtoken';
import { 
  BarChart3,
  CreditCard,
  LayoutDashboard, 
  LogOut,
  Menu as MenuIcon, 
  Settings, 
  ShoppingCart, 
  User
} from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

async function getUser() {
  const cookieStore = await cookies(); // cookies() é sync
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    return {
      ...decoded,
      restaurant: { slug: decoded.restaurantSlug, name: decoded.restaurantName }
    };
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { slug } = params; // sem await

  const user = await getUser();

  if (!user) {
    redirect('/admin/login');
  }

  if (user.restaurant?.slug !== slug) {
    redirect('/admin/login');
  }

  const navigation = [
    { name: 'Dashboard', href: `/admin/${slug}`, icon: LayoutDashboard },
    { name: 'Cardápio', href: `/admin/${slug}/menu`, icon: MenuIcon },
    { name: 'Pedidos', href: `/admin/${slug}/orders`, icon: ShoppingCart },
    { name: 'Pagamentos', href: `/admin/${slug}/stripe`, icon: CreditCard },
    { name: 'Relatórios', href: `/admin/${slug}/reports`, icon: BarChart3 },
    { name: 'Configurações', href: `/admin/${slug}/settings`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b px-4">
            <h1 className="text-xl font-bold text-gray-900">
              {user.restaurant?.name}
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center w-full px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
