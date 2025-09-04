/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import type { Restaurant } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const runtime = "nodejs";

interface SettingsPageClientProps {
  restaurant: Restaurant;
}

export default function SettingsPageClient({ restaurant }: SettingsPageClientProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatarImageUrl: "",
    coverImageUrl: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name ?? "",
        description: restaurant.description ?? "",
        avatarImageUrl: restaurant.avatarImageUrl ?? "",
        coverImageUrl: restaurant.coverImageUrl ?? "",
      });
    }
  }, [restaurant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/restaurant", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Configurações atualizadas com sucesso!");
        router.refresh();
      } else {
        toast.error("Erro ao atualizar configurações.");
      }
    } catch (error) {
      toast.error("Erro na requisição.");
      console.error("Erro no PUT /api/admin/restaurant:", error);
    }

    setLoading(false);
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "avatarImageUrl" | "coverImageUrl"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload/product-image", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();

      if (res.ok && data.imageUrl) {
        console.log('✅ SUCESSO: Atualizando formData com nova URL:', data.imageUrl);
        setFormData((prev) => ({ ...prev, [field]: data.imageUrl }));
        toast.success("Imagem enviada com sucesso!");
      } else {
        console.error('❌ Erro no upload - res.ok:', res.ok, 'data:', data);
        toast.error("Falha ao enviar imagem.");
      }
    } catch (error) {
      console.error('❌ Erro no fetch do upload:', error);
      toast.error("Erro no upload da imagem.");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto p-4">
      {/* Nome */}
      <div>
        <Label htmlFor="name">Nome do restaurante</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      {/* Descrição */}
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      {/* Upload Avatar */}
      <div>
        <Label>Avatar / Logo</Label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, "avatarImageUrl")}
        />
        {formData.avatarImageUrl && (
          <div>
            <img
              src={formData.avatarImageUrl}
              alt="Avatar Preview"
              className="mt-2 h-32 w-32 rounded object-cover"
            />
            <p className="text-xs text-gray-500 mt-1 break-all">
              URL atual: {formData.avatarImageUrl}
            </p>
          </div>
        )}
      </div>

      {/* Upload Capa */}
      <div>
        <Label>Imagem de Capa</Label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, "coverImageUrl")}
        />
        {formData.coverImageUrl && (
          <div>
            <img
              src={formData.coverImageUrl}
              alt="Cover Preview"
              className="mt-2 h-40 w-full rounded object-cover"
            />
            <p className="text-xs text-gray-500 mt-1 break-all">
              URL atual: {formData.coverImageUrl}
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}
