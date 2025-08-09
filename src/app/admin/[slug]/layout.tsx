import { verify } from "jsonwebtoken";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { slug } = await params;

  // cookies() já retorna uma Promise no Next.js 15+
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let user = null;

  if (token) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = verify(token, process.env.JWT_SECRET!) as any;
      user = {
        ...decoded,
        restaurant: {
          slug: decoded.restaurantSlug,
          name: decoded.restaurantName,
        },
      };
    } catch {
      // token inválido, user fica null
    }
  }

  if (!user || user.restaurant?.slug !== slug) {
    redirect("/admin/login");
  }

  const navigation = [
    { name: "Dashboard", href: `/admin/${slug}`, icon: LayoutDashboard },
    { name: "Cardápio", href: `/admin/${slug}/cardapio`, icon: MenuIcon }, // <-- Mudança aqui
    { name: "Pedidos", href: `/admin/${slug}/orders`, icon: ShoppingCart },
    { name: "Pagamentos", href: `/admin/${slug}/stripe`, icon: CreditCard },
    { name: "Relatórios", href: `/admin/${slug}/reports`, icon: BarChart3 },
    { name: "Configurações", href: `/admin/${slug}/settings`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b px-4">
            <h1 className="text-xl font-bold text-gray-900">
              {user.restaurant?.name}
            </h1>
          </div>

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

          <div className="border-t p-4">
            <div className="mb-3 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="pl-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
