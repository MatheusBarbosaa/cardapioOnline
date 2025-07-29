import { db } from '@/lib/prisma';

import SettingsPageClient from './SettingsPageClient';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;

  // Busca o restaurante no banco
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant) {
    return <div>Restaurante não encontrado</div>;
  }

  // Passa o restaurante para o componente cliente
  return <SettingsPageClient restaurant={restaurant} />;
}