"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FiltroTipo = "todos" | "despesa" | "receita" | "transferencia";
export type FiltroStatus = "todos" | "efetivado" | "pendente";

interface ContaOpcao { _id: string; nome: string }
interface CategoriaOpcao { _id: string; nome: string; tipo: "despesa" | "receita" }
interface PagadorOpcao { _id: string; nome: string; apelido?: string }

interface Props {
  busca: string;
  onBuscaChange: (v: string) => void;
  filtroTipo: FiltroTipo;
  onFiltroTipoChange: (v: FiltroTipo) => void;
  filtroContaId: string;
  onFiltroContaIdChange: (v: string) => void;
  filtroCategoriaId: string;
  onFiltroCategoriaIdChange: (v: string) => void;
  filtroPagadorId: string;
  onFiltroPagadorIdChange: (v: string) => void;
  filtroStatus: FiltroStatus;
  onFiltroStatusChange: (v: FiltroStatus) => void;
  contas: ContaOpcao[];
  categorias: CategoriaOpcao[];
  pagadores: PagadorOpcao[];
}

const TIPO_PILLS: Array<{ value: FiltroTipo; label: string }> = [
  { value: "todos", label: "Tudo" },
  { value: "despesa", label: "Saídas" },
  { value: "receita", label: "Entradas" },
  { value: "transferencia", label: "Transf." },
];

const STATUS_PILLS: Array<{ value: FiltroStatus; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "efetivado", label: "Efetivados" },
];

export function FiltrosLancamentos(props: Props) {
  const {
    busca, onBuscaChange,
    filtroTipo, onFiltroTipoChange,
    filtroContaId, onFiltroContaIdChange,
    filtroCategoriaId, onFiltroCategoriaIdChange,
    filtroPagadorId, onFiltroPagadorIdChange,
    filtroStatus, onFiltroStatusChange,
    contas, categorias, pagadores,
  } = props;

  const [drawerAberto, setDrawerAberto] = useState(false);

  const avancadosAtivos =
    (filtroContaId ? 1 : 0) +
    (filtroCategoriaId ? 1 : 0) +
    (filtroPagadorId ? 1 : 0);

  const limpar = () => {
    onFiltroContaIdChange("");
    onFiltroCategoriaIdChange("");
    onFiltroPagadorIdChange("");
  };

  const categoriasFiltradas = categorias.filter((c) => {
    if (filtroTipo === "despesa") return c.tipo === "despesa";
    if (filtroTipo === "receita") return c.tipo === "receita";
    return true;
  });

  const contaSelecionada = contas.find((c) => c._id === filtroContaId);
  const categoriaSelecionada = categorias.find((c) => c._id === filtroCategoriaId);
  const pagadorSelecionado = pagadores.find((p) => p._id === filtroPagadorId);

  return (
    <>
      <div className="space-y-3">
        {/* Linha 1: busca grande + botão filtros */}
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Buscar por descrição, categoria, conta..."
              className="w-full h-11 pl-11 pr-4 rounded-full border border-cream-200 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-4 focus:ring-coral-100 focus:border-coral-400 transition-all"
              aria-label="Buscar lançamentos"
            />
          </div>

          <button
            onClick={() => setDrawerAberto(true)}
            className={cn(
              "inline-flex items-center gap-2 px-4 h-11 rounded-full border text-sm font-medium transition-colors relative shrink-0",
              avancadosAtivos > 0
                ? "bg-ink-900 text-white border-ink-900 hover:bg-ink-800"
                : "bg-white border-cream-200 text-ink-700 hover:bg-cream-50",
            )}
            aria-label="Abrir filtros avançados"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {avancadosAtivos > 0 && (
              <span className="bg-coral-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center">
                {avancadosAtivos}
              </span>
            )}
          </button>
        </div>

        {/* Linha 2: Tipo + Status — segmented controls homogêneos */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Tipo" options={TIPO_PILLS} value={filtroTipo} onChange={onFiltroTipoChange} />
          <Segmented label="Status" options={STATUS_PILLS} value={filtroStatus} onChange={onFiltroStatusChange} />
        </div>

        {/* Linha 3: Chips de filtros avançados ativos */}
        {avancadosAtivos > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {contaSelecionada && (
              <ChipFiltro label="Conta" value={contaSelecionada.nome} onRemove={() => onFiltroContaIdChange("")} />
            )}
            {categoriaSelecionada && (
              <ChipFiltro label="Categoria" value={categoriaSelecionada.nome} onRemove={() => onFiltroCategoriaIdChange("")} />
            )}
            {pagadorSelecionado && (
              <ChipFiltro
                label="Pagador"
                value={pagadorSelecionado.apelido ?? pagadorSelecionado.nome}
                onRemove={() => onFiltroPagadorIdChange("")}
              />
            )}
            <button
              onClick={limpar}
              className="text-[11px] text-ink-400 hover:text-coral-600 font-medium inline-flex items-center gap-1 ml-1"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Drawer / bottom sheet — único caminho pros avançados (mobile e desktop) */}
      <AnimatePresence>
        {drawerAberto && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setDrawerAberto(false)} />
            <motion.div
              className="relative w-full md:max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-white p-6"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg text-ink-900">Filtros avançados</h3>
                <button
                  onClick={() => setDrawerAberto(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-cream-100"
                  aria-label="Fechar filtros"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <SelectField label="Conta" value={filtroContaId} onChange={onFiltroContaIdChange}>
                  <option value="">Todas as contas</option>
                  {contas.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                </SelectField>

                <SelectField label="Categoria" value={filtroCategoriaId} onChange={onFiltroCategoriaIdChange}>
                  <option value="">Todas as categorias</option>
                  {categoriasFiltradas.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                </SelectField>

                <SelectField label="Pagador" value={filtroPagadorId} onChange={onFiltroPagadorIdChange}>
                  <option value="">Todos os pagadores</option>
                  {pagadores.map((p) => <option key={p._id} value={p._id}>{p.apelido ?? p.nome}</option>)}
                </SelectField>
              </div>

              <div className="flex gap-2 pt-5 mt-5 border-t border-cream-200">
                <button
                  onClick={() => { limpar(); }}
                  className="flex-1 h-11 rounded-full border border-cream-200 text-sm font-medium text-ink-700 hover:bg-cream-50"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setDrawerAberto(false)}
                  className="flex-1 h-11 rounded-full bg-coral-500 text-white text-sm font-semibold hover:bg-coral-600 shadow-pop"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Segmented<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-cream-100 rounded-full p-1">
      <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold px-2 hidden sm:inline">{label}</span>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
              active
                ? "bg-ink-900 text-white shadow-soft"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipFiltro({
  label, value, onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1 h-8 rounded-full bg-ink-900 text-white text-xs font-medium">
      <span className="text-white/60 text-[10px] uppercase tracking-[0.08em] font-semibold">{label}</span>
      <span className="truncate max-w-[140px]">{value}</span>
      <button
        onClick={onRemove}
        className="w-6 h-6 rounded-full hover:bg-white/15 inline-flex items-center justify-center"
        aria-label={`Remover filtro ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function SelectField({
  label, value, onChange, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-2xl border border-cream-200 px-4 text-sm bg-white text-ink-900 focus:outline-none focus:ring-4 focus:ring-coral-100 focus:border-coral-400"
      >
        {children}
      </select>
    </div>
  );
}
