// src/app/admin/components/ReportsPage.tsx
'use client';

import { useParams } from 'next/navigation';
import React from 'react';

import SalesReportsDashboard from './SalesReportsDashboard';

export default function ReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro de configuração</h3>
          <p className="text-red-600">Slug do restaurante não encontrado</p>
        </div>
      </div>
    );
  }

  return <SalesReportsDashboard slug={slug} />;
}