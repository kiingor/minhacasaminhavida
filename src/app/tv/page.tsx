"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Maximize2, Minimize2, Home, Search, Tag, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonColumn } from "@/components/tarefas/PersonColumn";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, todayISO } from "@/lib/formatters";

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Hoje";
  if (iso === shiftDate(today, -1)) return "Ontem";
  if (iso === shiftDate(today, 1)) return "Amanhã";
  return formatDate(iso);
}

export default function TVPage() {
  const token = useSessionToken();
  const [data, setData] = useState(todayISO());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const catalogo = useQuery(api.tarefas.tarefasCatalogo.list, token ? { sessionToken: token } : "skip");
  const ativas = pessoas?.filter((p) => p.ativo) ?? [];

  // Extrair categorias únicas do catálogo
  const categorias = useMemo(() => {
    if (!catalogo) return [];
    const set = new Set(catalogo.map((t) => t.categoria));
    return Array.from(set).sort();
  }, [catalogo]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Atualiza data à meia-noite automaticamente
  useEffect(() => {
    const now = new Date();
    const msAteMeiaNoite =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(() => setData(todayISO()), msAteMeiaNoite);
    return () => clearTimeout(t);
  }, [data]);

  const hasActiveFilters = busca !== "" || categoriaFiltro !== "";

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50/30 to-purple-50/20 -z-10" />

      {/* Header - Liquid Glass */}
      <header className="shrink-0 relative z-10 mx-3 mt-3 rounded-2xl px-4 md:px-6 py-3 flex items-center gap-4 bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
        {/* Logo */}
        <div className="hidden sm:flex items-center gap-2 font-display font-extrabold text-lg shrink-0 text-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-sm">
            <Home size={16} className="text-white" />
          </div>
          <span>Minha Casa</span>
        </div>

        <div className="hidden sm:block h-5 w-px bg-slate-300/40" />

        {/* Seletor de data */}
        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-sm px-1 py-1">
            <button
              onClick={() => setData(shiftDate(data, -1))}
              className="p-1.5 rounded-lg hover:bg-white/60 text-slate-600 transition-colors"
              aria-label="Dia anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 flex items-center gap-1.5 text-sm font-semibold min-w-[120px] justify-center text-slate-800">
              <CalendarDays size={13} className="text-primary/60" />
              {dateLabel(data)}
            </div>
            <button
              onClick={() => setData(shiftDate(data, 1))}
              className="p-1.5 rounded-lg hover:bg-white/60 text-slate-600 transition-colors"
              aria-label="Próximo dia"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Botão filtros */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            showFilters || hasActiveFilters
              ? "bg-primary/90 border-primary/40 text-white shadow-md shadow-primary/20"
              : "bg-white/50 hover:bg-white/70 border-white/60 text-slate-600 backdrop-blur-sm"
          }`}
          title="Buscar e filtrar tarefas"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
          )}
        </button>

        {/* Botão fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 hover:bg-white/70 backdrop-blur-sm border border-white/60 text-sm font-medium text-slate-600 transition-all"
          title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span className="hidden sm:inline">{isFullscreen ? "Sair" : "Tela cheia"}</span>
        </button>
      </header>

      {/* Barra de filtros - Liquid Glass */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="shrink-0 mx-3 mt-2 rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.04)] px-4 md:px-6 py-3"
        >
          <div className="flex flex-wrap gap-3 items-center">
            {/* Input de busca */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar tarefa por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtro de categoria */}
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400 shrink-0" />
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setCategoriaFiltro("")}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    !categoriaFiltro
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Todas
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaFiltro(categoriaFiltro === cat ? "" : cat)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      categoriaFiltro === cat
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                onClick={() => { setBusca(""); setCategoriaFiltro(""); }}
                className="text-xs text-slate-400 hover:text-danger transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {pessoas === undefined ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
          >
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : ativas.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-4">👥</div>
            <p className="font-display font-bold text-xl text-slate-700">Nenhuma pessoa cadastrada</p>
            <p className="text-slate-500 mt-1 text-sm">Cadastre pessoas em <strong>Pessoas</strong> para começar.</p>
          </motion.div>
        ) : (
          <div
            className="grid gap-4 h-full"
            style={{
              gridTemplateColumns: `repeat(${ativas.length}, minmax(0, 1fr))`,
            }}
          >
            {ativas.map((pessoa) => (
              <PersonColumn
                key={pessoa._id}
                pessoa={pessoa}
                data={data}
                tvMode
                filterBusca={busca}
                filterCategoria={categoriaFiltro}
              />
            ))}
          </div>
        )}
      </main>

      {/* Rodapé - Liquid Glass */}
      {ativas.length > 0 && (
        <footer className="shrink-0 mx-3 mb-3 mt-2 rounded-xl bg-white/40 backdrop-blur-xl border border-white/50 px-6 py-2 flex items-center justify-between text-xs text-slate-500">
          <span>{ativas.length} pessoa{ativas.length > 1 ? "s" : ""}</span>
          <span>Minha Casa Minha Vida — atualização em tempo real</span>
        </footer>
      )}
    </div>
  );
}
