"use client";
import { useState, useRef, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Trash2, ChevronLeft, Sparkles,
  Plus, Check, AlertCircle, Loader2, X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/formatters";
import { todayISO } from "@/lib/formatters";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ItemIA {
  id: string;
  descricao: string;
  valor: number;
  categoria_sugerida: string;
  categoriaId: Id<"categorias"> | "";
  pessoaId: Id<"pessoas"> | "ambos" | "";
  parcela_atual: number | null;
  total_parcelas: number | null;
  ativo: boolean;
}

const CORES_CATEGORIA: Record<string, string> = {
  Alimentação: "#F97316", Transporte: "#06B6D4", Saúde: "#EF4444",
  Lazer: "#EC4899", Educação: "#8B5CF6", Moradia: "#6366F1",
  Mercado: "#10B981", Outros: "#64748B",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FaturaIAPage() {
  const token = useSessionToken();
  const router = useRouter();

  const analisar = useAction(api.financeiro.analisarFatura.analisar);
  const criarDespesa = useMutation(api.financeiro.despesas.create);
  const criarCategoria = useMutation(api.financeiro.categorias.create);
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token, tipo: "despesa" } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const cartoes = useQuery(api.financeiro.cartoes.list, token ? { sessionToken: token } : "skip");

  // ─── Estado ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ItemIA[]>([]);
  const [data, setData] = useState(todayISO());
  const [cartao, setCartao] = useState("");
  const [dragging, setDragging] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");

  // Nova categoria inline
  const [showNovaCategoria, setShowNovaCategoria] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");
  const [novaCatCor, setNovaCatCor] = useState("#64748B");
  const [savingCat, setSavingCat] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Upload e análise ──────────────────────────────────────────────────────
  async function processFile(file: File) {
    if (!file || file.type !== "application/pdf") {
      setError("Selecione um arquivo PDF válido.");
      return;
    }
    if (!token) return;

    setLoading(true);
    setError("");
    setNomeArquivo(file.name);

    try {
      // Converter para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Remove o prefixo data:application/pdf;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resultado = await analisar({ sessionToken: token, pdfBase64: base64 });

      // Mapear resultados tentando casar com categorias existentes
      const mapped: ItemIA[] = resultado.map((it, i) => {
        const catMatch = categorias?.find(
          (c) => c.nome.toLowerCase() === it.categoria_sugerida.toLowerCase()
        );
        return {
          id: `${i}-${Date.now()}`,
          descricao: it.descricao,
          valor: it.valor,
          categoria_sugerida: it.categoria_sugerida,
          categoriaId: catMatch?._id ?? "",
          pessoaId: "" as Id<"pessoas"> | "ambos" | "",
          parcela_atual: it.parcela_atual ?? null,
          total_parcelas: it.total_parcelas ?? null,
          ativo: true,
        };
      });

      setItems(mapped);
      setStep("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao analisar PDF.");
    } finally {
      setLoading(false);
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [token, categorias]); // eslint-disable-line

  // ─── Edição de itens ───────────────────────────────────────────────────────
  function setItemDescricao(id: string, descricao: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, descricao } : it));
  }

  function setItemCategoria(id: string, categoriaId: Id<"categorias"> | "") {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, categoriaId } : it));
  }

  function setItemPessoa(id: string, pessoaId: Id<"pessoas"> | "ambos" | "") {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, pessoaId } : it));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ativo: false } : it));
  }

  function restoreItem(id: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ativo: true } : it));
  }

  // ─── Criar categoria ───────────────────────────────────────────────────────
  async function handleCriarCategoria() {
    if (!token || !novaCatNome.trim()) return;
    setSavingCat(true);
    try {
      await criarCategoria({ sessionToken: token, nome: novaCatNome.trim(), tipo: "despesa", icone: "Package", cor: novaCatCor });
      setNovaCatNome("");
      setShowNovaCategoria(false);
    } finally {
      setSavingCat(false);
    }
  }

  // ─── Salvar todos ──────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!token) return;
    const ativos = items.filter((it) => it.ativo);
    const semCategoria = ativos.filter((it) => !it.categoriaId).length;
    const semPessoa = ativos.filter((it) => !it.pessoaId).length;
    if (semCategoria > 0 || semPessoa > 0) {
      setError(
        [
          semCategoria > 0 && `${semCategoria} sem categoria`,
          semPessoa > 0 && `${semPessoa} sem pessoa`,
        ].filter(Boolean).join(" · ") + ". Preencha todos antes de salvar."
      );
      return;
    }

    const todasPessoas = (pessoas ?? []).filter((p) => p.ativo);

    setSaving(true);
    setError("");
    try {
      for (const it of ativos) {
        const pessoasAlvo = it.pessoaId === "ambos"
          ? todasPessoas.map((p) => p._id)
          : [it.pessoaId as Id<"pessoas">];

        const isParcelada = !!(it.parcela_atual && it.total_parcelas);
        for (const pid of pessoasAlvo) {
          await criarDespesa({
            sessionToken: token,
            descricao: it.descricao,
            valor: it.valor,
            tipo: isParcelada ? "parcelada" : "avulsa",
            categoriaId: it.categoriaId as Id<"categorias">,
            pessoaId: pid,
            dataVencimento: data,
            parcelaAtual: isParcelada ? it.parcela_atual! : undefined,
            totalParcelas: isParcelada ? it.total_parcelas! : undefined,
            cartao: cartao || undefined,
            recorrente: false,
          });
        }
      }
      router.push("/financeiro/despesas");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  const ativos = items.filter((it) => it.ativo);
  const removidos = items.filter((it) => !it.ativo);
  const totalValor = ativos.reduce((s, it) => s + it.valor, 0);
  const semCategoria = ativos.filter((it) => !it.categoriaId).length;
  const semPessoa = ativos.filter((it) => !it.pessoaId).length;

  // ─── Render: Upload ────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <Link href="/financeiro/despesas" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Despesas
          </Link>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Sparkles size={28} className="text-primary" /> Lançamento com IA
          </h1>
          <p className="text-slate-500">Envie o PDF da fatura e a IA extrai tudo automaticamente</p>
        </div>

        <motion.div
          className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary hover:bg-slate-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          animate={dragging ? { scale: 1.02 } : { scale: 1 }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="text-primary animate-spin" />
              <div className="font-medium text-slate-700">Analisando fatura com IA...</div>
              <div className="text-sm text-slate-400">{nomeArquivo}</div>
              <div className="text-xs text-slate-400">Isso pode levar alguns segundos</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload size={32} className="text-primary" />
              </div>
              <div>
                <div className="font-display font-bold text-lg">Arraste o PDF aqui</div>
                <div className="text-sm text-slate-400">ou clique para selecionar</div>
              </div>
              <div className="text-xs text-slate-300">Apenas arquivos .pdf</div>
            </div>
          )}
        </motion.div>

        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileInput} />

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl p-3">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-xl bg-slate-50 border p-4 text-sm text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">Como funciona:</div>
          <div>1. Faça download do PDF da sua fatura no app do banco/cartão</div>
          <div>2. Envie aqui — a IA extrai todos os lançamentos</div>
          <div>3. Revise, categorize e salve com um clique</div>
        </div>
      </div>
    );
  }

  // ─── Render: Review ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => setStep("upload")} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Trocar arquivo
          </button>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
            <Sparkles size={22} className="text-primary" /> Revisar Lançamentos
          </h1>
          <p className="text-slate-500 text-sm">{nomeArquivo}</p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-xl text-danger">{formatBRL(totalValor)}</div>
          <div className="text-xs text-slate-400">{ativos.length} lançamento{ativos.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Data e cartão global */}
      <div className="rounded-2xl bg-white border p-4 shadow-sm grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Data dos lançamentos</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cartão da fatura</label>
          <select value={cartao} onChange={(e) => setCartao(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm">
            <option value="">Nenhum</option>
            {cartoes?.map((c) => <option key={c._id} value={c.nome}>{c.nome}{c.bandeira ? ` · ${c.bandeira}` : ""}</option>)}
          </select>
        </div>
      </div>

      {/* Nova categoria */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 flex gap-2 flex-wrap">
          {semCategoria > 0 && <span className="text-warning font-medium">{semCategoria} sem categoria</span>}
          {semPessoa > 0 && <span className="text-warning font-medium">{semPessoa} sem pessoa</span>}
          {semCategoria === 0 && semPessoa === 0 && <span>Tudo preenchido ✓</span>}
        </div>
        <button
          onClick={() => setShowNovaCategoria(true)}
          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
        >
          <Plus size={13} /> Nova categoria
        </button>
      </div>

      {/* Lista de itens */}
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((it) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: it.ativo ? 1 : 0.4, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-xl bg-white border p-3 space-y-2 transition-colors ${!it.ativo ? "bg-slate-50" : ""}`}
            >
              {/* Linha 1: cor + descrição + valor + remover */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 self-stretch rounded-full shrink-0"
                  style={{ background: CORES_CATEGORIA[it.categoria_sugerida] ?? "#64748B" }}
                />
                <div className="flex-1 min-w-0">
                  {it.ativo ? (
                    <input
                      type="text"
                      value={it.descricao}
                      onChange={(e) => setItemDescricao(it.id, e.target.value)}
                      className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none py-0.5"
                    />
                  ) : (
                    <div className="font-medium text-sm truncate line-through text-slate-400">{it.descricao}</div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{it.categoria_sugerida}</span>
                    {it.parcela_atual && it.total_parcelas && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {it.parcela_atual}/{it.total_parcelas}
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold text-danger shrink-0">{formatBRL(it.valor)}</div>
                {it.ativo ? (
                  <button onClick={() => removeItem(it.id)} className="p-1.5 text-slate-300 hover:text-danger rounded transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <button onClick={() => restoreItem(it.id)} className="p-1.5 text-slate-300 hover:text-success rounded transition-colors shrink-0" title="Restaurar">
                    <Check size={14} />
                  </button>
                )}
              </div>

              {/* Linha 2: selects (visíveis só se ativo) */}
              {it.ativo && (
                <div className="flex gap-2 pl-4">
                  <select
                    value={it.categoriaId}
                    onChange={(e) => setItemCategoria(it.id, e.target.value as Id<"categorias">)}
                    className={`flex-1 h-8 rounded-lg border px-2 text-xs ${
                      !it.categoriaId ? "border-warning bg-warning/5 text-warning" : "border-slate-200"
                    }`}
                  >
                    <option value="">Categoria...</option>
                    {categorias?.map((c) => (
                      <option key={c._id} value={c._id}>{c.nome}</option>
                    ))}
                  </select>
                  <select
                    value={it.pessoaId}
                    onChange={(e) => setItemPessoa(it.id, e.target.value as Id<"pessoas"> | "ambos" | "")}
                    className={`flex-1 h-8 rounded-lg border px-2 text-xs ${
                      !it.pessoaId ? "border-warning bg-warning/5 text-warning" : "border-slate-200"
                    }`}
                  >
                    <option value="">Pessoa...</option>
                    <option value="ambos">👥 Todos</option>
                    {pessoas?.map((p) => (
                      <option key={p._id} value={p._id}>{p.apelido ?? p.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {removidos.length > 0 && (
        <div className="text-xs text-slate-400 text-center">
          {removidos.length} lançamento{removidos.length !== 1 ? "s" : ""} removido{removidos.length !== 1 ? "s" : ""} — clique em ✓ para restaurar
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl p-3">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t py-4 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{ativos.length}</span> lançamentos ·{" "}
          <span className="font-mono font-semibold text-danger">{formatBRL(totalValor)}</span>
        </div>
        <div className="flex gap-2">
          <Link href="/financeiro/despesas">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={handleSalvar} disabled={saving || ativos.length === 0}>
            {saving ? (
              <><Loader2 size={15} className="animate-spin" /> Salvando...</>
            ) : (
              <><Check size={15} /> Salvar {ativos.length} lançamentos</>
            )}
          </Button>
        </div>
      </div>

      {/* Modal nova categoria */}
      <Dialog open={showNovaCategoria} onClose={() => setShowNovaCategoria(false)} title="Nova Categoria de Despesa">
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={novaCatCor}
              onChange={(e) => setNovaCatCor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
            />
            <Input
              label=""
              placeholder="Nome da categoria"
              value={novaCatNome}
              onChange={(e) => setNovaCatNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarCategoria()}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowNovaCategoria(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleCriarCategoria} disabled={!novaCatNome.trim() || savingCat}>
              {savingCat ? "Criando..." : "Criar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
