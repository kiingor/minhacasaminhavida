"use client";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import {
  CreditCard,
  Home as HomeIcon,
  Car,
  Banknote,
  Receipt,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL, parseBRL, todayISO } from "@/lib/formatters";

export type TipoDivida = "cartao" | "financiamento" | "emprestimo" | "parcelamento" | "outro";
export type TaxaPeriodicidade = "mensal" | "anual";

interface EditData {
  _id: Id<"dividas">;
  nome: string;
  credor?: string;
  tipo: TipoDivida;
  valorOriginal: number;
  saldoDevedor: number;
  taxaJuros: number;
  taxaPeriodicidade: TaxaPeriodicidade;
  totalParcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  proximoVencimento: string;
  diaVencimento: number;
  cor: string;
  icone?: string;
  observacao?: string;
  ativa: boolean;
}

interface Props {
  onClose: () => void;
  editData?: EditData;
}

const TIPOS: { value: TipoDivida; label: string }[] = [
  { value: "cartao", label: "Cartao" },
  { value: "financiamento", label: "Financiamento" },
  { value: "emprestimo", label: "Emprestimo" },
  { value: "parcelamento", label: "Parcelamento" },
  { value: "outro", label: "Outro" },
];

const ICONES: { name: string; Icon: LucideIcon }[] = [
  { name: "CreditCard", Icon: CreditCard },
  { name: "Home", Icon: HomeIcon },
  { name: "Car", Icon: Car },
  { name: "Banknote", Icon: Banknote },
  { name: "Receipt", Icon: Receipt },
  { name: "TrendingDown", Icon: TrendingDown },
];

export const DIVIDA_ICONE_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICONES.map(({ name, Icon }) => [name, Icon])
);

export function getIconeDivida(name: string | undefined): LucideIcon {
  if (!name) return TrendingDown;
  return DIVIDA_ICONE_MAP[name] ?? TrendingDown;
}

const CORES = [
  "#F43F5E",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#A855F7",
  "#6366F1",
  "#0EA5E9",
  "#64748B",
];

const DEFAULTS_BY_TIPO: Record<TipoDivida, { cor: string; icone: string }> = {
  cartao: { cor: "#F43F5E", icone: "CreditCard" },
  financiamento: { cor: "#A855F7", icone: "Home" },
  emprestimo: { cor: "#F97316", icone: "Banknote" },
  parcelamento: { cor: "#0EA5E9", icone: "Receipt" },
  outro: { cor: "#64748B", icone: "TrendingDown" },
};

