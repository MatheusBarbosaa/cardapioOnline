import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import RestaurantAdminPanel from "@/components/admin/restaurant-admin-panel";
import { verifyAuthServer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminRestaurantPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;

  const user = await verifyAuthServer(token);

  if (!user) {
    redirect("/login");
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      users: {
        some: {
          id: user.userId,
        },
      },
    },
    include: {
      menuCategories: {
        include: {
          products: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      products: {
        include: {
          menuCategory: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      orders: {
        include: {
          orderProducts: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      users: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!restaurant) {
    redirect("/admin/restaurant/create");
  }

  return (
    <RestaurantAdminPanel
      restaurant={restaurant}
      currentUser={user}
    />
  );
}
