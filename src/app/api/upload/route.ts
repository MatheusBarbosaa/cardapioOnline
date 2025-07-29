// /app/api/upload/route.ts
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const fileName = `${randomUUID()}-${file.name}`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);

  await writeFile(filePath, buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
