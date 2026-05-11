"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseBRL, formatBRL } from "@/lib/formatters";
import { Plus, X, Trash2 } from "lucide-react";
import { CategoriaSelect } from "./CategoriaSelect";

type Periodicidade = "mensal" | "anual" | "sazonal";

interface Override {
  mes: string;
  valor?: number;
  descricao?: string;
  dataVencimento?: string;
}

interface EditData {
  _id: Id<"despesas">;
  descricao: string;
  valor: number;
  tipo: "fixa" | "parcelada" | "avulsa";
  categoriaId: Id<"categorias">;
  pessoaId?: Id<"pessoas">;
  contaId?: Id<"contas">;
  dataVencimento: string;
  totalParcelas?: number;
  parcelaAtual?: number;
  cartao?: string;
  recorrente?: boolean;
  periodicidade?: Periodicidade;
  mesesSazonais?: number[];
  overrides?: Override[];
  observacao?: string;
}

interface Props {
  onClose: () => void;
  editData?: EditData;
}

const NOMES_MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function DespesaForm({ onClose, editData }: Props) {
  const token = useSessionToken();
  const create = useMutation(api.financeiro.despesas.create);
  const update = useMutation(api.financeiro.despesas.update);
  const removerOverride = useMutation(api.financeiro.despesas.removerOverride);
  const criarCategoria = useMutation(api.financeiro.categorias.create);
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "despesa" } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const cartoes = useQuery(api.financeiro.cartoes.list, token ? { sessionToken: token } : "skip");
  const contas = useQuery(api.financeiro.contas.list, token ? { sessionToken: token } : "skip");
  // Em edicao: busca a versao bruta do banco (sem overrides aplicados)
  // pra evitar que o usuario edite um valor projetado pensando ser o valor base.
  const despesaRaw = useQuery(
    api.financeiro.despesas.getById,
    editData && token ? { sessionToken: token, id: editData._id } : "skip"
  );

  const isEditing = !!editData;

  // Inicializa com editData (que pode ter overrides aplicados pela projecao);
  // o useEffect abaixo sobrescreve com o documento bruto assim que carrega.
  const [descricao, setDescricao] = useState(editData?.descricao ?? "");
  const [valor, setValor] = useState(editData ? (editData.valor / 100).toFixed(2).replace(".", ",") : "");
  const [tipo, setTipo] = useState<"fixa" | "parcelada" | "avulsa">(editData?.tipo ?? "avulsa");
  const [categoriaId, setCategoriaId] = useState<Id<"categorias"> | "">(editData?.categoriaId ?? "");
  const [pessoaId, setPessoaId] = useState<Id<"pessoas"> | "">(editData?.pessoaId ?? "");
  const [dataVencimento, setDataVencimento] = useState(editData?.dataVencimento ?? new Date().toISOString().slice(0, 10));
  const [totalParcelas, setTotalParcelas] = useState(editData?.totalParcelas?.toString() ?? "2");
  const [cartao, setCartao] = useState(editData?.cartao ?? "");
  const [contaId, setContaId] = useState<Id<"contas"> | "">(editData?.contaId ?? "");
  const [observacao, setObservacao] = useState(editData?.observacao ?? "");

  // Recorrência
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(editData?.periodicidade ?? "mensal");
  const [mesesSazonais, setMesesSazonais] = useState<number[]>(editData?.mesesSazonais ?? []);

  // Overrides existentes (somente para visualizacao/remocao)
  const [overrides, setOverrides] = useState<Override[]>(editData?.overrides ?? []);
  const [showOverrides, setShowOverrides] = useState(false);

  // Quando o documento bruto carrega depois do mount, sincroniza os campos
  // (apenas a primeira vez que `despesaRaw` muda de undefined para definido).
  const [hidratado, setHidratado] = useState<boolean>(!isEditing);
  useEffect(() => {
    if (!isEditing || hidratado || !despesaRaw) return;
    setDescricao(despesaRaw.descricao);
    setValor((despesaRaw.valor / 100).toFixed(2).replace(".", ","));
    setTipo(despesaRaw.tipo);
    setCategoriaId(despesaRaw.categoriaId);
    setPessoaId(despesaRaw.pessoaId ?? "");
    setDataVencimento(despesaRaw.dataVencimento);
    setTotalParcelas(despesaRaw.totalParcelas?.toString() ?? "2");
    setCartao(despesaRaw.cartao ?? "");
    setContaId(despesaRaw.contaId ?? "");
    setObservacao(despesaRaw.observacao ?? "");
    setPeriodicidade((despesaRaw.periodicidade as Periodicidade) ?? "mensal");
    setMesesSazonais(despesaRaw.mesesSazonais ?? []);
    setOverrides((despesaRaw.overrides ?? []) as Override[]);
    setHidratado(true);
  }, [despesaRaw, hidratado, isEditing]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Nova categoria inline
  const [showNovaCategoria, setShowNovaCategoria] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");
  const [novaCatCor, setNovaCatCor] = useState("#EF4444");
  const [savingCat, setSavingCat] = useState(false);

  async function handleCriarCategoria() {
    if (!token || !novaCatNome.trim()) return;
    setSavingCat(true);
    try {
      const id = await criarCategoria({ sessionToken: token, nome: novaCatNome.trim(), tipo: "despesa", icone: "Package", cor: novaCatCor });
      setCategoriaId(id);
      setNovaCatNome("");
      setShowNovaCategoria(false);
    } finally {
      setSavingCat(false);
    }
  }

  function toggleMesSazonal(mes: number) {
    setMesesSazonais((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes].sort((a, b) => a - b)
    );
  }

  async function handleRemoverOverride(mes: string) {
    if (!token || !editData) return;
    try {
      await removerOverride({ sessionToken: token, id: editData._id, mes });
      setOverrides((prev) => prev.filter((o) => o.mes !== mes));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao remover override");
    }
  }

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCent = parseBRL(valor);
    const errors: Record<string, string> = {};
    if (!descricao.trim()) errors.descricao = "Informe a descrição";
    if (valorCent <= 0) errors.valor = "Informe um valor maior que zero";
    if (!categoriaId) errors.categoria = "Selecione uma categoria";
    if (tipo === "fixa" && periodicidade === "sazonal" && mesesSazonais.length === 0) {
      errors.mesesSazonais = "Selecione ao menos um mês";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("");
      return;
    }
    setFieldErrors({});
    if (!token) { setError("Não autenticado."); return; }
    setLoading(true);
    setError("");
    try {
      const payloadComum = {
        descricao,
        valor: valorCent,
        tipo,
        categoriaId: categoriaId as Id<"categorias">,
        pessoaId: pessoaId ? (pessoaId as Id<"pessoas">) : undefined,
        contaId: contaId ? (contaId as Id<"contas">) : undefined,
        dataVencimento,
        totalParcelas: tipo === "parcelada" ? parseInt(totalParcelas) || 2 : undefined,
        cartao: cartao || undefined,
        recorrente: tipo === "fixa",
        periodicidade: tipo === "fixa" ? periodicidade : undefined,
        mesesSazonais:
          tipo === "fixa" && periodicidade === "sazonal" ? mesesSazonais : undefined,
        observacao: observacao || undefined,
      };
      if (isEditing) {
        await update({
          sessionToken: token,
          id: editData._id,
          ...payloadComum,
          parcelaAtual: tipo === "parcelada" ? (editData.parcelaAtual ?? 1) : undefined,
        });
      } else {
        await create({
          sessionToken: token,
          ...payloadComum,
          parcelaAtual: tipo === "parcelada" ? 1 : undefined,
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
    <Dialog open onClose={onClose} title={isEditing ? "Editar Despesa" : "Nova Despesa"} className="max-h-[90vh] overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Input label="Descrição" value={descricao} onChange={(e) => { setDescricao(e.target.value); setFieldErrors((f) => ({ ...f, descricao: "" })); }} required />
          {fieldErrors.descricao && <p className="text-xs text-danger mt-1">{fieldErrors.descricao}</p>}
        </div>
        <div>
          <Input label="Valor (R$)" value={valor} onChange={(e) => { setValor(e.target.value); setFieldErrors((f) => ({ ...f, valor: "" })); }} placeholder="0,00" inputMode="decimal" required />
          {fieldErrors.valor && <p className="text-xs text-danger mt-1">{fieldErrors.valor}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="flex gap-2">
            {(["avulsa", "fixa", "parcelada"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${tipo === t ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tipo === "parcelada" && (
          <Input label="Total de parcelas" type="number" min={2} value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} />
        )}

        {tipo === "fixa" && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Recorrência</label>
              <div className="flex gap-2">
                {(["mensal", "anual", "sazonal"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodicidade(p)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${periodicidade === p ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 bg-white"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {periodicidade === "mensal" && "Aparece todo mês a partir da data."}
                {periodicidade === "anual" && "Aparece apenas no mês original todo ano (ex: IPVA em janeiro)."}
                {periodicidade === "sazonal" && "Aparece apenas nos meses selecionados."}
              </p>
            </div>

            {periodicidade === "sazonal" && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Meses</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {NOMES_MESES.map((nome, idx) => {
                    const mes = idx + 1;
                    const ativo = mesesSazonais.includes(mes);
                    return (
                      <button
                        key={mes}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => toggleMesSazonal(mes)}
                        className={`py-1.5 rounded-md border text-xs font-medium transition-colors ${ativo ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600"}`}
                      >
                        {nome}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.mesesSazonais && <p className="text-xs text-danger mt-0.5">{fieldErrors.mesesSazonais}</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Categoria</label>
            <button type="button" onClick={() => setShowNovaCategoria((v) => !v)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus size={11} /> Nova categoria
            </button>
          </div>
          <CategoriaSelect
            categorias={categorias}
            value={categoriaId}
            onChange={(v) => { setCategoriaId(v); setFieldErrors((f) => ({ ...f, categoria: "" })); }}
            required
          />
          {fieldErrors.categoria && <p className="text-xs text-danger mt-1">{fieldErrors.categoria}</p>}
          {showNovaCategoria && (
            <div className="flex gap-2 items-center p-2.5 rounded-lg bg-slate-50 border">
              <input type="color" value={novaCatCor} onChange={(e) => setNovaCatCor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" />
              <input
                type="text"
                placeholder="Nome da categoria"
                value={novaCatNome}
                onChange={(e) => setNovaCatNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCriarCategoria())}
                className="flex-1 px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button type="button" onClick={handleCriarCategoria} disabled={!novaCatNome.trim() || savingCat} className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50">
                {savingCat ? "..." : "Criar"}
              </button>
              <button type="button" onClick={() => setShowNovaCategoria(false)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Pessoa (opcional)</label>
          <select
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value as Id<"pessoas">)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">—</option>
            {pessoas?.map((p) => (
              <option key={p._id} value={p._id}>{p.apelido ?? p.nome}</option>
            ))}
          </select>
        </div>

        <Input label="Vencimento" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Conta (opcional)</label>
          <select
            value={contaId}
            onChange={(e) => {
              const v = e.target.value as Id<"contas"> | "";
              setContaId(v);
              if (v) setCartao("");
            }}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">Nenhuma</option>
            {contas
              ?.filter((c) => c.ativa || c._id === contaId)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nome}
                  {c.banco ? ` · ${c.banco}` : ""}
                </option>
              ))}
          </select>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione para que esta despesa debite o saldo da conta.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cartão (opcional)</label>
          <select
            value={cartao}
            onChange={(e) => {
              const v = e.target.value;
              setCartao(v);
              if (v) setContaId("");
            }}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">Nenhum</option>
            {cartoes?.map((c) => <option key={c._id} value={c.nome}>{c.nome}{c.bandeira ? ` · ${c.bandeira}` : ""}</option>)}
          </select>
          {cartao && (
            <p className="text-xs text-amber-600 mt-0.5">
              Despesas no cartão não debitam saldo de conta (entram na fatura).
            </p>
          )}
        </div>

        <Input label="Observação" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        {/* Overrides do mes (somente em edicao e quando ha overrides) */}
        {isEditing && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowOverrides((v) => !v)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              <span>
                Edições por mês
                {overrides.length > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {overrides.length}
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400">{showOverrides ? "Recolher" : "Mostrar"}</span>
            </button>
            {showOverrides && (
              <div className="px-3 pb-3 space-y-2">
                {overrides.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhuma edição específica de mês. Para alterar valor de um mês sem afetar os demais, edite o lançamento na lista mensal.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {[...overrides].sort((a, b) => a.mes.localeCompare(b.mes)).map((o) => (
                      <li key={o.mes} className="py-2 flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {o.mes}
                        </span>
                        <span className="flex-1 text-slate-600 truncate">
                          {o.descricao && <span className="font-medium">{o.descricao} · </span>}
                          {typeof o.valor === "number" ? formatBRL(o.valor) : null}
                          {o.dataVencimento ? ` · venc. ${o.dataVencimento}` : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoverOverride(o.mes)}
                          className="p-1 rounded text-slate-400 hover:text-danger hover:bg-danger/10"
                          aria-label={`Remover edição do mês ${o.mes}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
