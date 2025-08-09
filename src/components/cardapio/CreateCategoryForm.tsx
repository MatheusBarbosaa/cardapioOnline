"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { uploadImage } from "@/lib/uploadImage" // Supabase or similar

interface CreateCategoryFormProps {
  slug: string
}

export function CreateCategoryForm({ slug }: CreateCategoryFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = null
      if (image) {
        imageUrl = await uploadImage(image)
      }

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, imageUrl, slug }),
      })

      if (!res.ok) {
        throw new Error("Erro ao criar categoria")
      }

      toast.success("Categoria criada com sucesso!")
      setName("")
      setDescription("")
      setImage(null)
      router.refresh()
    } catch (err) {
      toast.error("Erro ao criar categoria")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Nome da categoria"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Textarea
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Criando..." : "Criar categoria"}
      </Button>
    </form>
  )
}
