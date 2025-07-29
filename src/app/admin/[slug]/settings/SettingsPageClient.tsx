/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import type { Restaurant } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setFormData((prev) => ({ ...prev, [field]: data.url }));
        toast.success("Imagem enviada com sucesso!");
      } else {
        toast.error("Falha ao enviar imagem.");
      }
    } catch {
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={formData.avatarImageUrl}
            alt="Avatar Preview"
            className="mt-2 h-32 w-32 rounded object-cover"
          />
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={formData.coverImageUrl}
            alt="Cover Preview"
            className="mt-2 h-40 w-full rounded object-cover"
          />
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}
