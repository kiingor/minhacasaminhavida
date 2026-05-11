"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import {
  Wallet,
  PiggyBank,
  Banknote,
  CreditCard,
  Building2,
  TrendingUp,
  DollarSign,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseBRL } from "@/lib/formatters";

export type TipoConta = "corrente" | "poupanca" | "dinheiro" | "aplicacao";

interface EditData {
  _id: Id<"contas">;
  nome: string;
  tipo: TipoConta;
  banco?: string;
  saldoInicial: number;
  saldoManual?: number;
  cor: string;
  icone: string;
  ativa: boolean;
}

interface Props {
  onClose: () => void;
  editData?: EditData;
}

const TIPOS: { value: TipoConta; label: string }[] = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "aplicacao", label: "Aplicação" },
];

const ICONES: { name: string; Icon: LucideIcon }[] = [
  { name: "Wallet", Icon: Wallet },
  { name: "PiggyBank", Icon: PiggyBank },
  { name: "Banknote", Icon: Banknote },
  { name: "CreditCard", Icon: CreditCard },
  { name: "Building2", Icon: Building2 },
  { name: "TrendingUp", Icon: TrendingUp },
  { name: "DollarSign", Icon: DollarSign },
  { name: "Landmark", Icon: Landmark },
];

export const ICONE_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICONES.map(({ name, Icon }) => [name, Icon])
);

export function getIconeConta(name: string | undefined): LucideIcon {
  if (!name) return Wallet;
  return ICONE_MAP[name] ?? Wallet;
}

const CORES = [
  "#6366F1",
  "#EF4444",
  "#F97316",
  "#10B981",
  "#06B6D4",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#64748B",
  "#1E1B4B",
];

const DEFAULTS_BY_TIPO: Record<TipoConta, { cor: string; icone: string }> = {
  corrente: { cor: "#6366F1", icone: "Wallet" },
  poupanca: { cor: "#10B981", icone: "PiggyBank" },
  dinheiro: { cor: "#F59E0B", icone: "Banknote" },
  aplicacao: { cor: "#8B5CF6", icone: "TrendingUp" },
};