export function DividaForm({ onClose, editData }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.dividas.create);
  const update = useMutation(api.financeiro.dividas.update);
  const isEditing = !!editData;

  const [nome, setNome] = useState(editData?.nome ?? "");
  const [credor, setCredor] = useState(editData?.credor ?? "");
  const [tipo, setTipo] = useState<TipoDivida>(editData?.tipo ?? "cartao");
  const [valorOriginal, setValorOriginal] = useState(
    editData ? (editData.valorOriginal / 100).toFixed(2).replace(".", ",") : ""
  );
  const [saldoDevedor, setSaldoDevedor] = useState(
    editData ? (editData.saldoDevedor / 100).toFixed(2).replace(".", ",") : ""
  );
  const [taxaJurosStr, setTaxaJurosStr] = useState(
    editData ? String(editData.taxaJuros).replace(".", ",") : ""
  );
  const [taxaPeriodicidade, setTaxaPeriodicidade] = useState<TaxaPeriodicidade>(
    editData?.taxaPeriodicidade ?? "mensal"
  );
  const [totalParcelas, setTotalParcelas] = useState(
    editData ? String(editData.totalParcelas) : ""
  );
  const [parcelasPagas, setParcelasPagas] = useState(
    editData ? String(editData.parcelasPagas) : "0"
  );
  const [valorParcela, setValorParcela] = useState(
    editData ? (editData.valorParcela / 100).toFixed(2).replace(".", ",") : ""
  );
  const [proximoVencimento, setProximoVencimento] = useState(
    editData?.proximoVencimento ?? todayISO()
  );
  const [diaVencimento, setDiaVencimento] = useState(
    editData ? String(editData.diaVencimento) : "10"
  );
  const [cor, setCor] = useState(editData?.cor ?? DEFAULTS_BY_TIPO.cartao.cor);
  const [icone, setIcone] = useState(editData?.icone ?? DEFAULTS_BY_TIPO.cartao.icone);
  const [observacao, setObservacao] = useState(editData?.observacao ?? "");
  const [ativa, setAtiva] = useState(editData?.ativa ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleTipoChange(novo: TipoDivida) {
    setTipo(novo);
    if (!isEditing) {
      setCor(DEFAULTS_BY_TIPO[novo].cor);
      setIcone(DEFAULTS_BY_TIPO[novo].icone);
    }
  }

  // Sincroniza diaVencimento quando proximoVencimento mudar (so no create)
  function onProximoVencimentoChange(value: string) {
    setProximoVencimento(value);
    if (!isEditing && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const dia = Number(value.slice(8, 10));
      if (dia >= 1 && dia <= 31) setDiaVencimento(String(dia));
    }
  }

  // Calculadora de parcela sugerida quando valorOriginal e totalParcelas estao preenchidos
  // (PRICE simples: valorOriginal / totalParcelas + ajuste pelos juros)
  const parcelaSugerida = useMemo(() => {
    const vCent = parseBRL(valorOriginal);
    const tot = Number(totalParcelas);
    if (vCent <= 0 || !Number.isFinite(tot) || tot <= 0) return 0;
    const taxa = parseFloat((taxaJurosStr || "0").replace(",", ".")) / 100;
    if (!Number.isFinite(taxa) || taxa <= 0) {
      return Math.round(vCent / tot);
    }
    // Converte taxa para mensal se anual
    const taxaMensal =
      taxaPeriodicidade === "mensal" ? taxa : Math.pow(1 + taxa, 1 / 12) - 1;
    if (taxaMensal <= 0) return Math.round(vCent / tot);
    // PMT = PV * i / (1 - (1+i)^-n)
    const pmt = (vCent * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -tot));
    return Math.round(pmt);
  }, [valorOriginal, totalParcelas, taxaJurosStr, taxaPeriodicidade]);

  function aplicarParcelaSugerida() {
    if (parcelaSugerida > 0) {
      setValorParcela((parcelaSugerida / 100).toFixed(2).replace(".", ","));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Informe o nome da divida";
    const valorOriginalCent = parseBRL(valorOriginal);
    if (valorOriginalCent <= 0) errs.valorOriginal = "Informe o valor contratado";
    const saldoDevedorCent = saldoDevedor.trim() ? parseBRL(saldoDevedor) : valorOriginalCent;
    if (saldoDevedorCent < 0) errs.saldoDevedor = "Saldo invalido";
    const valorParcelaCent = parseBRL(valorParcela);
    if (valorParcelaCent < 0) errs.valorParcela = "Valor da parcela invalido";
    const taxaJurosNum = parseFloat((taxaJurosStr || "0").replace(",", "."));
    if (!Number.isFinite(taxaJurosNum) || taxaJurosNum < 0) errs.taxaJuros = "Taxa invalida";
    const totalParcelasNum = Number(totalParcelas);
    if (!Number.isInteger(totalParcelasNum) || totalParcelasNum < 0)
      errs.totalParcelas = "Informe um numero de parcelas valido";
    const parcelasPagasNum = Number(parcelasPagas);
    if (!Number.isInteger(parcelasPagasNum) || parcelasPagasNum < 0)
      errs.parcelasPagas = "Parcelas pagas invalido";
    if (totalParcelasNum > 0 && parcelasPagasNum > totalParcelasNum)
      errs.parcelasPagas = "Maior que total";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(proximoVencimento))
      errs.proximoVencimento = "Data invalida";
    const diaVencNum = Number(diaVencimento);
    if (!Number.isInteger(diaVencNum) || diaVencNum < 1 || diaVencNum > 31)
      errs.diaVencimento = "Dia (1-31)";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    if (!token) {
      setError("Nao autenticado");
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
          credor: credor.trim() || undefined,
          tipo,
          valorOriginal: valorOriginalCent,
          saldoDevedor: saldoDevedorCent,
          taxaJuros: taxaJurosNum,
          taxaPeriodicidade,
          totalParcelas: totalParcelasNum,
          parcelasPagas: parcelasPagasNum,
          valorParcela: valorParcelaCent,
          proximoVencimento,
          diaVencimento: diaVencNum,
          cor,
          icone,
          observacao: observacao.trim() || undefined,
          ativa,
        });
      } else {
        await create({
          sessionToken: token,
          nome: nome.trim(),
          credor: credor.trim() || undefined,
          tipo,
          valorOriginal: valorOriginalCent,
          saldoDevedor: saldoDevedorCent,
          taxaJuros: taxaJurosNum,
          taxaPeriodicidade,
          totalParcelas: totalParcelasNum,
          parcelasPagas: parcelasPagasNum,
          valorParcela: valorParcelaCent,
          proximoVencimento,
          diaVencimento: diaVencNum,
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

  const PreviewIcon = getIconeDivida(icone);

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEditing ? "Editar Divida" : "Nova Divida"}
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Input
            label="Nome da divida"
            placeholder="Ex: Cartao Nubank, Financiamento Casa..."
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

        <Input
          label="Credor (opcional)"
          placeholder="Ex: Itau, Caixa, Magalu..."
          value={credor}
          onChange={(e) => setCredor(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTipoChange(t.value)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  tipo === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Valor original (R$)"
              inputMode="decimal"
              value={valorOriginal}
              onChange={(e) => {
                setValorOriginal(e.target.value);
                setFieldErrors((f) => ({ ...f, valorOriginal: "" }));
              }}
              placeholder="0,00"
            />
            {fieldErrors.valorOriginal && (
              <p className="text-xs text-danger mt-1">{fieldErrors.valorOriginal}</p>
            )}
          </div>
          <div>
            <Input
              label="Saldo devedor atual (R$)"
              inputMode="decimal"
              value={saldoDevedor}
              onChange={(e) => {
                setSaldoDevedor(e.target.value);
                setFieldErrors((f) => ({ ...f, saldoDevedor: "" }));
              }}
              placeholder="Mesmo do valor original"
            />
            {fieldErrors.saldoDevedor && (
              <p className="text-xs text-danger mt-1">{fieldErrors.saldoDevedor}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          Saldo devedor pode ser menor que o valor original se voce ja pagou parte.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Taxa de juros (%)"
              inputMode="decimal"
              value={taxaJurosStr}
              onChange={(e) => {
                setTaxaJurosStr(e.target.value);
                setFieldErrors((f) => ({ ...f, taxaJuros: "" }));
              }}
              placeholder="Ex: 1,5"
            />
            {fieldErrors.taxaJuros && (
              <p className="text-xs text-danger mt-1">{fieldErrors.taxaJuros}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Periodicidade</label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {(["mensal", "anual"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTaxaPeriodicidade(p)}
                  className={`h-10 rounded-lg border text-xs font-medium transition-colors ${
                    taxaPeriodicidade === p
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {p === "mensal" ? "ao mes" : "ao ano"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Total de parcelas"
              inputMode="numeric"
              value={totalParcelas}
              onChange={(e) => {
                setTotalParcelas(e.target.value.replace(/\D/g, ""));
                setFieldErrors((f) => ({ ...f, totalParcelas: "" }));
              }}
              placeholder="Ex: 360 ou 0"
            />
            {fieldErrors.totalParcelas && (
              <p className="text-xs text-danger mt-1">{fieldErrors.totalParcelas}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">0 para cartao rotativo</p>
          </div>
          <div>
            <Input
              label="Parcelas pagas"
              inputMode="numeric"
              value={parcelasPagas}
              onChange={(e) => {
                setParcelasPagas(e.target.value.replace(/\D/g, ""));
                setFieldErrors((f) => ({ ...f, parcelasPagas: "" }));
              }}
              placeholder="0"
            />
            {fieldErrors.parcelasPagas && (
              <p className="text-xs text-danger mt-1">{fieldErrors.parcelasPagas}</p>
            )}
          </div>
        </div>

        <div>
          <Input
            label="Valor da parcela (R$)"
            inputMode="decimal"
            value={valorParcela}
            onChange={(e) => {
              setValorParcela(e.target.value);
              setFieldErrors((f) => ({ ...f, valorParcela: "" }));
            }}
            placeholder="0,00"
          />
          {fieldErrors.valorParcela && (
            <p className="text-xs text-danger mt-1">{fieldErrors.valorParcela}</p>
          )}
          {parcelaSugerida > 0 && parseBRL(valorParcela) !== parcelaSugerida && (
            <button
              type="button"
              onClick={aplicarParcelaSugerida}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Calcular parcela: {formatBRL(parcelaSugerida)} (PRICE)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Proximo vencimento"
              type="date"
              value={proximoVencimento}
              onChange={(e) => {
                onProximoVencimentoChange(e.target.value);
                setFieldErrors((f) => ({ ...f, proximoVencimento: "" }));
              }}
            />
            {fieldErrors.proximoVencimento && (
              <p className="text-xs text-danger mt-1">{fieldErrors.proximoVencimento}</p>
            )}
          </div>
          <div>
            <Input
              label="Dia do vencimento"
              inputMode="numeric"
              value={diaVencimento}
              onChange={(e) => {
                setDiaVencimento(e.target.value.replace(/\D/g, ""));
                setFieldErrors((f) => ({ ...f, diaVencimento: "" }));
              }}
              placeholder="1-31"
              maxLength={2}
            />
            {fieldErrors.diaVencimento && (
              <p className="text-xs text-danger mt-1">{fieldErrors.diaVencimento}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Icone</label>
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

        <Input
          label="Observacao (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Notas internas..."
        />

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
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" style={{ color: cor }}>
              {nome || "Nome da divida"}
            </div>
            <div className="text-xs text-slate-500">
              {TIPOS.find((t) => t.value === tipo)?.label}
              {credor ? ` · ${credor}` : ""}
            </div>
          </div>
          {parseBRL(saldoDevedor || valorOriginal) > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-400">Saldo</div>
              <div className="font-mono font-bold text-sm" style={{ color: cor }}>
                {formatBRL(parseBRL(saldoDevedor || valorOriginal))}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
            <div>
              <div className="text-sm font-medium text-slate-700">Divida ativa</div>
              <div className="text-xs text-slate-500">
                Inativas nao entram nos totalizadores nem na curva de quitacao.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAtiva((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                ativa ? "bg-primary" : "bg-slate-200"
              }`}
              aria-label={ativa ? "Desativar divida" : "Ativar divida"}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  ativa ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        )}

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
