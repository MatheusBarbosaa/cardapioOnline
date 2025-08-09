// src/app/admin/[slug]/cardapio/components/CardapioManager.tsx
'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import CategoryManager from './CategoryManager';
import CreateCategoryModal from './CreateCategoryModal';
import CreateProductModal from './CreateProductModal';
import ProductManager from './ProductManager';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  menuCategories: Array<{
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    products: Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      imageUrl: string | null;
      ingredients: string[];
      isActive: boolean;
    }>;
  }>;
}

interface CardapioManagerProps {
  restaurant: Restaurant;
}

export default function CardapioManager({ restaurant }: CardapioManagerProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Recarrega a página para atualizar os dados
    window.location.reload();
  };

  const tabs = [
    { id: 'categories', label: 'Categorias', count: restaurant.menuCategories.length },
    { 
      id: 'products', 
      label: 'Produtos', 
      count: restaurant.menuCategories.reduce((acc, cat) => acc + cat.products.length, 0) 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Navegação de Abas */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Ações */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {activeTab === 'categories' ? 'Categorias do Cardápio' : 'Produtos'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'categories' 
                  ? 'Organize seu cardápio em categorias como Lanches, Bebidas, etc.'
                  : 'Gerencie os produtos de cada categoria'
                }
              </p>
            </div>
            
            <button
              onClick={() => {
                if (activeTab === 'categories') {
                  setShowCategoryModal(true);
                } else {
                  setShowProductModal(true);
                }
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'categories' ? 'Nova Categoria' : 'Novo Produto'}
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {activeTab === 'categories' ? (
            <CategoryManager 
              categories={restaurant.menuCategories} 
              onRefresh={handleRefresh}
            />
          ) : (
            <ProductManager 
              restaurant={restaurant}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </div>

      {/* Modais */}
      <CreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        restaurantSlug={restaurant.slug}
        onSuccess={handleRefresh}
      />

      <CreateProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        restaurantSlug={restaurant.slug}
        categories={restaurant.menuCategories}
        onSuccess={handleRefresh}
      />
    </div>
  );
}