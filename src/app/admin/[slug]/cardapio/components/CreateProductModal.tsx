// src/app/admin/[slug]/cardapio/components/CreateProductModal.tsx
'use client';

import { Image as ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantSlug: string;
  categories: Category[];
  onSuccess: () => void;
}

export default function CreateProductModal({
  isOpen,
  onClose,
  restaurantSlug,
  categories,
  onSuccess,
}: CreateProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    ingredients: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim() || !formData.price || !formData.categoryId) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Por favor, insira um preço válido');
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = null;

      if (selectedImage) {
        const imageFormData = new FormData();
        imageFormData.append('file', selectedImage);
        imageFormData.append('restaurantSlug', restaurantSlug);

        // ✅ Envia cookie automaticamente
        const uploadResponse = await fetch('/api/admin/upload/product-image', {
          method: 'POST',
          body: imageFormData,
          credentials: 'include', // garante envio de cookies HTTP-only
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl; // corresponde ao endpoint
        } else {
          const err = await uploadResponse.json();
          throw new Error(err.error || 'Falha no upload da imagem');
        }
      }

      // Criar produto
      const response = await fetch('/api/admin/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug,
          name: formData.name,
          description: formData.description,
          price,
          categoryId: formData.categoryId,
          ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(i => i),
          imageUrl,
        }),
        credentials: 'include', // garante envio de cookies se necessário
      });

      if (response.ok) {
        setFormData({ name: '', description: '', price: '', categoryId: '', ingredients: '' });
        setSelectedImage(null);
        setImagePreview(null);
        onClose();
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao criar produto');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      alert(error.message || 'Erro ao criar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', description: '', price: '', categoryId: '', ingredients: '' });
      setSelectedImage(null);
      setImagePreview(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const activeCategories = categories.filter(cat => cat.isActive);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={handleClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button onClick={handleClose} disabled={isLoading} className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Novo Produto</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Upload de Imagem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Produto</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {imagePreview ? (
                        <Image src={imagePreview} alt="Preview" width={96} height={96} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Imagem
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={isLoading} />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Nome e Categoria */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome do Produto *</label>
                    <input type="text" id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Big Mac, Coca-Cola..." disabled={isLoading} required />
                  </div>

                  <div>
                    <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">Categoria *</label>
                    <select id="categoryId" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" disabled={isLoading} required>
                      <option value="">Selecione uma categoria</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição *</label>
                  <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Descrição detalhada do produto..." disabled={isLoading} required />
                </div>

                {/* Preço e Ingredientes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Preço (R$) *</label>
                    <input type="number" id="price" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" disabled={isLoading} required />
                  </div>

                  <div>
                    <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700">Ingredientes</label>
                    <input type="text" id="ingredients" value={formData.ingredients} onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Carne, Queijo, Alface..." disabled={isLoading} />
                    <p className="text-xs text-gray-500 mt-1">Separe por vírgula</p>
                  </div>
                </div>

                {/* Botões */}
                <div className="mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button type="submit" disabled={isLoading || activeCategories.length === 0} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm">
                    {isLoading ? 'Criando...' : 'Criar Produto'}
                  </button>
                  <button type="button" onClick={handleClose} disabled={isLoading} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                    Cancelar
                  </button>
                </div>

                {activeCategories.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">Você precisa criar pelo menos uma categoria antes de adicionar produtos.</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
