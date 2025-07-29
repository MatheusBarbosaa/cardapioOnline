"use client";

import { AlertCircle,Camera, Save } from 'lucide-react';
import Image from 'next/image';
import { useEffect,useState } from 'react';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarImageUrl: string;
  coverImageUrl: string;
  isActive: boolean;
}

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const [, setRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatarImageUrl: '',
    coverImageUrl: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Carregar dados do restaurante
  useEffect(() => {
    fetchRestaurantData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const fetchRestaurantData = async () => {
    try {
      const response = await fetch(`/api/admin/restaurant/${params.slug}`);
      const data = await response.json();
      
      if (response.ok) {
        setRestaurant(data);
        setFormData({
          name: data.name,
          description: data.description,
          avatarImageUrl: data.avatarImageUrl,
          coverImageUrl: data.coverImageUrl,
          isActive: data.isActive
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/admin/restaurant/${params.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        setRestaurant(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-2 text-gray-600">
          Gerencie as informações e aparência do seu restaurante
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <AlertCircle className="h-5 w-5" />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informações Básicas */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Informações Básicas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Restaurante
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug (URL)
              </label>
              <input
                type="text"
                value={params.slug}
                disabled
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                A URL não pode ser alterada após o cadastro
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descreva seu restaurante..."
              required
            />
          </div>

          <div className="mt-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Restaurante ativo (visível para clientes)
              </span>
            </label>
          </div>
        </div>

        {/* Imagens */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Imagens
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Logo/Avatar
              </label>
              <div className="space-y-4">
                <div className="relative w-32 h-32 mx-auto">
                  <Image
                    src={formData.avatarImageUrl || '/placeholder-avatar.png'}
                    alt="Avatar do restaurante"
                    fill
                    className="rounded-lg object-cover border-2 border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    value={formData.avatarImageUrl}
                    onChange={(e) => setFormData({ ...formData, avatarImageUrl: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://exemplo.com/logo.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendado: 400x400px, formato JPG ou PNG
                  </p>
                </div>
              </div>
            </div>

            {/* Cover */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Imagem de Capa
              </label>
              <div className="space-y-4">
                <div className="relative w-full h-32">
                  <Image
                    src={formData.coverImageUrl || '/placeholder-cover.jpg'}
                    alt="Capa do restaurante"
                    fill
                    className="rounded-lg object-cover border-2 border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    value={formData.coverImageUrl}
                    onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://exemplo.com/capa.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendado: 800x400px, formato JPG ou PNG
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              💡 Dica para as imagens:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use serviços como Imgur, Cloudinary ou hospede em seu servidor</li>
              <li>• Certifique-se de que as URLs são públicas e acessíveis</li>
              <li>• Imagens menores carregam mais rapidamente</li>
            </ul>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}