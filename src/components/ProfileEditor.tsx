/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, useState } from "react";

type Props = {
  name: string;
  description: string;
  avatarImageUrl: string;
  coverImageUrl: string;
};

export default function ProfileEditor(props: Props) {
  const [formData, setFormData] = useState({
    name: props.name,
    description: props.description,
    avatarImageUrl: props.avatarImageUrl,
    coverImageUrl: props.coverImageUrl,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (type === "avatar") {
      setFormData((prev) => ({ ...prev, avatarImageUrl: data.url }));
    } else {
      setFormData((prev) => ({ ...prev, coverImageUrl: data.url }));
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/restaurant/update", {
      method: "PUT",
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage("Salvo com sucesso!");
    } else {
      setMessage(data.error || "Erro ao salvar");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label>Nome</label>
        <input
          className="w-full border rounded p-2"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div>
        <label>Descrição</label>
        <textarea
          className="w-full border rounded p-2"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div>
        <label>Avatar</label>
        <input type="file" onChange={(e) => handleImageUpload(e, "avatar")} />
        {formData.avatarImageUrl && <img src={formData.avatarImageUrl} className="w-24 h-24 object-cover rounded mt-2" />}
      </div>
      <div>
        <label>Capa</label>
        <input type="file" onChange={(e) => handleImageUpload(e, "cover")} />
        {formData.coverImageUrl && <img src={formData.coverImageUrl} className="w-full h-32 object-cover rounded mt-2" />}
      </div>
      <button
        className="bg-black text-white px-4 py-2 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </div>
  );
}
