// /api/admin/orders/notify.ts
import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(req: Request) {
  const { slug, order } = await req.json();

  if (!slug || !order) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Dispara o evento no canal do restaurante
  await pusher.trigger(`restaurant-${slug}`, "new-order", order);

  return NextResponse.json({ success: true });
}
