"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Copy, Check, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ConviteFamiliaDialog({ open, onClose }: Props) {
  const token = useSessionToken();
  const convidar = useMutation(api.consultor.convidarFamilia);
  const [nomeFamiliaSugerido, setNomeFamiliaSugerido] = useState("");
  const [conviteCode, setConviteCode] = useState<string | null>(null);
  const [validadeDias, setValidadeDias] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  function handleClose() {
    setNomeFamiliaSugerido("");
    setConviteCode(null);
    setError("");
    setCopiado(false);
    onClose();
  }

  async function handleGerar() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await convidar({
        sessionToken: token,
        nomeFamiliaSugerido: nomeFamiliaSugerido.trim() || undefined,
      });
      setConviteCode(result.conviteCode);
      setValidadeDias(result.validadeDias);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar convite");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopiar() {
    if (!conviteCode) return;
    try {
      await navigator.clipboard.writeText(conviteCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Convidar nova família">
      {!conviteCode ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Gere um código de convite. Compartilhe com seu cliente e ele poderá ativar
            seu acesso na aba <strong>Configurações &gt; Consultor</strong> dele.
          </p>
          <Input
            label="Nome da família (opcional, só pra você lembrar)"
            value={nomeFamiliaSugerido}
            onChange={(e) => setNomeFamiliaSugerido(e.target.value)}
            placeholder="Ex: Família Souza"
          />
          {error && (
            <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleGerar} disabled={loading}>
              <Send size={16} /> {loading ? "Gerando..." : "Gerar código"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Código gerado! Copie e envie para seu cliente. Validade:{" "}
            <strong>{validadeDias} dias</strong>.
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">Código de convite</div>
            <div className="font-mono text-2xl font-bold tracking-wider text-slate-800 break-all">
              {conviteCode}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button onClick={handleCopiar}>
              {copiado ? (
                <>
                  <Check size={16} /> Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copiar código
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
