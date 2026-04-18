"use client";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar exclusão",
  description = "Essa ação não pode ser desfeita. Deseja continuar?",
  confirmLabel = "Excluir",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
          <AlertTriangle size={24} className="text-danger" />
        </div>
        <h3 className="font-display font-bold text-lg">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
        <div className="flex gap-3 w-full pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 bg-danger hover:bg-danger/90 text-white"
            onClick={() => { onConfirm(); onClose(); }}
            disabled={loading}
          >
            {loading ? "Excluindo..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
