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
    <div className="min-h-screen bg-gray-50/30">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Configurações do Restaurante
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie as informações básicas e imagens do seu restaurante
          </p>
        </div>

        {/* Main Form Card */}
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
          <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            {/* Basic Information Section */}
            <div className="p-8">
              <h2 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                Informações Básicas
              </h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Nome */}
                <div className="sm:col-span-1">
                  <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do restaurante
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Digite o nome do restaurante"
                  />
                </div>

                {/* Descrição */}
                <div className="sm:col-span-1">
                  <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </Label>
                  <Input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    required
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Breve descrição do restaurante"
                  />
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="p-8">
              <h2 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                Imagens
              </h2>
              
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Upload Avatar */}
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-3">
                    Logo do Restaurante
                  </Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="avatar-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg
                            className="w-8 h-8 mb-2 text-gray-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 16"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                            />
                          </svg>
                          <p className="text-xs text-gray-500">PNG, JPG até 10MB</p>
                        </div>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "avatarImageUrl")}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {formData.avatarImageUrl && (
                      <div className="relative">
                        <img
                          src={formData.avatarImageUrl}
                          alt="Avatar Preview"
                          className="h-32 w-32 rounded-lg object-cover shadow-sm ring-1 ring-gray-900/10"
                        />
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-xs text-gray-500 break-all font-mono">
                            {formData.avatarImageUrl}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Capa */}
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-3">
                    Imagem de Capa
                  </Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="cover-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg
                            className="w-8 h-8 mb-2 text-gray-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 16"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                            />
                          </svg>
                          <p className="text-xs text-gray-500">PNG, JPG até 10MB</p>
                        </div>
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "coverImageUrl")}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {formData.coverImageUrl && (
                      <div className="relative">
                        <img
                          src={formData.coverImageUrl}
                          alt="Cover Preview"
                          className="h-40 w-full rounded-lg object-cover shadow-sm ring-1 ring-gray-900/10"
                        />
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-xs text-gray-500 break-all font-mono">
                            {formData.coverImageUrl}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="bg-gray-50 px-8 py-4 flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  "Salvar Configurações"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-4 shadow-xl">
              <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700 font-medium">Processando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}