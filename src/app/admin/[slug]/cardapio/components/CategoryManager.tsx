// src/app/admin/[slug]/cardapio/components/CategoryManager.tsx
'use client';

import { Edit2, Eye, EyeOff, Package,Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  products: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface CategoryManagerProps {
  categories: Category[];
  onRefresh: () => void;
}

export default function CategoryManager({ categories, onRefresh }: CategoryManagerProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '' });

  const handleToggleActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/categories/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          isActive: !currentStatus,
        }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        alert('Erro ao alterar status da categoria');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao alterar status da categoria');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category.id);
    setEditData({
      name: category.name,
      description: category.description || '',
    });
  };

  const handleSaveEdit = async (categoryId: string) => {
    try {
      const response = await fetch('/api/admin/categories/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          ...editData,
        }),
      });

      if (response.ok) {
        setEditingCategory(null);
        onRefresh();
      } else {
        alert('Erro ao atualizar categoria');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar categoria');
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoryName}"? Todos os produtos dessa categoria também serão removidos.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/categories/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        alert('Erro ao excluir categoria');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao excluir categoria');
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Nenhuma categoria criada
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comece criando sua primeira categoria de produtos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className={`bg-gray-50 rounded-lg p-6 border-2 ${
            category.isActive ? 'border-green-200' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {editingCategory === category.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Nome da categoria"
                  />
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Descrição da categoria (opcional)"
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveEdit(category.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {category.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {category.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {category.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {category.products.length} produto(s) nesta categoria
                  </p>
                </>
              )}
            </div>

            {editingCategory !== category.id && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleActive(category.id, category.isActive)}
                  className={`p-2 rounded-md ${
                    category.isActive
                      ? 'text-gray-400 hover:text-gray-600'
                      : 'text-green-500 hover:text-green-700'
                  }`}
                  title={category.isActive ? 'Desativar categoria' : 'Ativar categoria'}
                >
                  {category.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-blue-500 hover:text-blue-700 rounded-md"
                  title="Editar categoria"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id, category.name)}
                  className="p-2 text-red-500 hover:text-red-700 rounded-md"
                  title="Excluir categoria"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}