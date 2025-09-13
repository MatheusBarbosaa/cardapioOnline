// src/app/admin/[slug]/layout.tsx
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

import Sidebar from "./Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { slug } = await params;

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
      // token inválido
      user = null;
    }
  }

  if (!user || user.restaurant?.slug !== slug) {
    // Redireciona para login se não estiver autenticado
    throw redirect("/admin/login");
  }

  return <Sidebar user={user}>{children}</Sidebar>;
}
