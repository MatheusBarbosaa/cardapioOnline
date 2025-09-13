"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StoreToggleButtonProps {
  slug: string;
  initialStatus: boolean; // true = aberto, false = fechado
}

export default function StoreToggleButton({
  slug,
  initialStatus,
}: StoreToggleButtonProps) {
  const [isOpen, setIsOpen] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isOpen: !isOpen }),
      });

      if (!res.ok) {
        throw new Error("Erro ao atualizar status da loja");
      }

      setIsOpen(!isOpen);
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar o status da loja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={isOpen ? "default" : "destructive"}
      size="sm"
    >
      {loading ? (
        <Loader2 className="animate-spin h-4 w-4" />
      ) : isOpen ? (
        "Fechar Loja"
      ) : (
        "Abrir Loja"
      )}
    </Button>
  );
}
