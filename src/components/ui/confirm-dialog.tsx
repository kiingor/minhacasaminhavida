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
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-coral-100 flex items-center justify-center">
          <AlertTriangle size={26} className="text-coral-600" />
        </div>
        <h3 className="font-display font-bold text-lg text-ink-900">{title}</h3>
        <p className="text-sm text-ink-500">{description}</p>
        <div className="flex gap-3 w-full pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="dark"
            className="flex-1"
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
