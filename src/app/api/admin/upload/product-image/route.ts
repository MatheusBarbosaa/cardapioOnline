// src/app/api/admin/upload/product-image/route.ts
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth"; // sua função JWT

// ✅ Variáveis obrigatórias
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidas"
  );
}

// Inicializa Supabase (server-side)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Obter token do cookie
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2️⃣ Validar token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // 3️⃣ Ler arquivo enviado
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // 4️⃣ Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5️⃣ Criar nome único
    const fileExt = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExt}`;

    // 6️⃣ Fazer upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from("restaurant-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (error || !data) {
      console.error("Erro no upload Supabase:", error);
      return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
    }

    // 7️⃣ Gerar URL pública
    const { data: publicUrlData } = supabase.storage
      .from("restaurant-images")
      .getPublicUrl(data.path);

    return NextResponse.json({ imageUrl: publicUrlData.publicUrl }, { status: 200 });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
