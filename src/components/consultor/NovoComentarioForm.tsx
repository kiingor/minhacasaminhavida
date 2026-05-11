"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";

interface Props {
  familyId: string;
  contextoTela: string;
  onCreated?: () => void;
  placeholder?: string;
}

export function NovoComentarioForm({ familyId, contextoTela, onCreated, placeholder }: Props) {
  const token = useSessionToken();
  const adicionar = useMutation(api.consultor.adicionarComentario);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || texto.trim().length === 0) return;
    setLoading(true);
    setError("");
    try {
      await adicionar({
        sessionToken: token,
        familyId,
        contextoTela,
        texto,
      });
      setTexto("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={placeholder ?? "Escreva um comentário para o cliente..."}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
      />
      {error && (
        <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-md px-2 py-1">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{texto.length}/2000</span>
        <Button type="submit" size="sm" disabled={loading || texto.trim().length === 0}>
          <Send size={14} /> {loading ? "Enviando..." : "Comentar"}
        </Button>
      </div>
    </form>
  );
}
