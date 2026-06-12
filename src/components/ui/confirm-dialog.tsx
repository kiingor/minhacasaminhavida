"use client";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  // Mensagem de erro exibida inline (ex.: backend barrou a ação). Combine com
  // closeOnConfirm={false} para o diálogo permanecer aberto após a falha.
  erro?: string;
  // Quando false, o botão de confirmar NÃO fecha o diálogo sozinho — o caller
  // fecha no sucesso. Permite exibir `erro` sem perder o diálogo. Default true
  // mantém o comportamento legado (fecha ao confirmar).
  closeOnConfirm?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar exclusão",
  description = "Essa ação não pode ser desfeita. Deseja continuar?",
  confirmLabel = "Excluir",
  loadingLabel = "Excluindo...",
  loading = false,
  erro,
  closeOnConfirm = true,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-coral-100 flex items-center justify-center">
          <AlertTriangle size={26} className="text-coral-600" />
        </div>
        <h3 className="font-display font-bold text-lg text-ink-900">{title}</h3>
        <p className="text-sm text-ink-500 whitespace-pre-line">{description}</p>
        {erro && (
          <p className="text-sm text-coral-600 flex items-center justify-center gap-1.5 -mt-1">
            <AlertCircle size={14} className="shrink-0" />
            <span>{erro}</span>
          </p>
        )}
        <div className="flex gap-3 w-full pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="dark"
            className="flex-1"
            onClick={() => {
              onConfirm();
              if (closeOnConfirm) onClose();
            }}
            disabled={loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
