"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategoriaSelect } from "./CategoriaSelect";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmar: (categoriaId: Id<"categorias">) => Promise<void>;
  tipoLancamentos: "despesa" | "receita";
  count: number;
}

export function ReclassificarDialog({
  open,
  onClose,
  onConfirmar,
  tipoLancamentos,
  count,
}: Props) {
  const token = useSessionToken();
  const categorias = useQuery(
    api.financeiro.categorias.list,
    token ? { sessionToken: token, tipo: tipoLancamentos } : "skip"
  );
  const [categoriaId, setCategoriaId] = useState<Id<"categorias"> | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCategoriaId("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  async function handleConfirmar() {
    if (!categoriaId) {
      setError("Selecione uma categoria");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirmar(categoriaId as Id<"categorias">);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reclassificar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose} title="Reclassificar lançamentos" className="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Aplicar nova categoria a{" "}
          <span className="font-bold text-primary">{count}</span>{" "}
          {count === 1 ? "lançamento" : "lançamentos"} de{" "}
          {tipoLancamentos === "despesa" ? "despesa" : "receita"}.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Nova categoria</label>
          <CategoriaSelect
            categorias={categorias}
            value={categoriaId}
            onChange={(v) => {
              setCategoriaId(v);
              setError("");
            }}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleConfirmar}
            disabled={loading || !categoriaId}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Aplicando...
              </>
            ) : (
              "Aplicar"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
