"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Check, Wallet, Ban, Loader2, Paperclip, FileText, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/formatters";
import { getIconeConta } from "@/components/financeiro/ContaForm";

interface EfetivarDialogProps {
  open: boolean;
  onClose: () => void;
  /** Callback com contaId selecionada (ou null para "sem conta") e o comprovante (storageId) opcional. */
  onConfirm: (
    contaId: Id<"contas"> | null,
    comprovanteStorageId?: Id<"_storage">
  ) => Promise<void> | void;
  /** Quantidade de lançamentos sendo efetivados (1 = single, >1 = bulk). */
  quantidade: number;
  /** Valor total agregado (opcional). */
  valorTotal?: number;
  /** Tipo dominante: "despesa" | "receita" | "misto". Muda o copy. */
  tipo: "despesa" | "receita" | "misto";
  /** Conta sugerida (do cadastro). Vem preselecionada. */
  contaSugeridaId?: Id<"contas">;
}

export function EfetivarDialog({
  open,
  onClose,
  onConfirm,
  quantidade,
  valorTotal,
  tipo,
  contaSugeridaId,
}: EfetivarDialogProps) {
  const token = useSessionToken();
  const gerarUrlUpload = useMutation(api.financeiro.comprovantes.gerarUrlUpload);
  const contas = useQuery(
    api.financeiro.contas.list,
    token && open ? { sessionToken: token } : "skip"
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [erroComprovante, setErroComprovante] = useState<string | null>(null);

  const ativas = useMemo(
    () => (contas ?? []).filter((c) => c.ativa),
    [contas]
  );

  const [selectedId, setSelectedId] = useState<Id<"contas"> | null | "_init">("_init");
  const [processando, setProcessando] = useState(false);

  // Inicializa seleção quando dialog abre OU quando as contas chegam
  useEffect(() => {
    if (!open) return;
    if (selectedId !== "_init") return;
    if (ativas.length === 0) {
      setSelectedId(null);
      return;
    }
    if (contaSugeridaId && ativas.some((c) => c._id === contaSugeridaId)) {
      setSelectedId(contaSugeridaId);
    } else {
      setSelectedId(ativas[0]._id);
    }
  }, [open, ativas, contaSugeridaId, selectedId]);

  // Reseta seleção quando fecha
  useEffect(() => {
    if (!open) {
      setSelectedId("_init");
      setProcessando(false);
      setComprovante(null);
      setComprovantePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setErroComprovante(null);
    }
  }, [open]);

  function selecionarComprovante(file: File | null) {
    setErroComprovante(null);
    if (!file) return;
    const ok = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!ok) {
      setErroComprovante("Use uma imagem ou PDF");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErroComprovante("Arquivo muito grande (máx 15 MB)");
      return;
    }
    setComprovantePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
    setComprovante(file);
  }

  function removerComprovante() {
    setComprovante(null);
    setComprovantePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function handleConfirm() {
    if (selectedId === "_init") return;
    setProcessando(true);
    try {
      // Sobe o comprovante (se houver) antes de efetivar.
      let comprovanteStorageId: Id<"_storage"> | undefined;
      if (comprovante && token) {
        const url = await gerarUrlUpload({ sessionToken: token });
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": comprovante.type },
          body: comprovante,
        });
        if (!resp.ok) throw new Error("Falha ao enviar comprovante");
        const data = (await resp.json()) as { storageId: Id<"_storage"> };
        comprovanteStorageId = data.storageId;
      }
      await onConfirm(selectedId, comprovanteStorageId);
      onClose();
    } catch (err) {
      // erro fica visível no callsite — fechamos o dialog mesmo assim seria ruim
      setProcessando(false);
      setErroComprovante(err instanceof Error ? err.message : "Falha ao efetivar");
      console.error(err);
    }
  }

  const tituloPergunta =
    tipo === "receita"
      ? quantidade === 1
        ? "Em qual conta foi recebido?"
        : "Em qual conta foram recebidos?"
      : tipo === "despesa"
      ? quantidade === 1
        ? "De qual conta saiu o pagamento?"
        : "De qual conta saíram os pagamentos?"
      : "Qual conta foi usada?";

  const cta =
    tipo === "receita"
      ? quantidade === 1
        ? "Confirmar recebimento"
        : `Confirmar ${quantidade} recebimentos`
      : tipo === "despesa"
      ? quantidade === 1
        ? "Confirmar pagamento"
        : `Confirmar ${quantidade} pagamentos`
      : quantidade === 1
      ? "Confirmar efetivação"
      : `Confirmar ${quantidade} efetivações`;

  return (
    <Dialog open={open} onClose={onClose} title={tituloPergunta}>
      <div className="space-y-4">
        {/* Resumo */}
        <div className="rounded-2xl bg-cream-100 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-ink-600">
            {quantidade === 1 ? "1 lançamento" : `${quantidade} lançamentos`}
          </span>
          {typeof valorTotal === "number" && (
            <span className="font-mono font-bold text-ink-900">
              {formatBRL(valorTotal)}
            </span>
          )}
        </div>

        {/* Lista de contas */}
        {contas === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : ativas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-300 px-4 py-6 text-center">
            <Wallet size={32} className="mx-auto mb-2 text-ink-400" />
            <p className="text-sm text-ink-600">
              Nenhuma conta ativa cadastrada. Você pode confirmar sem vincular conta.
            </p>
          </div>
        ) : (
          <div className="max-h-[40vh] overflow-y-auto -mx-1 px-1 space-y-2">
            {ativas.map((c) => {
              const Icon = getIconeConta(c.icone);
              const selecionado = selectedId === c._id;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setSelectedId(c._id)}
                  className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                    selecionado
                      ? "border-coral-500 bg-coral-50 shadow-pop"
                      : "border-cream-300 bg-white hover:border-cream-400"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${c.cor}20`, color: c.cor }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink-900 truncate">{c.nome}</div>
                    {c.banco && (
                      <div className="text-xs text-ink-500 truncate">{c.banco}</div>
                    )}
                  </div>
                  {selecionado && (
                    <div className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Opção: sem conta vinculada */}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                selectedId === null
                  ? "border-ink-900 bg-ink-50 shadow-pop"
                  : "border-cream-300 bg-white hover:border-cream-400"
              }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-cream-200 text-ink-500">
                <Ban size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900">Sem conta vinculada</div>
                <div className="text-xs text-ink-500">
                  Não impacta saldo de nenhuma conta
                </div>
              </div>
              {selectedId === null && (
                <div className="w-6 h-6 rounded-full bg-ink-900 text-white flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        )}

        {/* Comprovante (opcional) */}
        <div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            onChange={(e) => {
              selecionarComprovante(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {comprovante ? (
            <div className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-white px-3 py-2.5">
              {comprovantePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comprovantePreview} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-cream-100 text-ink-500 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{comprovante.name}</div>
                <div className="text-xs text-ink-500">Comprovante anexado</div>
              </div>
              <button
                type="button"
                onClick={removerComprovante}
                disabled={processando}
                className="w-7 h-7 rounded-full flex items-center justify-center text-ink-400 hover:bg-cream-100 hover:text-ink-700 shrink-0"
                aria-label="Remover comprovante"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={processando}
              className="w-full rounded-2xl border border-dashed border-cream-300 px-3 py-2.5 flex items-center justify-center gap-2 text-sm text-ink-500 hover:border-coral-300 hover:text-coral-600 transition-colors"
            >
              <Paperclip size={16} /> Anexar comprovante (opcional)
            </button>
          )}
          {erroComprovante && <p className="text-xs text-danger mt-1">{erroComprovante}</p>}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedId === "_init" || processando}
          >
            {processando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {cta}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
