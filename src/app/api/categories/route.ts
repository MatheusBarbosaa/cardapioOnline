import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getRestaurantBySlug } from "@/lib/getRestaurantBySlug"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const user = await auth()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const body = await req.json()
    const { name, description, imageUrl, slug } = body

    if (!name || !slug) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const restaurant = await getRestaurantBySlug(slug)
    if (!restaurant) {
      return new NextResponse("Restaurant not found", { status: 404 })
    }

    const category = await prisma.menuCategory.create({
      data: {
        name,
        description,
        image: imageUrl,
        restaurantId: restaurant.id,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error(error)
    return new NextResponse("Server error", { status: 500 })
  }
}
