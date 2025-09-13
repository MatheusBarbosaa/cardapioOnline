// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: "Logout realizado" });

  // Remove o cookie do token
  response.cookies.set({
    name: "auth-token",
    value: "",
    path: "/",
    maxAge: 0, // invalida o cookie
  });

  return response;
}
