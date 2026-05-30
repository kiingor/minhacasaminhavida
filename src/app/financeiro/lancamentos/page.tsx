"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle2, AlertTriangle, X, Inbox, Tag, Users, Wallet, CreditCard, ChevronDown, History, Receipt, Settings2,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { EfetivarDialog } from "@/components/financeiro/EfetivarDialog";
import { ExcluirLancamentoDialog, type EscopoExclusao } from "@/components/financeiro/ExcluirLancamentoDialog";
import { HistoricoExclusoesDialog } from "@/components/financeiro/HistoricoExclusoesDialog";
import { NovoLancamentoDropdown } from "@/components/financeiro/NovoLancamentoDropdown";
import { SumarioBarra } from "@/components/financeiro/SumarioBarra";
import { DespesaForm } from "@/components/financeiro/DespesaForm";
import { ReceitaForm } from "@/components/financeiro/ReceitaForm";
import { TransferenciaForm } from "@/components/financeiro/TransferenciaForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBRL, todayISO } from "@/lib/formatters";
import { monthLabelLong } from "@/lib/monthUtils";
import { usePersistedMes } from "@/lib/usePersistedMes";

const PAGINA_TAMANHO = 50;

type SelecaoKey = string;
function chaveSelecao(item: LancamentoItemData): SelecaoKey {
  return `${item.tipo}:${item.id}`;
}

/** Efetivado = pago (despesa) / recebido (receita) / transferência (concluída).
 *  Usado pra empurrar o que já saiu/entrou pro fim da lista de cada dia. */
function itemEfetivado(item: LancamentoItemData): boolean {
  if (item.tipo === "despesa") return item.pago;
  if (item.tipo === "receita") return item.recebido;
  return true;
}

const ATALHOS_GERENCIAR: Array<{ href: string; icon: typeof Tag; label: string }> = [
  { href: "/financeiro/categorias",   icon: Tag,     label: "Categorias" },
  { href: "/financeiro/pagadores",    icon: Users,   label: "Pagadores" },
  { href: "/financeiro/contas",       icon: Wallet,  label: "Contas" },
  { href: "/financeiro/comprovantes", icon: Receipt, label: "Comprovantes" },
];

/**
 * Dropdown "Gerenciar" — agrupa os atalhos de cadastro (Categorias, Pagadores,
 * Contas, Comprovantes) + o utilitário Histórico num único menu rotulado.
 * Substitui a fileira de ícones sem legenda que poluía o header no mobile.
 * Espelha o padrão do NovoLancamentoDropdown (fecha no clique fora/Escape,
 * abre pra cima no mobile).
 */
