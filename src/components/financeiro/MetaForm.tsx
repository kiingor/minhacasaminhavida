"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseBRL } from "@/lib/formatters";

const ICONES = ["Target", "Plane", "Car", "Home", "Heart", "Gift", "GraduationCap", "Laptop"];
const CORES = ["#6366F1","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"];

interface Props { onClose: () => void; }

export function MetaForm({ onClose }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.metas.create);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [icone, setIcone] = useState(ICONES[0]);
  const [cor, setCor] = useState(CORES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCent = parseBRL(valorAlvo);
    if (!titulo.trim() || valorCent <= 0 || !prazo) {
      setError("Preencha título, valor e prazo.");
      return;
    }
    if (!token) { setError("Não autenticado."); return; }
    setLoading(true);
    setError("");
    try {
      await create({ sessionToken: token, titulo, descricao: descricao || undefined, valorAlvo: valorCent, prazo, icone, cor });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Nova Meta">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <Input label="Valor alvo (R$)" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="0,00" required />
        <Input label="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cor</label>
          <div className="flex gap-2">
            {CORES.map((c) => (
              <button key={c} type="button" onClick={() => setCor(c)} className="w-8 h-8 rounded-full border-2" style={{ background: c, borderColor: cor === c ? "#1E293B" : "transparent" }} />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : "Criar"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
