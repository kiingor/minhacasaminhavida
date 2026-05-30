"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Home, Wallet, ListChecks, Users, Settings, ArrowLeftRight,
  ArrowDownRight, ArrowUpRight, CreditCard, Tag, Receipt, Landmark, Target,
  PieChart, FileBarChart, CalendarClock, Bot, Bell, HandCoins, BookOpen,
  CalendarDays, ClipboardList, UserCog, Briefcase, MessageSquare, CornerDownLeft,
  type LucideIcon,
} from "lucide-react";

interface Destino {
  label: string;
  href: string;
  descricao: string;
  grupo: string;
  icon: LucideIcon;
  keywords?: string;
}

const DESTINOS_FAMILIA: Destino[] = [
  // Geral
  { label: "Início", href: "/", descricao: "Painel principal da família", grupo: "Geral", icon: Home, keywords: "dashboard home painel" },
  { label: "Pessoas", href: "/pessoas", descricao: "Membros da família e gamificação", grupo: "Geral", icon: Users, keywords: "membros perfis" },
  { label: "Aprender", href: "/aprender", descricao: "Conteúdos e educação financeira", grupo: "Geral", icon: BookOpen, keywords: "educacao cursos" },
  // Finanças
  { label: "Finanças", href: "/financeiro", descricao: "Dashboard financeiro", grupo: "Finanças", icon: Wallet, keywords: "dashboard resumo" },
  { label: "Lançamentos", href: "/financeiro/lancamentos", descricao: "Despesas, receitas e transferências", grupo: "Finanças", icon: ArrowLeftRight, keywords: "movimentacoes extrato" },
  { label: "Despesas", href: "/financeiro/despesas", descricao: "Gastos e contas a pagar", grupo: "Finanças", icon: ArrowDownRight, keywords: "gastos saidas pagar" },
  { label: "Receitas", href: "/financeiro/receitas", descricao: "Entradas e recebimentos", grupo: "Finanças", icon: ArrowUpRight, keywords: "entradas ganhos salario" },
  { label: "Transferências", href: "/financeiro/transferencias", descricao: "Mover dinheiro entre contas", grupo: "Finanças", icon: ArrowLeftRight, keywords: "transferir" },
  { label: "Contas", href: "/financeiro/contas", descricao: "Saldos das contas bancárias", grupo: "Finanças", icon: Landmark, keywords: "banco saldo conta corrente poupanca" },
  { label: "Cartões", href: "/financeiro/cartoes", descricao: "Cartões de crédito e faturas", grupo: "Finanças", icon: CreditCard, keywords: "cartao credito fatura" },
  { label: "Categorias", href: "/financeiro/categorias", descricao: "Categorias de despesas e receitas", grupo: "Finanças", icon: Tag, keywords: "categoria" },
  { label: "Pagadores", href: "/financeiro/pagadores", descricao: "Quem paga as receitas", grupo: "Finanças", icon: HandCoins, keywords: "pagador fonte" },
  { label: "Comprovantes", href: "/financeiro/comprovantes", descricao: "Recibos e notas por categoria", grupo: "Finanças", icon: Receipt, keywords: "recibo nota comprovante" },
  { label: "Dívidas", href: "/financeiro/dividas", descricao: "Financiamentos e empréstimos", grupo: "Finanças", icon: FileBarChart, keywords: "divida emprestimo financiamento" },
  { label: "Metas", href: "/financeiro/metas", descricao: "Objetivos de poupança", grupo: "Finanças", icon: Target, keywords: "meta objetivo poupanca reserva" },
  { label: "Orçamento", href: "/financeiro/orcamento", descricao: "Limites por categoria", grupo: "Finanças", icon: PieChart, keywords: "orcamento limite budget" },
  { label: "Relatórios", href: "/financeiro/relatorios", descricao: "Análises e gráficos", grupo: "Finanças", icon: FileBarChart, keywords: "relatorio grafico analise" },
  { label: "Planejamento", href: "/financeiro/planejamento", descricao: "Projeção financeira", grupo: "Finanças", icon: PieChart, keywords: "planejar projecao" },
  { label: "Money Date", href: "/financeiro/money-date", descricao: "Encontro financeiro do casal", grupo: "Finanças", icon: CalendarClock, keywords: "money date casal" },
  { label: "Assistente IA", href: "/financeiro/agente", descricao: "Converse e lance pela IA", grupo: "Finanças", icon: Bot, keywords: "ia agente chat assistente" },
  // Tarefas
  { label: "Tarefas", href: "/tarefas", descricao: "Tarefas da casa", grupo: "Tarefas", icon: ListChecks, keywords: "tarefa afazeres" },
  { label: "Tarefas de hoje", href: "/tarefas/hoje", descricao: "O que fazer hoje", grupo: "Tarefas", icon: CalendarDays, keywords: "hoje" },
  { label: "Agenda de tarefas", href: "/tarefas/agenda", descricao: "Calendário de tarefas", grupo: "Tarefas", icon: CalendarClock, keywords: "agenda calendario" },
  { label: "Catálogo de tarefas", href: "/tarefas/catalogo", descricao: "Modelos de tarefas", grupo: "Tarefas", icon: ClipboardList, keywords: "catalogo modelo" },
  // Sistema
  { label: "Configurações", href: "/configuracoes", descricao: "Preferências do app", grupo: "Sistema", icon: Settings, keywords: "config ajustes preferencias" },
  { label: "Modo Casal", href: "/configuracoes/casal", descricao: "Convidar parceiro(a)", grupo: "Sistema", icon: UserCog, keywords: "casal parceiro convite usuario" },
  { label: "Notificações", href: "/notificacoes", descricao: "Avisos e alertas", grupo: "Sistema", icon: Bell, keywords: "notificacao aviso alerta" },
  { label: "Preferências de notificação", href: "/notificacoes/preferencias", descricao: "O que você quer receber", grupo: "Sistema", icon: Bell, keywords: "preferencia notificacao" },
];

