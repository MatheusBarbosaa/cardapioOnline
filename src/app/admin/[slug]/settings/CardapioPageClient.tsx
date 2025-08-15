// src/app/admin/[slug]/cardapio/page.tsx
"use client";

import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  menuCategoryId: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  products: Product[];
}

interface CardapioProps {
  categories: MenuCategory[];
  restaurantSlug: string;
}

export default function CardapioPage({ categories: initialCategories, restaurantSlug }: CardapioProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [loading, setLoading] = useState(false);

  // Nova categoria
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // Produto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    isActive: true,
  });

  // Criar categoria
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${restaurantSlug}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, description: newCategoryDescription }),
      });
      if (res.ok) {
        const savedCategory = await res.json();
        setCategories(prev => [...prev, savedCategory]);
        setShowNewCategory(false);
        setNewCategoryName("");
        setNewCategoryDescription("");
        toast.success("Categoria criada!");
      } else toast.error("Erro ao criar categoria");
    } catch (err) {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Deletar categoria
  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Excluir categoria e produtos?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${restaurantSlug}/categories/${id}`, { method: "DELETE" });
      if (res.ok) setCategories(prev => prev.filter(c => c.id !== id));
      else toast.error("Erro ao excluir categoria");
    } catch (err) {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Abrir modal produto
  const openCreateProduct = (categoryId: string) => {
    setEditingProduct(null);
    setSelectedCategoryId(categoryId);
    setProductForm({ name: "", description: "", price: "", imageUrl: "", isActive: true });
    setShowProductModal(true);
  };
  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedCategoryId(product.menuCategoryId);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      imageUrl: product.imageUrl || "",
      isActive: product.isActive,
    });
    setShowProductModal(true);
  };

  // Upload imagem produto
  // Função para upload de imagem do produto
const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validações rápidas no client
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    toast.error("Tipo de arquivo não permitido. Use: JPEG, PNG ou WebP");
    e.currentTarget.value = "";
    return;
  }
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    toast.error("Arquivo muito grande. Máximo 5MB");
    e.currentTarget.value = "";
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Pega token do localStorage (que você já salva ao logar)
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Token de autenticação não encontrado");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/upload/product-image", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`, // envia token pro servidor
      },
      credentials: "include", // garante envio de cookies se houver
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Falha no upload");
    }

    // Atualiza o state do formulário com a URL retornada
    setProductForm(prev => ({ ...prev, imageUrl: data.url }));
    toast.success("Imagem enviada com sucesso!");
  } catch (err: any) {
    console.error("Erro no upload:", err);
    toast.error(err?.message || "Erro no upload");
  } finally {
    setLoading(false);
    // limpa input para permitir reenvio do mesmo arquivo
    e.currentTarget.value = "";
  }
};

  // Salvar produto
  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.price) return toast.error("Nome e preço obrigatórios");
    const price = parseFloat(productForm.price);
    if (isNaN(price) || price <= 0) return toast.error("Preço inválido");

    setLoading(true);
    try {
      const url = editingProduct
        ? `/api/admin/${restaurantSlug}/products/${editingProduct.id}`
        : `/api/admin/${restaurantSlug}/products`;
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productForm, price, menuCategoryId: selectedCategoryId }),
      });

      if (res.ok) {
        const saved = await res.json();
        setCategories(prev =>
          prev.map(c =>
            c.id === selectedCategoryId
              ? {
                  ...c,
                  products: editingProduct
                    ? c.products.map(p => (p.id === editingProduct.id ? saved : p))
                    : [...c.products, saved],
                }
              : c
          )
        );
        setShowProductModal(false);
        toast.success(editingProduct ? "Produto atualizado!" : "Produto criado!");
      } else toast.error("Erro ao salvar produto");
    } catch {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  // Deletar produto
  const handleDeleteProduct = async (productId: string, categoryId: string) => {
    if (!confirm("Excluir produto?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${restaurantSlug}/products/${productId}`, { method: "DELETE" });
      if (res.ok)
        setCategories(prev =>
          prev.map(c => (c.id === categoryId ? { ...c, products: c.products.filter(p => p.id !== productId) } : c))
        );
      else toast.error("Erro ao excluir produto");
    } catch {
      toast.error("Erro na requisição");
    }
    setLoading(false);
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cardápio</h1>
          <p className="text-muted-foreground">Gerencie categorias e produtos</p>
        </div>
        <Button onClick={() => setShowNewCategory(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      {showNewCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Criar Nova Categoria
              <Button variant="ghost" size="sm" onClick={() => setShowNewCategory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Nome da categoria" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
            <Input placeholder="Descrição (opcional)" value={newCategoryDescription} onChange={e => setNewCategoryDescription(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={handleCreateCategory} disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> Salvar Categoria
              </Button>
              <Button variant="outline" onClick={() => setShowNewCategory(false)} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista categorias */}
      {categories.map(category => (
        <Card key={category.id}>
          <CardHeader className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {category.name} <Badge variant="secondary">{category.products.length} produtos</Badge>
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openCreateProduct(category.id)} disabled={loading}>
                <Plus className="w-4 h-4 mr-1" /> Produto
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(category.id)} disabled={loading}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {category.products.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum produto nesta categoria</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.products.map(p => (
                  <div key={p.id} className="border rounded-lg p-4">
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded mb-2" />}
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">{p.name}</h4>
                      <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-green-600">{formatPrice(p.price)}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEditProduct(p)}><Edit2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(p.id, category.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Modal Produto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
                <Button variant="ghost" size="sm" onClick={() => setShowProductModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Nome" value={productForm.name} onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Descrição" value={productForm.description} onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))} />
              <Input placeholder="Preço" value={productForm.price} onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))} />
              <div className="flex gap-2 items-center">
                <input type="file" accept="image/*" onChange={handleProductImageUpload} />
                {productForm.imageUrl && <img src={productForm.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />}
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={handleSaveProduct} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" /> Salvar Produto
                </Button>
                <Button variant="outline" onClick={() => setShowProductModal(false)} disabled={loading}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
