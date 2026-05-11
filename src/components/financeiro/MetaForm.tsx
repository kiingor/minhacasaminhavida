"use client";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { Upload, X as XIcon, Link2, Image as ImageIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseBRL } from "@/lib/formatters";

const ICONES = ["Target", "Plane", "Car", "Home", "Heart", "Gift", "GraduationCap", "Laptop"];
const CORES = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"];

interface Props {
  meta?: Doc<"metas">;
  onClose: () => void;
}

export function MetaForm({ meta, onClose }: Props) {
  const token = useSessionToken();
  const isEdit = !!meta;
  const create = useMutation(api.financeiro.metas.create);
  const update = useMutation(api.financeiro.metas.update);
  const gerarUploadUrl = useMutation(api.financeiro.metas.gerarUploadUrl);

  const [titulo, setTitulo] = useState(meta?.titulo ?? "");
  const [descricao, setDescricao] = useState(meta?.descricao ?? "");
  const [valorAlvo, setValorAlvo] = useState(
    meta ? (meta.valorAlvo / 100).toFixed(2).replace(".", ",") : ""
  );
  const [prazo, setPrazo] = useState(meta?.prazo ?? "");
  const [icone, setIcone] = useState(meta?.icone ?? ICONES[0]);
  const [cor, setCor] = useState(meta?.cor ?? CORES[0]);

  // Foto: preview pode vir do storage (fotoUrl), URL externa ou objeto local
  const [fotoPreview, setFotoPreview] = useState<string | null>(meta?.fotoUrl ?? null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [urlExternaStr, setUrlExternaStr] = useState("");
  const [modoFoto, setModoFoto] = useState<"upload" | "url">("upload");
  const [fotoRemovida, setFotoRemovida] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setUrlExternaStr("");
    setFotoRemovida(false);
  }

  function onUrlExternaChange(value: string) {
    setUrlExternaStr(value);
    setFotoFile(null);
    setFotoPreview(value.trim() || null);
    setFotoRemovida(false);
  }

  function removerFoto() {
    setFotoFile(null);
    setFotoPreview(null);
    setUrlExternaStr("");
    setFotoRemovida(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCent = parseBRL(valorAlvo);
    if (!titulo.trim() || valorCent <= 0) {
      setError("Preencha título e valor.");
      return;
    }
    if (!token) {
      setError("Nao autenticado.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Upload da foto se houver arquivo novo
      let fotoStorageId: Id<"_storage"> | undefined;
      if (fotoFile) {
        const uploadUrl = await gerarUploadUrl({ sessionToken: token });
        const res = await fetch(uploadUrl, {
          method: "POST",
          body: fotoFile,
          headers: { "Content-Type": fotoFile.type },
        });
        if (!res.ok) throw new Error("Falha ao enviar foto.");
        const json = (await res.json()) as { storageId: Id<"_storage"> };
        fotoStorageId = json.storageId;
      }

      const fotoUrlExterna =
        modoFoto === "url" && urlExternaStr.trim() ? urlExternaStr.trim() : undefined;

      if (isEdit) {
        await update({
          sessionToken: token,
          id: meta._id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          valorAlvo: valorCent,
          prazo: prazo || undefined,
          icone,
          cor,
          fotoStorageId,
          fotoUrl: fotoUrlExterna,
          removerFoto: fotoRemovida && !fotoStorageId && !fotoUrlExterna,
        });
      } else {
        await create({
          sessionToken: token,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          valorAlvo: valorCent,
          prazo: prazo || undefined,
          icone,
          cor,
          fotoStorageId,
          fotoUrl: fotoUrlExterna,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEdit ? "Editar Meta" : "Nova Meta"}
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {/* Foto / preview hero */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center"
            style={{
              background: fotoPreview
                ? "transparent"
                : `linear-gradient(135deg, ${cor}25 0%, ${cor}10 100%)`,
            }}
          >
            {fotoPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoPreview}
                  alt="Preview da foto da meta"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removerFoto}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-slate-700"
                  aria-label="Remover foto"
                >
                  <XIcon size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-500">
                <ImageIcon size={28} style={{ color: cor }} />
                <span className="text-xs">Sem foto - usando icone como fallback</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setModoFoto("upload")}
              className={`flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border text-xs font-medium transition-colors ${
                modoFoto === "upload"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <Upload size={14} /> Upload
            </button>
            <button
              type="button"
              onClick={() => setModoFoto("url")}
              className={`flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border text-xs font-medium transition-colors ${
                modoFoto === "url"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <Link2 size={14} /> URL
            </button>
          </div>

          {modoFoto === "upload" ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="w-full"
              >
                <Upload size={14} /> Escolher imagem
              </Button>
            </>
          ) : (
            <Input
              placeholder="https://..."
              value={urlExternaStr}
              onChange={(e) => onUrlExternaChange(e.target.value)}
            />
          )}
        </div>

        <Input
          label="Titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Viagem Italia 2028"
          required
        />
        <Input
          label="Descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="O que voce quer alcancar?"
        />
        <Input
          label="Valor alvo (R$)"
          inputMode="decimal"
          value={valorAlvo}
          onChange={(e) => setValorAlvo(e.target.value)}
          placeholder="0,00"
          required
        />
        <Input
          label="Prazo"
          type="date"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Icone (fallback se nao houver foto)</label>
          <div className="flex flex-wrap gap-2">
            {ICONES.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcone(i)}
                className={`px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  icone === i
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cor</label>
          <div className="flex gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: cor === c ? "#1E293B" : "transparent",
                }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
