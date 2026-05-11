"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ListTree,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import {
  LancamentoItem,
  type LancamentoItemData,
} from "@/components/financeiro/LancamentoItem";
import { BulkBar } from "@/components/financeiro/BulkBar";
import {
  FiltrosLancamentos,
  type FiltroTipo,
  type FiltroStatus,
} from "@/components/financeiro/FiltrosLancamentos";
import { ReclassificarDialog } from "@/components/financeiro/ReclassificarDialog";
import { NovoLancamentoDropdown } from "@/components/financeiro/NovoLancamentoDropdown";
import { SumarioBarra } from "@/components/financeiro/SumarioBarra";
import { DespesaForm } from "@/components/financeiro/DespesaForm";
import { ReceitaForm } from "@/components/financeiro/ReceitaForm";
import { TransferenciaForm } from "@/components/financeiro/TransferenciaForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { currentMonth } from "@/lib/monthUtils";

const PAGINA_TAMANHO = 50;

type SelecaoKey = string; // formato `tipo:id`

function chaveSelecao(item: LancamentoItemData): SelecaoKey {
  return `${item.tipo}:${item.id}`;
}

interface FeedbackBulk {
  tipo: "sucesso" | "erro" | "parcial";
  mensagem: string;
}

export default function LancamentosPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroContaId, setFiltroContaId] = useState("");
  const [filtroCategoriaId, setFiltroCategoriaId] = useState("");
  const [filtroPagadorId, setFiltroPagadorId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  // Selecao + paginacao
  const [selecao, setSelecao] = useState<Set<SelecaoKey>>(new Set());
  const [pagina, setPagina] = useState(1);

  // Modais
  const [tipoNovo, setTipoNovo] = useState<"despesa" | "receita" | "transferencia" | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editandoDespesa, setEditandoDespesa] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editandoReceita, setEditandoReceita] = useState<any>(null);
  const [reclassificarAberto, setReclassificarAberto] = useState(false);
  const [confirmarExclusaoBulkAberto, setConfirmarExclusaoBulkAberto] = useState(false);
  const [confirmarExclusaoUmAberto, setConfirmarExclusaoUmAberto] = useState<
    LancamentoItemData | null
  >(null);

  const [processando, setProcessando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBulk | null>(null);

  // Limpar selecao ao mudar mes
  useEffect(() => {
    setSelecao(new Set());
    setPagina(1);
  }, [mes]);

  // Limpar pagina quando filtros mudam
  useEffect(() => {
    setPagina(1);
  }, [busca, filtroTipo, filtroContaId, filtroCategoriaId, filtroPagadorId, filtroStatus]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Queries
  const lancamentos = useQuery(
    api.financeiro.lancamentos.listByMonth,
    token ? { sessionToken: token, mes } : "skip"
  );
  const categorias = useQuery(
    api.financeiro.categorias.list,
    token ? { sessionToken: token } : "skip"
  );
  const contas = useQuery(
    api.financeiro.contas.list,
    token ? { sessionToken: token } : "skip"
  );
  const pagadores = useQuery(
    api.financeiro.pagadores.list,
    token ? { sessionToken: token, incluirInativos: true } : "skip"
  );
  const pessoas = useQuery(
    api.pessoas.list,
    token ? { sessionToken: token } : "skip"
  );

  // Mutations
  const bulkRemover = useMutation(api.financeiro.lancamentos.bulkRemover);
  const bulkReclassificar = useMutation(api.financeiro.lancamentos.bulkReclassificar);
  const bulkMarcarEfetivado = useMutation(api.financeiro.lancamentos.bulkMarcarEfetivado);
  const removerDespesa = useMutation(api.financeiro.despesas.remove);
  const removerReceita = useMutation(api.financeiro.receitas.remove);
  const removerTransferencia = useMutation(api.financeiro.transferencias.remove);

  // Maps de lookup
  const catMap = useMemo(
    () => new Map((categorias ?? []).map((c) => [c._id as string, c])),
    [categorias]
  );
  const contaMap = useMemo(
    () => new Map((contas ?? []).map((c) => [c._id as string, c])),
    [contas]
  );
  const pagadorMap = useMemo(
    () => new Map((pagadores ?? []).map((p) => [p._id as string, p])),
    [pagadores]
  );
  const pessoaMap = useMemo(
    () => new Map((pessoas ?? []).map((p) => [p._id as string, p])),
    [pessoas]
  );

  // Filtragem client-side
  const filtrados = useMemo(() => {
    if (!lancamentos) return [] as LancamentoItemData[];
    const term = busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      // tipo
      if (filtroTipo !== "todos" && l.tipo !== filtroTipo) return false;

      // status
      if (filtroStatus !== "todos") {
        if (l.tipo === "transferencia") {
          if (filtroStatus === "pendente") return false; // transferencia eh sempre efetivada
        } else {
          const efet = l.tipo === "despesa" ? l.pago : l.recebido;
          if (filtroStatus === "efetivado" && !efet) return false;
          if (filtroStatus === "pendente" && efet) return false;
        }
      }

      // conta
      if (filtroContaId) {
        if (l.tipo === "transferencia") {
          if (l.contaOrigemId !== filtroContaId && l.contaDestinoId !== filtroContaId) return false;
        } else {
          if (l.contaId !== filtroContaId) return false;
        }
      }

      // categoria
      if (filtroCategoriaId) {
        if (l.tipo === "transferencia") return false;
        if (l.categoriaId !== filtroCategoriaId) return false;
      }

      // pagador (so receita)
      if (filtroPagadorId) {
        if (l.tipo !== "receita") return false;
        if (l.pagadorId !== filtroPagadorId) return false;
      }

      // busca textual
      if (term) {
        const cat = l.tipo !== "transferencia" ? catMap.get(l.categoriaId as string) : undefined;
        const conta =
          l.tipo === "transferencia"
            ? null
            : l.contaId
            ? contaMap.get(l.contaId as string)
            : undefined;
        const pag =
          l.tipo === "receita" && l.pagadorId
            ? pagadorMap.get(l.pagadorId as string)
            : undefined;
        const haystack = [
          l.descricao,
          cat?.nome,
          conta?.nome,
          pag?.nome,
          pag?.apelido,
          l.tipo === "receita" ? l.pagadorNome : undefined,
          l.tipo === "despesa" ? l.cartao : undefined,
          l.tipo === "transferencia" ? l.contaOrigemNome : undefined,
          l.tipo === "transferencia" ? l.contaDestinoNome : undefined,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [
    lancamentos,
    busca,
    filtroTipo,
    filtroStatus,
    filtroContaId,
    filtroCategoriaId,
    filtroPagadorId,
    catMap,
    contaMap,
    pagadorMap,
  ]);

  const total = filtrados.length;
  const visiveis = useMemo(() => filtrados.slice(0, pagina * PAGINA_TAMANHO), [filtrados, pagina]);
  const temMais = total > visiveis.length;

  // Sumario
  const totaisGerais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const l of filtrados) {
      if (l.tipo === "receita") entradas += l.valor;
      else if (l.tipo === "despesa") saidas += l.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filtrados]);

  // Selecao helpers
  const selecionados = useMemo(() => {
    return filtrados.filter((l) => selecao.has(chaveSelecao(l)));
  }, [filtrados, selecao]);

  const tiposSelecionados = useMemo(() => {
    const set = new Set<string>();
    selecionados.forEach((l) => set.add(l.tipo));
    return set;
  }, [selecionados]);

  const podeReclassificar = useMemo(() => {
    if (selecionados.length === 0) return false;
    if (tiposSelecionados.has("transferencia")) return false;
    // todos do mesmo tipo (despesa OU receita)
    return tiposSelecionados.size === 1;
  }, [selecionados, tiposSelecionados]);

  const tipoUnicoSelecionado = useMemo<"despesa" | "receita" | null>(() => {
    if (!podeReclassificar) return null;
    return tiposSelecionados.has("despesa") ? "despesa" : "receita";
  }, [podeReclassificar, tiposSelecionados]);

  const podeMarcarEfetivado = useMemo(() => {
    if (selecionados.length === 0) return false;
    // Não permite com mistura de transferência (UX: ação só aplicável a despesas/receitas).
    if (selecionados.some((l) => l.tipo === "transferencia")) return false;
    // Pelo menos um pendente
    return selecionados.some((l) => {
      if (l.tipo === "despesa") return !l.pago;
      if (l.tipo === "receita") return !l.recebido;
      return false;
    });
  }, [selecionados]);

  function toggleSelecao(item: LancamentoItemData) {
    const key = chaveSelecao(item);
    setSelecao((s) => {
      const novo = new Set(s);
      if (novo.has(key)) novo.delete(key);
      else novo.add(key);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecao(new Set());
  }

  // Acoes individuais
  function editar(item: LancamentoItemData) {
    if (item.tipo === "despesa") {
      // Constroi shape esperado por DespesaForm.editData
      setEditandoDespesa({
        _id: item.id,
        descricao: item.descricao,
        valor: item.valor,
        tipo: item.tipoOriginal,
        categoriaId: item.categoriaId,
        pessoaId: item.pessoaId,
        contaId: item.contaId,
        dataVencimento: item.dataVencimento,
        totalParcelas: item.totalParcelas,
        parcelaAtual: item.parcelaAtual,
        cartao: item.cartao,
        recorrente: item.recorrente,
      });
    } else if (item.tipo === "receita") {
      setEditandoReceita({
        _id: item.id,
        descricao: item.descricao,
        valor: item.valor,
        tipo: item.tipoOriginal,
        categoriaId: item.categoriaId,
        pessoaId: item.pessoaId,
        pagadorId: item.pagadorId,
        pagadorNome: item.pagadorNome,
        contaId: item.contaId,
        dataPrevisao: item.dataPrevisao,
        totalParcelas: item.totalParcelas,
        parcelaAtual: item.parcelaAtual,
        recorrente: item.recorrente,
      });
    }
    // Transferencia: edicao individual nao implementada (mantem simples - apenas exclusao)
  }

  async function confirmarExclusaoIndividual(item: LancamentoItemData) {
    if (!token) return;
    try {
      if (item.tipo === "despesa") {
        await removerDespesa({ sessionToken: token, id: item.id as Id<"despesas"> });
      } else if (item.tipo === "receita") {
        await removerReceita({ sessionToken: token, id: item.id as Id<"receitas"> });
      } else {
        await removerTransferencia({
          sessionToken: token,
          id: item.id as Id<"transferencias">,
        });
      }
      setSelecao((s) => {
        const novo = new Set(s);
        novo.delete(chaveSelecao(item));
        return novo;
      });
    } catch (err) {
      setFeedback({
        tipo: "erro",
        mensagem: err instanceof Error ? err.message : "Erro ao excluir",
      });
    }
  }

  // Acoes bulk
  async function executarReclassificar(categoriaId: Id<"categorias">) {
    if (!token || !tipoUnicoSelecionado) return;
    setProcessando(true);
    try {
      const items = selecionados
        .filter(
          (l): l is LancamentoItemData & { tipo: "despesa" | "receita" } =>
            l.tipo === tipoUnicoSelecionado
        )
        .map((l) =>
          l.tipo === "despesa"
            ? ({ tipo: "despesa" as const, id: l.id as Id<"despesas"> })
            : ({ tipo: "receita" as const, id: l.id as Id<"receitas"> })
        );
      const r = await bulkReclassificar({
        sessionToken: token,
        items,
        categoriaId,
      });
      mostrarFeedback(r, "reclassificado", "reclassificados");
      limparSelecao();
    } finally {
      setProcessando(false);
    }
  }

  async function executarMarcarEfetivado() {
    if (!token) return;
    setProcessando(true);
    try {
      const items = selecionados
        .filter((l) => l.tipo !== "transferencia")
        .map((l) => {
          const mesProj =
            l.tipo === "despesa" || l.tipo === "receita" ? l._projectedMes : mes;
          if (l.tipo === "despesa") {
            return {
              tipo: "despesa" as const,
              id: l.id as Id<"despesas">,
              mes: mesProj,
            };
          }
          return {
            tipo: "receita" as const,
            id: l.id as Id<"receitas">,
            mes: mesProj,
          };
        });
      const r = await bulkMarcarEfetivado({ sessionToken: token, items });
      mostrarFeedback(r, "efetivado", "efetivados");
      limparSelecao();
    } catch (err) {
      setFeedback({
        tipo: "erro",
        mensagem: err instanceof Error ? err.message : "Erro ao efetivar",
      });
    } finally {
      setProcessando(false);
    }
  }

  async function executarExclusaoBulk() {
    if (!token) return;
    setProcessando(true);
    try {
      const items = selecionados.map((l) => {
        if (l.tipo === "despesa")
          return { tipo: "despesa" as const, id: l.id as Id<"despesas"> };
        if (l.tipo === "receita")
          return { tipo: "receita" as const, id: l.id as Id<"receitas"> };
        return { tipo: "transferencia" as const, id: l.id as Id<"transferencias"> };
      });
      const r = await bulkRemover({ sessionToken: token, items });
      mostrarFeedback(r, "excluído", "excluídos");
      limparSelecao();
    } finally {
      setProcessando(false);
    }
  }

  function mostrarFeedback(
    r: { sucesso: number; falhas: Array<{ id: string; motivo: string }> },
    singular: string,
    plural: string
  ) {
    if (r.falhas.length === 0) {
      setFeedback({
        tipo: "sucesso",
        mensagem: `${r.sucesso} ${r.sucesso === 1 ? singular : plural} com sucesso.`,
      });
    } else if (r.sucesso === 0) {
      setFeedback({
        tipo: "erro",
        mensagem: `Falha em ${r.falhas.length} ${r.falhas.length === 1 ? "lançamento" : "lançamentos"}: ${r.falhas[0].motivo}`,
      });
    } else {
      setFeedback({
        tipo: "parcial",
        mensagem: `${r.sucesso} ${r.sucesso === 1 ? singular : plural}, ${r.falhas.length} com falha.`,
      });
    }
  }

  const lancamentosLoading = lancamentos === undefined;

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
          >
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <ListTree size={26} className="text-primary" />
            Lançamentos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Extrato unificado: despesas, receitas e transferências
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <NovoLancamentoDropdown onSelecionar={(t) => setTipoNovo(t)} />
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-xl border p-3 flex items-center gap-2 text-sm ${
              feedback.tipo === "sucesso"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : feedback.tipo === "erro"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
            role="status"
          >
            {feedback.tipo === "sucesso" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span className="flex-1">{feedback.mensagem}</span>
            <button
              onClick={() => setFeedback(null)}
              className="p-0.5 rounded hover:bg-white/50"
              aria-label="Fechar mensagem"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros */}
      <FiltrosLancamentos
        busca={busca}
        onBuscaChange={setBusca}
        filtroTipo={filtroTipo}
        onFiltroTipoChange={setFiltroTipo}
        filtroContaId={filtroContaId}
        onFiltroContaIdChange={setFiltroContaId}
        filtroCategoriaId={filtroCategoriaId}
        onFiltroCategoriaIdChange={setFiltroCategoriaId}
        filtroPagadorId={filtroPagadorId}
        onFiltroPagadorIdChange={setFiltroPagadorId}
        filtroStatus={filtroStatus}
        onFiltroStatusChange={setFiltroStatus}
        contas={(contas ?? []).map((c) => ({ _id: c._id as string, nome: c.nome }))}
        categorias={(categorias ?? []).map((c) => ({
          _id: c._id as string,
          nome: c.nome,
          tipo: c.tipo,
        }))}
        pagadores={(pagadores ?? []).map((p) => ({
          _id: p._id as string,
          nome: p.nome,
          apelido: p.apelido,
        }))}
      />

      {/* Sumario */}
      {!lancamentosLoading && (
        <SumarioBarra
          count={total}
          totalEntradas={totaisGerais.entradas}
          totalSaidas={totaisGerais.saidas}
          saldo={totaisGerais.saldo}
        />
      )}

      {/* Lista */}
      {lancamentosLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <ListTree size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhum lançamento encontrado</p>
          <p className="text-sm text-slate-400">
            Ajuste os filtros ou crie um novo lançamento.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            <AnimatePresence>
              {visiveis.map((item, idx) => {
                const cat =
                  item.tipo !== "transferencia"
                    ? catMap.get(item.categoriaId as string)
                    : undefined;
                const conta =
                  item.tipo !== "transferencia" && item.contaId
                    ? contaMap.get(item.contaId as string)
                    : undefined;
                const pag =
                  item.tipo === "receita" && item.pagadorId
                    ? pagadorMap.get(item.pagadorId as string)
                    : undefined;
                const pessoa =
                  item.tipo === "despesa" && item.pessoaId
                    ? pessoaMap.get(item.pessoaId as string)
                    : undefined;
                return (
                  <LancamentoItem
                    key={`${item.tipo}-${item.id}-${
                      item.tipo !== "transferencia" ? item.parcelaAtual ?? "" : ""
                    }`}
                    item={item}
                    selecionado={selecao.has(chaveSelecao(item))}
                    onToggleSelecao={() => toggleSelecao(item)}
                    onEditar={() => editar(item)}
                    onExcluir={() => setConfirmarExclusaoUmAberto(item)}
                    categoria={
                      cat ? { nome: cat.nome, cor: cat.cor, icone: cat.icone } : undefined
                    }
                    conta={conta ? { nome: conta.nome } : undefined}
                    pagador={pag ? { nome: pag.nome, apelido: pag.apelido } : undefined}
                    pessoa={
                      pessoa
                        ? {
                            nome: pessoa.nome,
                            apelido: pessoa.apelido,
                            fotoUrl: pessoa.fotoUrl,
                            corTema: pessoa.corTema,
                          }
                        : undefined
                    }
                    index={idx}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
          {temMais && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setPagina((p) => p + 1)}
                aria-label="Carregar mais lançamentos"
              >
                Carregar mais ({total - visiveis.length} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {/* BulkBar */}
      <BulkBar
        selecaoCount={selecao.size}
        podeReclassificar={podeReclassificar}
        podeMarcarEfetivado={podeMarcarEfetivado}
        onReclassificar={() => setReclassificarAberto(true)}
        onMarcarEfetivado={executarMarcarEfetivado}
        onExcluir={() => setConfirmarExclusaoBulkAberto(true)}
        onCancelar={limparSelecao}
        processando={processando}
      />

      {/* Loading overlay para bulk */}
      {processando && selecao.size > 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl px-5 py-3 flex items-center gap-2 text-sm">
            <Loader2 className="animate-spin text-primary" size={16} />
            Processando...
          </div>
        </div>
      )}

      {/* Modais de criacao/edicao */}
      {tipoNovo === "despesa" && <DespesaForm onClose={() => setTipoNovo(null)} />}
      {tipoNovo === "receita" && <ReceitaForm onClose={() => setTipoNovo(null)} />}
      {tipoNovo === "transferencia" && (
        <TransferenciaForm onClose={() => setTipoNovo(null)} />
      )}
      {editandoDespesa && (
        <DespesaForm
          onClose={() => setEditandoDespesa(null)}
          editData={editandoDespesa}
        />
      )}
      {editandoReceita && (
        <ReceitaForm
          onClose={() => setEditandoReceita(null)}
          editData={editandoReceita}
        />
      )}

      {/* Reclassificar */}
      {tipoUnicoSelecionado && (
        <ReclassificarDialog
          open={reclassificarAberto}
          onClose={() => setReclassificarAberto(false)}
          onConfirmar={executarReclassificar}
          tipoLancamentos={tipoUnicoSelecionado}
          count={selecionados.length}
        />
      )}

      {/* Confirmar exclusao bulk */}
      <ConfirmDialog
        open={confirmarExclusaoBulkAberto}
        onClose={() => setConfirmarExclusaoBulkAberto(false)}
        onConfirm={() => {
          executarExclusaoBulk();
        }}
        title={`Excluir ${selecao.size} ${selecao.size === 1 ? "lançamento" : "lançamentos"}`}
        description={`Esta ação não pode ser desfeita. ${
          selecionados.some((l) => l.tipo !== "transferencia")
            ? "Pagamentos/recebimentos vinculados também serão removidos."
            : ""
        }`}
        confirmLabel="Excluir"
        loading={processando}
      />

      {/* Confirmar exclusao individual */}
      <ConfirmDialog
        open={!!confirmarExclusaoUmAberto}
        onClose={() => setConfirmarExclusaoUmAberto(null)}
        onConfirm={() => {
          if (confirmarExclusaoUmAberto)
            confirmarExclusaoIndividual(confirmarExclusaoUmAberto);
          setConfirmarExclusaoUmAberto(null);
        }}
        title="Excluir lançamento"
        description="Tem certeza que deseja excluir este lançamento? Essa ação não pode ser desfeita."
      />
    </div>
  );
}
