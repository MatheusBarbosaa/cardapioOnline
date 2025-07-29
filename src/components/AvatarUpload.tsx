"use client";

import { useState } from 'react';
import { toast } from 'sonner';

export default function AvatarUpload({
  preview,
  setPreview,
  setFormData,
  field,
}: {
  preview: string;
  setPreview: (url: string) => void;
  setFormData: (fn: (prev: any) => any) => void;
  field: 'avatarImageUrl' | 'coverImageUrl';
}) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (res.ok && data.url) {
      setPreview(data.url);
      setFormData((prev) => ({ ...prev, [field]: data.url }));
      toast.success('Imagem enviada com sucesso!');
    } else {
      toast.error(data.error || 'Erro ao enviar imagem.');
    }

    setLoading(false);
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {loading && <p>Enviando imagem...</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Preview" className="mt-2 h-32 w-32 rounded object-cover" />
      )}
    </div>
  );
}
