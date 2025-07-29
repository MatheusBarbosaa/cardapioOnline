"use client";

import { Restaurant } from "@prisma/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsPageProps {
  restaurant: Restaurant;
}

export default function SettingsPage({ restaurant }: SettingsPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatarImageUrl: "",
    coverImageUrl: "",
  });

  useEffect(() => {
    setFormData({
      name: restaurant.name,
      description: restaurant.description,
      avatarImageUrl: restaurant.avatarImageUrl,
      coverImageUrl: restaurant.coverImageUrl,
    });
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch(`/api/admin/restaurant`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      toast.success("Informações atualizadas com sucesso!");
    } else {
      toast.error("Erro ao atualizar informações.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <Label>Nome do restaurante</Label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
        />
      </div>

      {/* Descrição */}
      <div>
        <Label>Descrição</Label>
        <Input
          type="text"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
        />
      </div>

      {/* Upload Avatar */}
      <div>
        <Label>Avatar / Logo</Label>
        <AvatarUpload
          preview={formData.avatarImageUrl}
          setPreview={(url) =>
            setFormData((prev) => ({ ...prev, avatarImageUrl: url }))
          }
          setFormData={setFormData}
        />
      </div>

      {/* Upload Capa */}
      <div>
        <Label>Imagem de Capa</Label>
        <AvatarUpload
          preview={formData.coverImageUrl}
          setPreview={(url) =>
            setFormData((prev) => ({ ...prev, coverImageUrl: url }))
          }
          setFormData={setFormData}
        />
      </div>

      <Button type="submit">Salvar configurações</Button>
    </form>
  );
}

// Componente de Upload de Imagem
function AvatarUpload({
  preview,
  setPreview,
  setFormData,
}: {
  preview: string;
  setPreview: (url: string) => void;
  setFormData: (fn: (prev: any) => any) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formDataUpload,
    });

    const data = await res.json();

    if (res.ok) {
      setPreview(data.url);
      setFormData((prev: any) => ({
        ...prev,
        avatarImageUrl: data.url, // ou coverImageUrl, depende de onde usar
      }));
    } else {
      toast.error("Erro ao enviar imagem.");
    }

    setLoading(false);
  };

  return (
    <div>
      <Input type="file" onChange={handleUpload} />
      {loading && <p>Enviando imagem...</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Preview"
          className="mt-2 h-32 w-32 rounded object-cover"
        />
      )}
    </div>
  );
}
