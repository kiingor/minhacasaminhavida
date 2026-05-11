"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type FiltroTipo = "todos" | "despesa" | "receita" | "transferencia";
export type FiltroStatus = "todos" | "efetivado" | "pendente";

interface ContaOpcao {
  _id: string;
  nome: string;
}
interface CategoriaOpcao {
  _id: string;
  nome: string;
  tipo: "despesa" | "receita";
}
interface PagadorOpcao {
  _id: string;
  nome: string;
  apelido?: string;
}

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
  { value: "todos", label: "Todos" },
  { value: "despesa", label: "Despesas" },
  { value: "receita", label: "Receitas" },
  { value: "transferencia", label: "Transf." },
];

const STATUS_PILLS: Array<{ value: FiltroStatus; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "efetivado", label: "Efetivados" },
];

export function FiltrosLancamentos(props: Props) {
  const {
    busca,
    onBuscaChange,
    filtroTipo,
    onFiltroTipoChange,
    filtroContaId,
    onFiltroContaIdChange,
    filtroCategoriaId,
    onFiltroCategoriaIdChange,
    filtroPagadorId,
    onFiltroPagadorIdChange,
    filtroStatus,
    onFiltroStatusChange,
    contas,
    categorias,
    pagadores,
  } = props;

  const [drawerAberto, setDrawerAberto] = useState(false);

  const filtrosAvancadosAtivos =
    (filtroContaId ? 1 : 0) +
    (filtroCategoriaId ? 1 : 0) +
    (filtroPagadorId ? 1 : 0) +
    (filtroStatus !== "todos" ? 1 : 0);

  const limpar = () => {
    onFiltroContaIdChange("");
    onFiltroCategoriaIdChange("");
    onFiltroPagadorIdChange("");
    onFiltroStatusChange("todos");
  };

  const categoriasFiltradas = categorias.filter((c) => {
    if (filtroTipo === "despesa") return c.tipo === "despesa";
    if (filtroTipo === "receita") return c.tipo === "receita";
    return true;
  });

  return (
    <>
      <div className="space-y-2">
        {/* Tipo pills */}
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
          {TIPO_PILLS.map((p) => (
            <button
              key={p.value}
              onClick={() => onFiltroTipoChange(p.value)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
                filtroTipo === p.value
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Busca + filtros avancados */}
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1 min-w-0">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Buscar por descrição, categoria, conta..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label="Buscar lançamentos"
            />
          </div>

          {/* Mobile: botao para abrir drawer */}
          <button
            onClick={() => setDrawerAberto(true)}
            className="md:hidden inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 relative"
            aria-label="Abrir filtros avançados"
          >
            <SlidersHorizontal size={14} />
            Filtros
            {filtrosAvancadosAtivos > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                {filtrosAvancadosAtivos}
              </span>
            )}
          </button>
        </div>

        {/* Filtros inline desktop */}
        <div className="hidden md:flex flex-wrap gap-2">
          <select
            value={filtroContaId}
            onChange={(e) => onFiltroContaIdChange(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Filtrar por conta"
          >
            <option value="">Todas as contas</option>
            {contas.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroCategoriaId}
            onChange={(e) => onFiltroCategoriaIdChange(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categoriasFiltradas.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroPagadorId}
            onChange={(e) => onFiltroPagadorIdChange(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Filtrar por pagador"
          >
            <option value="">Todos os pagadores</option>
            {pagadores.map((p) => (
              <option key={p._id} value={p._id}>
                {p.apelido ?? p.nome}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            {STATUS_PILLS.map((s) => (
              <button
                key={s.value}
                onClick={() => onFiltroStatusChange(s.value)}
                className={`px-2.5 h-9 rounded-lg border text-xs font-medium transition-colors ${
                  filtroStatus === s.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {filtrosAvancadosAtivos > 0 && (
            <button
              onClick={limpar}
              className="px-2.5 h-9 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center gap-1"
              aria-label="Limpar filtros"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Drawer mobile */}
      <AnimatePresence>
        {drawerAberto && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDrawerAberto(false)}
            />
            <motion.div
              className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base">Filtros</h3>
                <button
                  onClick={() => setDrawerAberto(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100"
                  aria-label="Fechar filtros"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Conta</label>
                  <select
                    value={filtroContaId}
                    onChange={(e) => onFiltroContaIdChange(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
                  >
                    <option value="">Todas as contas</option>
                    {contas.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Categoria</label>
                  <select
                    value={filtroCategoriaId}
                    onChange={(e) => onFiltroCategoriaIdChange(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasFiltradas.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Pagador</label>
                  <select
                    value={filtroPagadorId}
                    onChange={(e) => onFiltroPagadorIdChange(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
                  >
                    <option value="">Todos os pagadores</option>
                    {pagadores.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.apelido ?? p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                  <div className="flex gap-1.5">
                    {STATUS_PILLS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => onFiltroStatusChange(s.value)}
                        className={`flex-1 px-3 h-10 rounded-lg border text-xs font-medium transition-colors ${
                          filtroStatus === s.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 mt-4 border-t">
                <button
                  onClick={limpar}
                  className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setDrawerAberto(false)}
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium"
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
