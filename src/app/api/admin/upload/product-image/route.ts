// src/app/api/admin/upload/product-image/route.ts
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Variáveis de ambiente
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Variáveis de ambiente do Supabase não configuradas");
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1️⃣ Token do cookie
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      console.warn("❌ Token ausente");
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      console.warn("❌ Token inválido");
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // 2️⃣ Ler arquivo
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      console.warn("❌ Nenhum arquivo enviado");
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    console.log("📄 Arquivo recebido:", file.name, file.type, file.size);

    // 3️⃣ Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4️⃣ Nome único
    const fileExt = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExt}`;

    // 5️⃣ Upload
    const { data, error } = await supabase.storage
      .from("restaurant-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    console.log("💾 Upload resultado:", data, error);

    if (error || !data) {
      console.error("❌ Erro no upload Supabase:", error);
      return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
    }

    // 6️⃣ Gerar URL pública
    const { data: publicUrlData, error: publicUrlError } = supabase.storage
      .from("restaurant-images")
      .getPublicUrl(data.path);

    if (publicUrlError || !publicUrlData) {
      console.error("❌ Erro ao gerar URL pública:", publicUrlError);
      return NextResponse.json({ error: "Falha ao gerar URL pública" }, { status: 500 });
    }

    console.log("🔗 URL pública gerada:", publicUrlData.publicUrl);

    return NextResponse.json({ imageUrl: publicUrlData.publicUrl }, { status: 200 });
  } catch (err) {
    console.error("❌ Erro inesperado no endpoint:", err);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