const DESTINOS_CONSULTOR: Destino[] = [
  { label: "Clientes", href: "/consultor", descricao: "Famílias que você acompanha", grupo: "Consultor", icon: Briefcase, keywords: "clientes familias" },
  { label: "Comentários", href: "/consultor/comentarios", descricao: "Anotações por cliente", grupo: "Consultor", icon: MessageSquare, keywords: "comentario nota" },
  { label: "Agenda", href: "/consultor/agenda", descricao: "Reuniões agendadas", grupo: "Consultor", icon: CalendarClock, keywords: "agenda reuniao" },
  { label: "Configurações", href: "/configuracoes", descricao: "Preferências do app", grupo: "Sistema", icon: Settings, keywords: "config ajustes" },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function CommandPalette({ isConsultor = false }: { isConsultor?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const destinos = isConsultor ? DESTINOS_CONSULTOR : DESTINOS_FAMILIA;

  const filtrados = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return destinos;
    return destinos.filter((d) =>
      norm(`${d.label} ${d.descricao} ${d.grupo} ${d.keywords ?? ""}`).includes(q)
    );
  }, [query, destinos]);

  // Abre via Ctrl/Cmd+K (global) e via evento disparado pelo botão de busca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpenEvent);
    };
  }, []);

  // Reseta ao abrir e foca o input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { setSel(0); }, [query]);

  function irPara(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo = filtrados[sel];
      if (alvo) irPara(alvo.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Mantém o item selecionado visível.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  // Agrupa preservando a ordem e o índice flat (pra navegação por teclado).
  const grupos = useMemo(() => {
    const map = new Map<string, Array<{ d: Destino; idx: number }>>();
    filtrados.forEach((d, idx) => {
      if (!map.has(d.grupo)) map.set(d.grupo, []);
      map.get(d.grupo)!.push({ d, idx });
    });
    return Array.from(map.entries());
  }, [filtrados]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Busca rápida"
            className="relative w-full max-w-xl rounded-3xl bg-white shadow-card border border-cream-200 overflow-hidden"
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onKeyDown={onKeyDown}
          >
            {/* Campo de busca */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-cream-100">
              <Search size={18} className="text-ink-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar páginas e seções do sistema..."
                className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none"
                aria-label="Buscar"
              />
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-ink-400 hover:bg-cream-100 shrink-0"
                aria-label="Fechar busca"
              >
                <X size={15} />
              </button>
            </div>

            {/* Resultados */}
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
              {filtrados.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-ink-400">
                  Nada encontrado para <b className="text-ink-600">“{query}”</b>
                </div>
              ) : (
                grupos.map(([grupo, itens]) => (
                  <div key={grupo} className="px-2">
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
                      {grupo}
                    </div>
                    {itens.map(({ d, idx }) => {
                      const Icon = d.icon;
                      const ativo = idx === sel;
                      return (
                        <button
                          key={d.href}
                          data-idx={idx}
                          onClick={() => irPara(d.href)}
                          onMouseEnter={() => setSel(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            ativo ? "bg-coral-500 text-white" : "hover:bg-cream-50 text-ink-900"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              ativo ? "bg-white/20 text-white" : "bg-cream-100 text-ink-600"
                            }`}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{d.label}</span>
                            <span className={`block text-xs truncate ${ativo ? "text-white/80" : "text-ink-400"}`}>
                              {d.descricao}
                            </span>
                          </span>
                          {ativo && <CornerDownLeft size={14} className="text-white/80 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Rodapé com atalhos */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-cream-100 text-[11px] text-ink-400">
              <div className="flex items-center gap-3">
                <span><kbd className="font-sans">↑↓</kbd> navegar</span>
                <span><kbd className="font-sans">↵</kbd> abrir</span>
                <span><kbd className="font-sans">esc</kbd> fechar</span>
              </div>
              <span className="font-mono">Ctrl + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Botão que dispara a abertura do palette (usado na top bar). */
export function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      aria-label="Buscar (Ctrl+K)"
      title="Buscar (Ctrl+K)"
      className={className}
    >
      <Search size={16} />
    </button>
  );
}