function GerenciarDropdown({ onHistorico }: { onHistorico: () => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-cream-200 text-ink-700 text-sm font-medium hover:text-coral-600 hover:border-coral-300 hover:bg-cream-50 shadow-soft transition-colors"
        aria-label="Gerenciar cadastros"
        aria-expanded={aberto}
        aria-haspopup="menu"
      >
        <Settings2 size={16} />
        <span>Gerenciar</span>
        <ChevronDown size={13} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 mt-2 w-56 rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden z-30 max-md:bottom-full max-md:top-auto max-md:mt-0 max-md:mb-2"
          >
            {ATALHOS_GERENCIAR.map((a) => (
              <Link
                key={a.href}
                role="menuitem"
                href={a.href}
                onClick={() => setAberto(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-cream-100 text-ink-700 flex items-center justify-center shrink-0">
                  <a.icon size={16} />
                </div>
                <span className="text-sm font-semibold text-ink-900">{a.label}</span>
              </Link>
            ))}

            <hr className="border-cream-100 mx-3 my-1" />

            <button
              type="button"
              role="menuitem"
              onClick={() => { setAberto(false); onHistorico(); }}
              aria-label="Histórico de exclusões e diagnóstico"
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-cream-100 text-ink-500 flex items-center justify-center shrink-0">
                <History size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-700">Histórico</div>
                <div className="text-[11px] text-ink-400">Exclusões e diagnóstico</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FeedbackBulk {
  tipo: "sucesso" | "erro" | "parcial";
  mensagem: string;
}

function diaLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Hoje";
  const ontem = new Date(today);
  ontem.setDate(ontem.getDate() - 1);
  if (iso === ontem.toISOString().slice(0, 10)) return "Ontem";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" });
}

interface Grupo {
  data: string;
  itens: LancamentoItemData[];
  totalEntradas: number;
  totalSaidas: number;
}

interface GrupoCartao {
  cartao: string;
  itens: LancamentoItemData[];
  total: number;
  qtd: number;
  totalPendente: number;
  qtdPendente: number;
  cor?: string;
  bandeira?: string;
  /** Conta vinculada às despesas pendentes (se todas apontam para a mesma). Pré-seleciona ao pagar a fatura. */
  contaSugeridaId?: Id<"contas">;
}

export default function LancamentosPage() {
  const token = useSessionToken();
  const searchParams = useSearchParams();
  const [mes, setMes] = usePersistedMes();

  // Pré-filtro vindo da URL (?categoriaId=X&mes=YYYY-MM&tipo=despesa|receita)
  const categoriaIdQuery = searchParams.get("categoriaId") ?? "";
  const mesQuery = searchParams.get("mes");
  const tipoQuery = searchParams.get("tipo") as FiltroTipo | null;

  // Aplica mes da URL uma vez quando carrega
  useEffect(() => {
    if (mesQuery && /^\d{4}-\d{2}$/.test(mesQuery) && mesQuery !== mes) {
      setMes(mesQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesQuery]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>(
    tipoQuery && ["despesa", "receita", "transferencia", "todos"].includes(tipoQuery)
      ? tipoQuery
      : "todos"
  );
  const [filtroContaId, setFiltroContaId] = useState("");
  const [filtroCategoriaId, setFiltroCategoriaId] = useState(categoriaIdQuery);
  const [filtroPagadorId, setFiltroPagadorId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  // Atualiza filtro se a query string mudar (navegação dentro da SPA)
  useEffect(() => {
    if (categoriaIdQuery && categoriaIdQuery !== filtroCategoriaId) {
      setFiltroCategoriaId(categoriaIdQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaIdQuery]);

  // Seleção + paginação
  const [selecao, setSelecao] = useState<Set<SelecaoKey>>(new Set());
  const [pagina, setPagina] = useState(1);

  // Modais
  const [tipoNovo, setTipoNovo] = useState<"despesa" | "receita" | "transferencia" | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editandoDespesa, setEditandoDespesa] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editandoReceita, setEditandoReceita] = useState<any>(null);
  const [reclassificarAberto, setReclassificarAberto] = useState(false);
  const [efetivarDialogAberto, setEfetivarDialogAberto] = useState(false);
  const [confirmarExclusaoBulkAberto, setConfirmarExclusaoBulkAberto] = useState(false);
  const [confirmarExclusaoUmAberto, setConfirmarExclusaoUmAberto] = useState<LancamentoItemData | null>(null);

  const [processando, setProcessando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBulk | null>(null);

  // Cartões expandidos (default: todos minimizados)
  const [cartoesExpandidos, setCartoesExpandidos] = useState<Set<string>>(new Set());
  // Fatura sendo paga via dialog (null quando fechado)
  const [faturaPagar, setFaturaPagar] = useState<GrupoCartao | null>(null);
  // Dialog de histórico de exclusões / diagnóstico
  const [historicoAberto, setHistoricoAberto] = useState(false);

  useEffect(() => {
    setSelecao(new Set());
    setPagina(1);
  }, [mes]);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroTipo, filtroContaId, filtroCategoriaId, filtroPagadorId, filtroStatus]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const lancamentos = useQuery(api.financeiro.lancamentos.listByMonth, token ? { sessionToken: token, mes } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token } : "skip");
  const contas = useQuery(api.financeiro.contas.list, token ? { sessionToken: token } : "skip");
  const cartoes = useQuery(api.financeiro.cartoes.list, token ? { sessionToken: token } : "skip");
  const pagadores = useQuery(api.financeiro.pagadores.list, token ? { sessionToken: token, incluirInativos: true } : "skip");
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");

  const bulkRemover = useMutation(api.financeiro.lancamentos.bulkRemover);
  const bulkReclassificar = useMutation(api.financeiro.lancamentos.bulkReclassificar);
  const bulkMarcarEfetivado = useMutation(api.financeiro.lancamentos.bulkMarcarEfetivado);
  const removerDespesa = useMutation(api.financeiro.despesas.remove);
  const removerReceita = useMutation(api.financeiro.receitas.remove);
  const removerTransferencia = useMutation(api.financeiro.transferencias.remove);
  const excluirDespesaNoMes = useMutation(api.financeiro.despesas.excluirNoMes);
  const excluirReceitaNoMes = useMutation(api.financeiro.receitas.excluirNoMes);
  const desfazerDespesa = useMutation(api.financeiro.despesas.desfazerEfetivacao);
  const desfazerReceita = useMutation(api.financeiro.receitas.desfazerEfetivacao);

  const catMap = useMemo(() => new Map((categorias ?? []).map((c) => [c._id as string, c])), [categorias]);
  const contaMap = useMemo(() => new Map((contas ?? []).map((c) => [c._id as string, c])), [contas]);
  const pagadorMap = useMemo(() => new Map((pagadores ?? []).map((p) => [p._id as string, p])), [pagadores]);
  const pessoaMap = useMemo(() => new Map((pessoas ?? []).map((p) => [p._id as string, p])), [pessoas]);

  const filtrados = useMemo(() => {
    if (!lancamentos) return [] as LancamentoItemData[];
    const term = busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      if (filtroTipo !== "todos" && l.tipo !== filtroTipo) return false;

      if (filtroStatus !== "todos") {
        if (l.tipo === "transferencia") {
          if (filtroStatus === "pendente") return false;
        } else {
          const efet = l.tipo === "despesa" ? l.pago : l.recebido;
          if (filtroStatus === "efetivado" && !efet) return false;
          if (filtroStatus === "pendente" && efet) return false;
        }
      }

      if (filtroContaId) {
        if (l.tipo === "transferencia") {
          if (l.contaOrigemId !== filtroContaId && l.contaDestinoId !== filtroContaId) return false;
        } else {
          if (l.contaId !== filtroContaId) return false;
        }
      }

      if (filtroCategoriaId) {
        if (l.tipo === "transferencia") return false;
        if (l.categoriaId !== filtroCategoriaId) return false;
      }

      if (filtroPagadorId) {
        if (l.tipo !== "receita") return false;
        if (l.pagadorId !== filtroPagadorId) return false;
      }

      if (term) {
        const cat = l.tipo !== "transferencia" ? catMap.get(l.categoriaId as string) : undefined;
        const conta = l.tipo === "transferencia" ? null : l.contaId ? contaMap.get(l.contaId as string) : undefined;
        const pag = l.tipo === "receita" && l.pagadorId ? pagadorMap.get(l.pagadorId as string) : undefined;
        const haystack = [
          l.descricao, cat?.nome, conta?.nome, pag?.nome, pag?.apelido,
          l.tipo === "receita" ? l.pagadorNome : undefined,
          l.tipo === "despesa" ? l.cartao : undefined,
          l.tipo === "transferencia" ? l.contaOrigemNome : undefined,
          l.tipo === "transferencia" ? l.contaDestinoNome : undefined,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [lancamentos, busca, filtroTipo, filtroStatus, filtroContaId, filtroCategoriaId, filtroPagadorId, catMap, contaMap, pagadorMap]);

  const total = filtrados.length;
  const visiveis = useMemo(() => filtrados.slice(0, pagina * PAGINA_TAMANHO), [filtrados, pagina]);
  const temMais = total > visiveis.length;

  const totaisGerais = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const l of filtrados) {
      if (l.tipo === "receita") entradas += l.valor;
      else if (l.tipo === "despesa") saidas += l.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filtrados]);

  // Separa despesas de cartão dos outros (cartão vira grupo próprio)
  const visiveisNaoCartao = useMemo(
    () => visiveis.filter((l) => !(l.tipo === "despesa" && l.cartao)),
    [visiveis]
  );

  // Agrupamento por dia (descendente) — só itens NÃO de cartão
  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();
    for (const item of visiveisNaoCartao) {
      const dia = item.dataRef.slice(0, 10);
      if (!map.has(dia)) map.set(dia, { data: dia, itens: [], totalEntradas: 0, totalSaidas: 0 });
      const g = map.get(dia)!;
      g.itens.push(item);
      if (item.tipo === "receita") g.totalEntradas += item.valor;
      else if (item.tipo === "despesa") g.totalSaidas += item.valor;
    }
    // Dentro de cada dia: pendentes primeiro, efetivados (pagos/recebidos) pro fim.
    for (const g of map.values()) {
      g.itens.sort((a, b) => Number(itemEfetivado(a)) - Number(itemEfetivado(b)));
    }
    return Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
  }, [visiveisNaoCartao]);

  // Agrupamento de despesas por cartão (1 grupo por cartão usado no mês)
  const gruposCartao = useMemo<GrupoCartao[]>(() => {
    const map = new Map<string, GrupoCartao>();
    for (const item of visiveis) {
      if (item.tipo !== "despesa" || !item.cartao) continue;
      const key = item.cartao;
      if (!map.has(key)) {
        map.set(key, {
          cartao: key,
          itens: [],
          total: 0,
          qtd: 0,
          totalPendente: 0,
          qtdPendente: 0,
        });
      }
      const g = map.get(key)!;
      g.itens.push(item);
      g.total += item.valor;
      g.qtd += 1;
      if (!item.pago) {
        g.totalPendente += item.valor;
        g.qtdPendente += 1;
      }
    }
    // Decora com cor/bandeira dos cartões cadastrados
    const cartoesMap = new Map((cartoes ?? []).map((c) => [c.nome, c]));
    return Array.from(map.values())
      .map((g) => {
        const info = cartoesMap.get(g.cartao);
        // Conta sugerida = conta vinculada às despesas pendentes, se todas concordam.
        const contasPendentes = new Set<string>();
        for (const i of g.itens) {
          if (i.tipo === "despesa" && !i.pago && i.contaId) {
            contasPendentes.add(i.contaId as string);
          }
        }
        const contaSugeridaId =
          contasPendentes.size === 1
            ? (Array.from(contasPendentes)[0] as Id<"contas">)
            : undefined;
        return { ...g, cor: info?.cor, bandeira: info?.bandeira, contaSugeridaId };
      })
      .sort((a, b) => b.total - a.total);
  }, [visiveis, cartoes]);

  function toggleCartaoExpansao(cartao: string) {
    setCartoesExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(cartao)) next.delete(cartao);
      else next.add(cartao);
      return next;
    });
  }

  const selecionados = useMemo(() => filtrados.filter((l) => selecao.has(chaveSelecao(l))), [filtrados, selecao]);
  const tiposSelecionados = useMemo(() => {
    const set = new Set<string>();
    selecionados.forEach((l) => set.add(l.tipo));
    return set;
  }, [selecionados]);

  const podeReclassificar = useMemo(() => {
    if (selecionados.length === 0) return false;
    if (tiposSelecionados.has("transferencia")) return false;
    return tiposSelecionados.size === 1;
  }, [selecionados, tiposSelecionados]);

  const tipoUnicoSelecionado = useMemo<"despesa" | "receita" | null>(() => {
    if (!podeReclassificar) return null;
    return tiposSelecionados.has("despesa") ? "despesa" : "receita";
  }, [podeReclassificar, tiposSelecionados]);

  const podeMarcarEfetivado = useMemo(() => {
    if (selecionados.length === 0) return false;
    if (selecionados.some((l) => l.tipo === "transferencia")) return false;
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
      if (novo.has(key)) novo.delete(key); else novo.add(key);
      return novo;
    });
  }

  function limparSelecao() { setSelecao(new Set()); }

  function editar(item: LancamentoItemData) {
    if (item.tipo === "despesa") {
      setEditandoDespesa({
        _id: item.id, descricao: item.descricao, valor: item.valor, tipo: item.tipoOriginal,
        categoriaId: item.categoriaId, pessoaId: item.pessoaId, contaId: item.contaId,
        dataVencimento: item.dataVencimento, totalParcelas: item.totalParcelas,
        parcelaAtual: item.parcelaAtual, cartao: item.cartao, recorrente: item.recorrente,
      });
    } else if (item.tipo === "receita") {
      setEditandoReceita({
        _id: item.id, descricao: item.descricao, valor: item.valor, tipo: item.tipoOriginal,
        categoriaId: item.categoriaId, pessoaId: item.pessoaId, pagadorId: item.pagadorId,
        pagadorNome: item.pagadorNome, contaId: item.contaId, dataPrevisao: item.dataPrevisao,
        totalParcelas: item.totalParcelas, parcelaAtual: item.parcelaAtual, recorrente: item.recorrente,
      });
    }
  }

  async function confirmarExclusaoIndividual(item: LancamentoItemData, escopo: EscopoExclusao = "todos") {
    if (!token) return;
    try {
      const mesProj = item.tipo === "transferencia" ? mes : item._projectedMes;
      if (escopo === "mes" && (item.tipo === "despesa" || item.tipo === "receita")) {
        if (item.tipo === "despesa") {
          await excluirDespesaNoMes({ sessionToken: token, id: item.id as Id<"despesas">, mes: mesProj });
        } else {
          await excluirReceitaNoMes({ sessionToken: token, id: item.id as Id<"receitas">, mes: mesProj });
        }
      } else {
        if (item.tipo === "despesa") await removerDespesa({ sessionToken: token, id: item.id as Id<"despesas"> });
        else if (item.tipo === "receita") await removerReceita({ sessionToken: token, id: item.id as Id<"receitas"> });
        else await removerTransferencia({ sessionToken: token, id: item.id as Id<"transferencias"> });
      }
      setSelecao((s) => {
        const novo = new Set(s);
        novo.delete(chaveSelecao(item));
        return novo;
      });
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: err instanceof Error ? err.message : "Erro ao excluir" });
    }
  }

  async function desfazerEfetivacao(item: LancamentoItemData) {
    if (!token || item.tipo === "transferencia") return;
    try {
      const mesProj = item._projectedMes;
      const r = item.tipo === "despesa"
        ? await desfazerDespesa({ sessionToken: token, id: item.id as Id<"despesas">, mes: mesProj })
        : await desfazerReceita({ sessionToken: token, id: item.id as Id<"receitas">, mes: mesProj });
      if (r?.desfeito) {
        setFeedback({
          tipo: "sucesso",
          mensagem: `${item.tipo === "despesa" ? "Pagamento" : "Recebimento"} desfeito. Lançamento voltou para pendente.`,
        });
      } else {
        // Não havia o que desfazer neste mês (ex: efetivado em outro mês).
        setFeedback({
          tipo: "erro",
          mensagem: "Nada para desfazer neste mês. Se foi efetivado em outro mês, desfaça pelo extrato da conta (Diagnóstico de saldos).",
        });
      }
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: err instanceof Error ? err.message : "Erro ao desfazer efetivação" });
    }
  }

  async function executarReclassificar(categoriaId: Id<"categorias">) {
    if (!token || !tipoUnicoSelecionado) return;
    setProcessando(true);
    try {
      const items = selecionados
        .filter((l): l is LancamentoItemData & { tipo: "despesa" | "receita" } => l.tipo === tipoUnicoSelecionado)
        .map((l) => l.tipo === "despesa"
          ? ({ tipo: "despesa" as const, id: l.id as Id<"despesas"> })
          : ({ tipo: "receita" as const, id: l.id as Id<"receitas"> }));
      const r = await bulkReclassificar({ sessionToken: token, items, categoriaId });
      mostrarFeedback(r, "reclassificado", "reclassificados");
      limparSelecao();
    } finally {
      setProcessando(false);
    }
  }

  function abrirEfetivarDialog() {
    setEfetivarDialogAberto(true);
  }

  async function confirmarPagamentoFatura(contaId: Id<"contas"> | null, comprovanteStorageId?: Id<"_storage">) {
    if (!token || !faturaPagar) return;
    setProcessando(true);
    try {
      const items = faturaPagar.itens
        .filter((l) => l.tipo === "despesa" && !l.pago)
        .map((l) => ({
          tipo: "despesa" as const,
          id: l.id as Id<"despesas">,
          mes: (l as { _projectedMes: string })._projectedMes,
        }));
      if (items.length === 0) {
        setFeedback({ tipo: "erro", mensagem: "Não há lançamentos pendentes nesta fatura" });
        return;
      }
      const r = await bulkMarcarEfetivado({
        sessionToken: token,
        items,
        contaId: contaId ?? undefined,
        comprovanteStorageId,
      });
      mostrarFeedback(r, "lançamento efetivado", "lançamentos efetivados");
    } catch (err) {
      setFeedback({
        tipo: "erro",
        mensagem: err instanceof Error ? err.message : "Erro ao pagar fatura",
      });
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarEfetivacaoBulk(contaId: Id<"contas"> | null, comprovanteStorageId?: Id<"_storage">) {
    if (!token) return;
    setProcessando(true);
    try {
      const items = selecionados
        .filter((l) => l.tipo !== "transferencia")
        .filter((l) => {
          // Não tenta efetivar quem já está efetivado
          if (l.tipo === "despesa") return !l.pago;
          if (l.tipo === "receita") return !l.recebido;
          return false;
        })
        .map((l) => {
          const mesProj = l.tipo === "despesa" || l.tipo === "receita" ? l._projectedMes : mes;
          if (l.tipo === "despesa") return { tipo: "despesa" as const, id: l.id as Id<"despesas">, mes: mesProj };
          return { tipo: "receita" as const, id: l.id as Id<"receitas">, mes: mesProj };
        });
      const r = await bulkMarcarEfetivado({
        sessionToken: token,
        items,
        contaId: contaId ?? undefined,
        comprovanteStorageId,
      });
      mostrarFeedback(r, "efetivado", "efetivados");
      limparSelecao();
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: err instanceof Error ? err.message : "Erro ao efetivar" });
    } finally {
      setProcessando(false);
    }
  }

  async function executarExclusaoBulk() {
    if (!token) return;
    setProcessando(true);
    try {
      const items = selecionados.map((l) => {
        if (l.tipo === "despesa") return { tipo: "despesa" as const, id: l.id as Id<"despesas"> };
        if (l.tipo === "receita") return { tipo: "receita" as const, id: l.id as Id<"receitas"> };
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
    singular: string, plural: string,
  ) {
    if (r.falhas.length === 0) {
      setFeedback({ tipo: "sucesso", mensagem: `${r.sucesso} ${r.sucesso === 1 ? singular : plural} com sucesso.` });
    } else if (r.sucesso === 0) {
      setFeedback({ tipo: "erro", mensagem: `Falha em ${r.falhas.length} ${r.falhas.length === 1 ? "lançamento" : "lançamentos"}: ${r.falhas[0].motivo}` });
    } else {
      setFeedback({ tipo: "parcial", mensagem: `${r.sucesso} ${r.sucesso === 1 ? singular : plural}, ${r.falhas.length} com falha.` });
    }
  }

  const lancamentosLoading = lancamentos === undefined;
  const itensRestantes = total - visiveis.length;

  return (
    <div className="py-6 md:py-10 space-y-5 pb-32">
      {/* Header */}
      <PageHeader
        backHref="/financeiro"
        backLabel="Voltar para Finanças"
        title="Lançamentos"
        subtitle="Despesas, receitas e transferências em um só lugar"
        actions={
          <>
            <GerenciarDropdown onHistorico={() => setHistoricoAberto(true)} />
            <span className="hidden md:inline-block h-6 w-px bg-cream-200 mx-1" />
            <MonthSelector mes={mes} onChange={setMes} />
            <NovoLancamentoDropdown onSelecionar={(t) => setTipoNovo(t)} />
          </>
        }
      />

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl bg-ink-900 text-white px-4 py-3 flex items-center gap-3 text-sm shadow-soft"
            role="status"
          >
            {feedback.tipo === "sucesso"
              ? <CheckCircle2 size={16} className="text-coral-400 shrink-0" />
              : <AlertTriangle size={16} className="text-coral-400 shrink-0" />
            }
            <span className="flex-1">{feedback.mensagem}</span>
            <button
              onClick={() => setFeedback(null)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center shrink-0"
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
        categorias={(categorias ?? []).map((c) => ({ _id: c._id as string, nome: c.nome, tipo: c.tipo }))}
        pagadores={(pagadores ?? []).map((p) => ({ _id: p._id as string, nome: p.nome, apelido: p.apelido }))}
      />

      {/* Sumário */}
      {!lancamentosLoading && (
        <SumarioBarra
          count={total}
          totalEntradas={totaisGerais.entradas}
          totalSaidas={totaisGerais.saidas}
          saldo={totaisGerais.saldo}
        />
      )}

      {/* Lista agrupada por dia */}
      {lancamentosLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : total === 0 ? (
        <Card tone="cream" padding="lg" className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-white shadow-soft flex items-center justify-center text-ink-400 mb-4">
            <Inbox size={24} />
          </div>
          <p className="font-display font-bold text-base text-ink-900">Nenhum lançamento</p>
          <p className="text-sm text-ink-400 mt-1">Ajuste os filtros ou crie um novo lançamento.</p>
        </Card>
      ) : (
        <>
          {/* Faturas de cartão (agrupado, minimizado por default) */}
          {gruposCartao.length > 0 && (
            <div className="space-y-2 mb-6">
              <h2 className="text-[11px] uppercase tracking-[0.12em] text-ink-400 font-semibold px-1">
                Faturas de cartão
              </h2>
              {gruposCartao.map((gc) => {
                const expandido = cartoesExpandidos.has(gc.cartao);
                return (
                  <Card key={gc.cartao} padding="none" className="overflow-hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCartaoExpansao(gc.cartao)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleCartaoExpansao(gc.cartao);
                        }
                      }}
                      className="w-full p-3 flex items-center gap-3 hover:bg-cream-50/60 transition-colors cursor-pointer"
                      aria-expanded={expandido}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `${gc.cor ?? "#6366F1"}20`,
                          color: gc.cor ?? "#6366F1",
                        }}
                      >
                        <CreditCard size={18} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-ink-900 truncate">{gc.cartao}</span>
                          {gc.bandeira && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-500 uppercase tracking-wide">
                              {gc.bandeira}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-ink-500">
                            {gc.qtd} {gc.qtd === 1 ? "lançamento" : "lançamentos"}
                          </span>
                          {gc.qtdPendente > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-coral-100 text-coral-700 font-medium">
                              {gc.qtdPendente} pendente{gc.qtdPendente === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-400 mt-0.5">
                          {gc.qtdPendente > 0
                            ? `Pendente: ${formatBRL(gc.totalPendente)}`
                            : "Fatura quitada"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-ink-900 tabular-nums">
                          {formatBRL(gc.total)}
                        </div>
                      </div>
                      {gc.qtdPendente > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFaturaPagar(gc);
                          }}
                          className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-full bg-coral-500 text-white text-xs font-medium hover:bg-coral-600 shadow-pop transition-colors"
                          aria-label={`Pagar fatura do cartão ${gc.cartao}`}
                        >
                          <CheckCircle2 size={14} /> Pagar
                        </button>
                      )}
                      <ChevronDown
                        size={16}
                        className={`text-ink-400 transition-transform shrink-0 ${expandido ? "rotate-180" : ""}`}
                      />
                    </div>
                    <AnimatePresence initial={false}>
                      {expandido && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-cream-100"
                        >
                          <ul className="divide-y divide-cream-100">
                            {gc.itens.map((item, idx) => {
                              // Só despesas estão em gc.itens (filtro garante)
                              if (item.tipo !== "despesa") return null;
                              const cat = catMap.get(item.categoriaId as string);
                              const pessoa = item.pessoaId ? pessoaMap.get(item.pessoaId as string) : undefined;
                              return (
                                <LancamentoItem
                                  key={`cartao-${item.id}-${item.parcelaAtual ?? ""}`}
                                  item={item}
                                  selecionado={selecao.has(chaveSelecao(item))}
                                  onToggleSelecao={() => toggleSelecao(item)}
                                  onEditar={() => editar(item)}
                                  onExcluir={() => setConfirmarExclusaoUmAberto(item)}
                                  onDesfazerEfetivacao={() => desfazerEfetivacao(item)}
                                  categoria={cat ? { nome: cat.nome, cor: cat.cor, icone: cat.icone } : undefined}
                                  pessoa={pessoa ? {
                                    nome: pessoa.nome, apelido: pessoa.apelido,
                                    fotoUrl: pessoa.fotoUrl, corTema: pessoa.corTema,
                                  } : undefined}
                                  index={idx}
                                />
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="space-y-6">
            {grupos.map((g) => {
              const saldoDia = g.totalEntradas - g.totalSaidas;
              const sinal = saldoDia < 0 ? "-" : saldoDia > 0 ? "+" : "";
              return (
                <section key={g.data} aria-label={diaLabel(g.data)}>
                  {/* Cabeçalho do dia */}
                  <div className="flex items-baseline justify-between mb-2 px-1">
                    <h2 className="text-[11px] uppercase tracking-[0.12em] text-ink-400 font-semibold capitalize">
                      {diaLabel(g.data)}
                    </h2>
                    {(g.totalEntradas > 0 || g.totalSaidas > 0) && (
                      <span className="text-[11px] font-mono text-ink-400 tabular-nums">
                        {sinal}{formatBRL(Math.abs(saldoDia))}
                      </span>
                    )}
                  </div>
                  <Card padding="none" className="overflow-hidden">
                    <ul className="divide-y divide-cream-100">
                      <AnimatePresence>
                        {g.itens.map((item, idx) => {
                          const cat = item.tipo !== "transferencia" ? catMap.get(item.categoriaId as string) : undefined;
                          const conta = item.tipo !== "transferencia" && item.contaId ? contaMap.get(item.contaId as string) : undefined;
                          const pag = item.tipo === "receita" && item.pagadorId ? pagadorMap.get(item.pagadorId as string) : undefined;
                          const pessoa = item.tipo === "despesa" && item.pessoaId ? pessoaMap.get(item.pessoaId as string) : undefined;
                          return (
                            <LancamentoItem
                              key={`${item.tipo}-${item.id}-${item.tipo !== "transferencia" ? item.parcelaAtual ?? "" : ""}`}
                              item={item}
                              selecionado={selecao.has(chaveSelecao(item))}
                              onToggleSelecao={() => toggleSelecao(item)}
                              onEditar={() => editar(item)}
                              onExcluir={() => setConfirmarExclusaoUmAberto(item)}
                              onDesfazerEfetivacao={() => desfazerEfetivacao(item)}
                              categoria={cat ? { nome: cat.nome, cor: cat.cor, icone: cat.icone } : undefined}
                              conta={conta ? { nome: conta.nome } : undefined}
                              pagador={pag ? { nome: pag.nome, apelido: pag.apelido } : undefined}
                              pessoa={pessoa ? {
                                nome: pessoa.nome, apelido: pessoa.apelido,
                                fotoUrl: pessoa.fotoUrl, corTema: pessoa.corTema,
                              } : undefined}
                              index={idx}
                              ocultarData
                            />
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </Card>
                </section>
              );
            })}
          </div>

          {temMais && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setPagina((p) => p + 1)}
                aria-label="Carregar mais lançamentos"
              >
                Carregar mais ({itensRestantes} restantes)
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
        onMarcarEfetivado={abrirEfetivarDialog}
        onExcluir={() => setConfirmarExclusaoBulkAberto(true)}
        onCancelar={limparSelecao}
        processando={processando}
      />

      {processando && selecao.size > 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-900/20 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-card px-5 py-3 flex items-center gap-2 text-sm">
            <Loader2 className="animate-spin text-coral-500" size={16} />
            Processando...
          </div>
        </div>
      )}

      {/* Modais */}
      {tipoNovo === "despesa" && <DespesaForm onClose={() => setTipoNovo(null)} />}
      {tipoNovo === "receita" && <ReceitaForm onClose={() => setTipoNovo(null)} />}
      {tipoNovo === "transferencia" && <TransferenciaForm onClose={() => setTipoNovo(null)} />}
      {editandoDespesa && <DespesaForm onClose={() => setEditandoDespesa(null)} editData={editandoDespesa} />}
      {editandoReceita && <ReceitaForm onClose={() => setEditandoReceita(null)} editData={editandoReceita} />}

      {tipoUnicoSelecionado && (
        <ReclassificarDialog
          open={reclassificarAberto}
          onClose={() => setReclassificarAberto(false)}
          onConfirmar={executarReclassificar}
          tipoLancamentos={tipoUnicoSelecionado}
          count={selecionados.length}
        />
      )}

      {(() => {
        // Calcula derivados pro EfetivarDialog (só usados quando dialog está aberto)
        const aEfetivar = selecionados.filter((l) => {
          if (l.tipo === "transferencia") return false;
          if (l.tipo === "despesa") return !l.pago;
          if (l.tipo === "receita") return !l.recebido;
          return false;
        });
        const valorTotal = aEfetivar.reduce((s, l) => s + l.valor, 0);
        const contaIds = new Set(
          aEfetivar.map((l) => (l.tipo !== "transferencia" ? l.contaId : undefined)).filter(Boolean) as string[]
        );
        const contaSugeridaId = contaIds.size === 1 ? (Array.from(contaIds)[0] as Id<"contas">) : undefined;
        const tipos = new Set(aEfetivar.map((l) => l.tipo));
        const tipoEfetivar: "despesa" | "receita" | "misto" =
          tipos.size === 1
            ? tipos.has("despesa") ? "despesa" : "receita"
            : "misto";

        return (
          <EfetivarDialog
            open={efetivarDialogAberto}
            onClose={() => setEfetivarDialogAberto(false)}
            onConfirm={confirmarEfetivacaoBulk}
            quantidade={aEfetivar.length}
            valorTotal={valorTotal}
            tipo={tipoEfetivar}
            contaSugeridaId={contaSugeridaId}
          />
        );
      })()}

      {/* Pagar fatura inteira do cartão */}
      <EfetivarDialog
        open={!!faturaPagar}
        onClose={() => setFaturaPagar(null)}
        onConfirm={confirmarPagamentoFatura}
        quantidade={faturaPagar?.qtdPendente ?? 0}
        valorTotal={faturaPagar?.totalPendente}
        tipo="despesa"
        contaSugeridaId={faturaPagar?.contaSugeridaId}
      />

      {/* Diagnóstico de lançamentos + Histórico de exclusões */}
      <HistoricoExclusoesDialog
        open={historicoAberto}
        onClose={() => setHistoricoAberto(false)}
      />

      <ConfirmDialog
        open={confirmarExclusaoBulkAberto}
        onClose={() => setConfirmarExclusaoBulkAberto(false)}
        onConfirm={() => { executarExclusaoBulk(); }}
        title={`Excluir ${selecao.size} ${selecao.size === 1 ? "lançamento" : "lançamentos"}`}
        description={`Esta ação não pode ser desfeita. ${
          selecionados.some((l) => l.tipo !== "transferencia")
            ? "Pagamentos/recebimentos vinculados também serão removidos."
            : ""
        }`}
        confirmLabel="Excluir"
        loading={processando}
      />

      <ExcluirLancamentoDialog
        open={!!confirmarExclusaoUmAberto}
        onClose={() => setConfirmarExclusaoUmAberto(null)}
        onConfirm={async (escopo) => {
          if (confirmarExclusaoUmAberto) {
            await confirmarExclusaoIndividual(confirmarExclusaoUmAberto, escopo);
          }
        }}
        tipo={confirmarExclusaoUmAberto?.tipo ?? "despesa"}
        tipoOriginal={
          confirmarExclusaoUmAberto && confirmarExclusaoUmAberto.tipo !== "transferencia"
            ? confirmarExclusaoUmAberto.tipoOriginal
            : undefined
        }
        mesLabel={monthLabelLong(
          confirmarExclusaoUmAberto && confirmarExclusaoUmAberto.tipo !== "transferencia"
            ? confirmarExclusaoUmAberto._projectedMes
            : mes
        )}
        descricao={confirmarExclusaoUmAberto?.descricao}
      />
    </div>
  );
}
