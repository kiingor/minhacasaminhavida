"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { User, Building2, Briefcase, Store, Landmark, Coins, HandCoins, Wallet, CircleDollarSign, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CORES = ["#6366F1", "#F97316", "#06B6D4", "#EF4444", "#EC4899", "#8B5CF6", "#10B981", "#F59E0B", "#64748B", "#14B8A6", "#84CC16", "#3B82F6"];

const ICONES: { nome: string; Icon: typeof User }[] = [
  { nome: "User", Icon: User },
  { nome: "Users", Icon: Users },
  { nome: "Building2", Icon: Building2 },
  { nome: "Briefcase", Icon: Briefcase },
  { nome: "Store", Icon: Store },
  { nome: "Landmark", Icon: Landmark },
  { nome: "Coins", Icon: Coins },
  { nome: "HandCoins", Icon: HandCoins },
  { nome: "Wallet", Icon: Wallet },
  { nome: "CircleDollarSign", Icon: CircleDollarSign },
];

type Tipo = "pessoa_fisica" | "pessoa_juridica" | "outro";

interface EditData {
  _id: Id<"pagadores">;
  nome: string;
  apelido?: string;
  tipo: Tipo;
  documento?: string;
  cor: string;
  icone?: string;
  observacao?: string;
}

interface Props {
  onClose: () => void;
  editData?: EditData;
}

export function PagadorForm({ onClose, editData }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.pagadores.create);
  const update = useMutation(api.financeiro.pagadores.update);
  const isEditing = !!editData;

  const [nome, setNome] = useState(editData?.nome ?? "");
  const [apelido, setApelido] = useState(editData?.apelido ?? "");
  const [tipo, setTipo] = useState<Tipo>(editData?.tipo ?? "pessoa_juridica");
  const [documento, setDocumento] = useState(editData?.documento ?? "");
  const [cor, setCor] = useState(editData?.cor ?? CORES[0]);
  const [icone, setIcone] = useState(editData?.icone ?? "Building2");
  const [observacao, setObservacao] = useState(editData?.observacao ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Informe o nome");
      return;
    }
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      if (isEditing) {
        await update({
          sessionToken: token,
          id: editData._id,
          nome: nome.trim(),
          apelido: apelido.trim() || undefined,
          tipo,
          documento: documento.trim() || undefined,
          cor,
          icone,
          observacao: observacao.trim() || undefined,
        });
      } else {
        await create({
          sessionToken: token,
          nome: nome.trim(),
          apelido: apelido.trim() || undefined,
          tipo,
          documento: documento.trim() || undefined,
          cor,
          icone,
          observacao: observacao.trim() || undefined,
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
    <Dialog open onClose={onClose} title={isEditing ? "Editar pagador" : "Novo pagador"} className="max-h-[90vh] overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus placeholder="Ex: Empresa X, João Silva" />
        <Input label="Apelido (opcional)" value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Como chamamos no app" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="flex gap-2">
            {([
              { value: "pessoa_fisica", label: "Pessoa Física" },
              { value: "pessoa_juridica", label: "Empresa" },
              { value: "outro", label: "Outro" },
            ] as const).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium ${tipo === t.value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={tipo === "pessoa_fisica" ? "CPF (opcional)" : tipo === "pessoa_juridica" ? "CNPJ (opcional)" : "Documento (opcional)"}
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cor</label>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setCor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${cor === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Ícone</label>
          <div className="grid grid-cols-5 gap-2">
            {ICONES.map(({ nome: n, Icon }) => (
              <button
                key={n}
                type="button"
                aria-label={n}
                onClick={() => setIcone(n)}
                className={`h-10 rounded-lg border flex items-center justify-center transition-colors ${icone === n ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        <Input label="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function iconeDoPagador(nome?: string) {
  const found = ICONES.find((i) => i.nome === nome);
  return found?.Icon ?? User;
}
