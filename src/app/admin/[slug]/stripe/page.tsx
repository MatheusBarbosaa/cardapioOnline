"use client";

import { useState } from 'react';

import { Button } from '@/components/ui/button';

const StripeConfigPage = () => {
  const [loading, setLoading] = useState(false);

  const handleStripeConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configuração de Pagamentos</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Stripe Connect</h2>
        <p className="text-gray-600 mb-6">
          Configure sua conta do Stripe para receber pagamentos diretamente dos seus clientes.
        </p>
        
        <Button 
          onClick={handleStripeConnect} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Configurando...' : 'Configurar Stripe'}
        </Button>
      </div>
    </div>
  );
};

export default StripeConfigPage;