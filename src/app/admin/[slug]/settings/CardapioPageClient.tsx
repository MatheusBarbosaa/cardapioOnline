"use client";

import { Edit2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useEffect,useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Tipos
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  menuCategoryId: string;
  menuCategory?: MenuCategory;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  products: Product[];
  isActive: boolean;
}

interface CardapioPageClientProps {
  categories: MenuCategory[];
  restaurantSlug: string;
}

export default function CardapioPageClient({ 
  categories: initialCategories, 
  restaurantSlug 
}: CardapioPageClientProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  
  // Estados para criar nova categoria
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  
  // Estados para criar/editar produto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    isActive: true
  });

  // Criar nova categoria
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${restaurantSlug}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          description: newCategoryDescription
        })
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories(prev => [...prev, { ...newCategory, products: [] }]);
        setNewCategoryName("");
        setNewCategoryDescription("");
        setShowNewCategory(false);
        toast.success("Categoria criada com sucesso!");
      } else {
        toast.error("Erro ao criar categoria");
      }
    } catch (error) {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Excluir categoria
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Tem certeza? Isso excluirá todos os produtos desta categoria.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${restaurantSlug}/categories/${categoryId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        toast.success("Categoria excluída com sucesso!");
      } else {
        toast.error("Erro ao excluir categoria");
      }
    } catch (error) {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Abrir modal para criar produto
  const openCreateProduct = (categoryId: string) => {
    setEditingProduct(null);
    setSelectedCategoryId(categoryId);
    setProductForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      isActive: true
    });
    setShowProductModal(true);
  };

  // Abrir modal para editar produto
  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedCategoryId(product.menuCategoryId);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      imageUrl: product.imageUrl || "",
      isActive: product.isActive
    });
    setShowProductModal(true);
  };

  // Upload de imagem do produto
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.imageUrl) {
        setProductForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
        toast.success("Imagem enviada com sucesso!");
      } else {
        toast.error("Erro ao enviar imagem");
      }
    } catch (error) {
      toast.error("Erro no upload");
    }
    setLoading(false);
  };

  // Salvar produto (criar ou editar)
  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }

    const price = parseFloat(productForm.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Preço deve ser um número válido");
      return;
    }

    setLoading(true);
    try {
      const url = editingProduct 
        ? `/api/admin/${restaurantSlug}/products/${editingProduct.id}`
        : `/api/admin/${restaurantSlug}/products`;
      
      const method = editingProduct ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          price,
          menuCategoryId: selectedCategoryId
        })
      });

      if (response.ok) {
        const savedProduct = await response.json();
        
        setCategories(prev => prev.map(category => {
          if (category.id === selectedCategoryId) {
            if (editingProduct) {
              // Editando produto existente
              return {
                ...category,
                products: category.products.map(p => 
                  p.id === editingProduct.id ? savedProduct : p
                )
              };
            } else {
              // Criando novo produto
              return {
                ...category,
                products: [...category.products, savedProduct]
              };
            }
          }
          return category;
        }));

        setShowProductModal(false);
        toast.success(editingProduct ? "Produto atualizado!" : "Produto criado!");
      } else {
        toast.error("Erro ao salvar produto");
      }
    } catch (error) {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Excluir produto
  const handleDeleteProduct = async (productId: string, categoryId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${restaurantSlug}/products/${productId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setCategories(prev => prev.map(category => 
          category.id === categoryId 
            ? { ...category, products: category.products.filter(p => p.id !== productId) }
            : category
        ));
        toast.success("Produto excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir produto");
      }
    } catch (error) {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Formatar preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cardápio</h1>
          <p className="text-muted-foreground">Gerencie categorias e produtos do seu cardápio</p>
        </div>
        <Button onClick={() => setShowNewCategory(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Criar nova categoria */}
      {showNewCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Criar Nova Categoria
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNewCategory(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Categoria</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Entradas, Pratos Principais, Bebidas..."
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Breve descrição da categoria"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateCategory} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Categoria
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowNewCategory(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de categorias */}
      <div className="space-y-6">
        {categories.map(category => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {category.name}
                    <Badge variant="secondary">
                      {category.products.length} produtos
                    </Badge>
                  </CardTitle>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => openCreateProduct(category.id)}
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Produto
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {category.products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum produto nesta categoria</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => openCreateProduct(category.id)}
                  >
                    Adicionar primeiro produto
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.products.map(product => (
                    <div key={product.id} className="border rounded-lg p-4">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">{product.name}</h4>
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-green-600">
                            {formatPrice(product.price)}
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openEditProduct(product)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteProduct(product.id, category.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal do produto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowProductModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do Produto</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do produto"
                />
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Input
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do produto"
                />
              </div>
              
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label>Imagem do Produto</Label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="w-full"
                  />
                  {productForm.imageUrl && (
                    <img
                      src={productForm.imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive">Produto ativo</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveProduct} disabled={loading} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingProduct ? "Atualizar" : "Criar"} Produto
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowProductModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {categories.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Você ainda não criou nenhuma categoria para seu cardápio
            </p>
            <Button onClick={() => setShowNewCategory(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}