export function ContaForm({ onClose, editData }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.contas.create);
  const update = useMutation(api.financeiro.contas.update);

  const isEditing = !!editData;

  const [nome, setNome] = useState(editData?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConta>(editData?.tipo ?? "corrente");
  const [banco, setBanco] = useState(editData?.banco ?? "");
  const [saldoInicial, setSaldoInicial] = useState(
    editData ? (editData.saldoInicial / 100).toFixed(2).replace(".", ",") : "0,00"
  );
  const [saldoManualStr, setSaldoManualStr] = useState(
    editData?.saldoManual !== undefined
      ? (editData.saldoManual / 100).toFixed(2).replace(".", ",")
      : ""
  );
  const [usarSaldoManual, setUsarSaldoManual] = useState(
    editData?.saldoManual !== undefined
  );
  const [cor, setCor] = useState(editData?.cor ?? DEFAULTS_BY_TIPO.corrente.cor);
  const [icone, setIcone] = useState(editData?.icone ?? DEFAULTS_BY_TIPO.corrente.icone);
  const [ativa, setAtiva] = useState(editData?.ativa ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleTipoChange(novo: TipoConta) {
    if (
      isEditing &&
      tipo === "aplicacao" &&
      novo !== "aplicacao" &&
      editData?.saldoManual !== undefined
    ) {
      const ok = window.confirm(
        "Trocar o tipo desta conta vai apagar o saldo manual informado. O saldo passará a ser calculado pelas movimentações. Deseja continuar?"
      );
      if (!ok) return;
    }
    setTipo(novo);
    // Aplica defaults só se for criação ou se ainda estiver no default do tipo anterior
    if (!isEditing) {
      setCor(DEFAULTS_BY_TIPO[novo].cor);
      setIcone(DEFAULTS_BY_TIPO[novo].icone);
    }
    if (novo !== "aplicacao") {
      setUsarSaldoManual(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!nome.trim()) errors.nome = "Informe o nome da conta";
    const saldoIniCent = parseBRL(saldoInicial);
    let saldoManCent: number | undefined = undefined;
    if (tipo === "aplicacao" && usarSaldoManual) {
      if (!saldoManualStr.trim()) {
        errors.saldoManual = "Informe o saldo manual";
      } else {
        saldoManCent = parseBRL(saldoManualStr);
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!token) {
      setError("Não autenticado");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isEditing) {
        await update({
          sessionToken: token,
          id: editData._id,
          nome: nome.trim(),
          tipo,
          banco: banco.trim() || undefined,
          saldoInicial: saldoIniCent,
          saldoManual: saldoManCent,
          cor,
          icone,
          ativa,
        });
      } else {
        await create({
          sessionToken: token,
          nome: nome.trim(),
          tipo,
          banco: banco.trim() || undefined,
          saldoInicial: saldoIniCent,
          saldoManual: saldoManCent,
          cor,
          icone,
          ativa,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  const PreviewIcon = getIconeConta(icone);

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEditing ? "Editar Conta" : "Nova Conta"}
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Input
            label="Nome da conta"
            placeholder="Ex: Nubank, Poupança, Carteira..."
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setFieldErrors((f) => ({ ...f, nome: "" }));
            }}
            required
            autoFocus
          />
          {fieldErrors.nome && <p className="text-xs text-danger mt-1">{fieldErrors.nome}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTipoChange(t.value)}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                  tipo === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Banco (opcional)"
          placeholder="Ex: Itaú, Bradesco, Inter..."
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
        />

        <Input
          label="Saldo inicial (R$)"
          inputMode="decimal"
          value={saldoInicial}
          onChange={(e) => setSaldoInicial(e.target.value)}
          placeholder="0,00"
        />
        <p className="text-xs text-slate-500 -mt-2">
          Saldo na data em que você começou a usar o app.
        </p>

        {tipo === "aplicacao" && (
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-violet-900">
              <input
                type="checkbox"
                checked={usarSaldoManual}
                onChange={(e) => setUsarSaldoManual(e.target.checked)}
                className="w-4 h-4 rounded border-violet-300 text-violet-600"
              />
              Usar saldo manual (rendimentos)
            </label>
            {usarSaldoManual && (
              <>
                <Input
                  label="Saldo atual (R$)"
                  inputMode="decimal"
                  value={saldoManualStr}
                  onChange={(e) => {
                    setSaldoManualStr(e.target.value);
                    setFieldErrors((f) => ({ ...f, saldoManual: "" }));
                  }}
                  placeholder="0,00"
                />
                {fieldErrors.saldoManual && (
                  <p className="text-xs text-danger">{fieldErrors.saldoManual}</p>
                )}
                <p className="text-xs text-violet-700">
                  Atualize manualmente quando consultar o rendimento.
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {ICONES.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcone(name)}
                className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
                  icone === name
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                aria-label={name}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cor</label>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  cor === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"
                }`}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: `${cor}15`, border: `1px solid ${cor}30` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${cor}25`, color: cor }}
          >
            <PreviewIcon size={20} />
          </div>
          <div>
            <div className="font-medium" style={{ color: cor }}>
              {nome || "Nome da conta"}
            </div>
            <div className="text-xs text-slate-500">
              {TIPOS.find((t) => t.value === tipo)?.label}
              {banco ? ` · ${banco}` : ""}
            </div>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
          <div>
            <div className="text-sm font-medium text-slate-700">Conta ativa</div>
            <div className="text-xs text-slate-500">Contas inativas não aparecem em totalizadores.</div>
          </div>
          <button
            type="button"
            onClick={() => setAtiva((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              ativa ? "bg-primary" : "bg-slate-200"
            }`}
            aria-label={ativa ? "Desativar conta" : "Ativar conta"}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                ativa ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
