/* eslint-disable prefer-const */
// src/app/admin/[slug]/cardapio/components/ProductManager.tsx
'use client';

import { Edit2, Eye, EyeOff, Filter,Package, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  ingredients: string[];
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  products: Product[];
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  menuCategories: Category[];
}

interface ProductManagerProps {
  restaurant: Restaurant;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onRefresh: () => void;
}

export default function ProductManager({ 
  restaurant, 
  selectedCategory, 
  onCategorySelect,
  onRefresh 
}: ProductManagerProps) {
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    price: 0,
    ingredients: [] as string[]
  });

  // Filtrar produtos pela categoria selecionada
  const filteredProducts = selectedCategory
    ? restaurant.menuCategories.find(cat => cat.id === selectedCategory)?.products || []
    : restaurant.menuCategories.flatMap(cat => cat.products);

  const allProducts = restaurant.menuCategories.flatMap(cat => cat.products);

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/products/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          isActive: !currentStatus,
        }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        alert('Erro ao alterar status do produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao alterar status do produto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      ingredients: product.ingredients
    });
  };

  const handleSaveEdit = async (productId: string) => {
    try {
      const response = await fetch('/api/admin/products/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          ...editData,
        }),
      });

      if (response.ok) {
        setEditingProduct(null);
        onRefresh();
      } else {
        alert('Erro ao atualizar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar produto');
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) {
      return;
    }

    try {
      // ✅ Função para pegar o token (tanto do localStorage quanto dos cookies)
      const getAuthToken = () => {
        // Tentar pegar do localStorage primeiro
        const token = localStorage.getItem('token');
        if (token) {
          return `Bearer ${token}`;
        }
        
        // Tentar pegar dos cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'token') {
            return `Bearer ${value}`;
          }
        }
        
        return null;
      };

      const authToken = getAuthToken();
      
      console.log('🗑️ Deletando produto:', productId);
      console.log('🔑 Token disponível:', !!authToken);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // ✅ Adicionar token se disponível
      if (authToken) {
        headers['Authorization'] = authToken;
      }

      const response = await fetch('/api/admin/products/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ productId }),
      });

      console.log('📤 Resposta da API:', response.status, response.statusText);

      if (response.ok) {
        console.log('✅ Produto deletado com sucesso');
        onRefresh();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('❌ Erro da API:', errorData);
        alert(`Erro ao excluir produto: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('Erro ao excluir produto');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategorySelect(e.target.value || null)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {restaurant.menuCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.products.length})
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {selectedCategory
            ? `${filteredProducts.length} produto(s) na categoria`
            : `${allProducts.length} produto(s) no total`
          }
        </div>
      </div>

      {/* Lista de Produtos */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {selectedCategory ? 'Nenhum produto nesta categoria' : 'Nenhum produto criado'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedCategory 
              ? 'Adicione produtos a esta categoria'
              : 'Comece criando seu primeiro produto'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-lg border-2 overflow-hidden ${
                product.isActive ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                <div className="flex space-x-4">
                  {/* Imagem do Produto */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações do Produto */}
                  <div className="flex-1">
                    {editingProduct === product.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Nome do produto"
                        />
                        <textarea
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Descrição do produto"
                          rows={3}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editData.price}
                              onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Ingredientes</label>
                            <input
                              type="text"
                              value={editData.ingredients.join(', ')}
                              onChange={(e) => setEditData({ 
                                ...editData, 
                                ingredients: e.target.value.split(',').map(i => i.trim()).filter(i => i)
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="Ingrediente 1, Ingrediente 2..."
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveEdit(product.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {product.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  product.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {product.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                              {formatPrice(product.price)}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              {product.description}
                            </p>
                            {product.ingredients.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700">Ingredientes:</p>
                                <p className="text-sm text-gray-600">
                                  {product.ingredients.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleToggleActive(product.id, product.isActive)}
                              className={`p-2 rounded-md ${
                                product.isActive
                                  ? 'text-gray-400 hover:text-gray-600'
                                  : 'text-green-500 hover:text-green-700'
                              }`}
                              title={product.isActive ? 'Desativar produto' : 'Ativar produto'}
                            >
                              {product.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-2 text-blue-500 hover:text-blue-700 rounded-md"
                              title="Editar produto"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id, product.name)}
                              className="p-2 text-red-500 hover:text-red-700 rounded-md"
                              title="Excluir produto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}