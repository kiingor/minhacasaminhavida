"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Maximize2, Minimize2, Search, Tag, X, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonColumn } from "@/components/tarefas/PersonColumn";
import { Skeleton } from "@/components/ui/skeleton";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/logo";
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

  const categorias = useMemo(() => {
    if (!catalogo) return [];
    const set = new Set(catalogo.map((t) => t.categoria));
    return Array.from(set).sort();
  }, [catalogo]);

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  useEffect(() => {
    const now = new Date();
    const msAteMeiaNoite = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(() => setData(todayISO()), msAteMeiaNoite);
    return () => clearTimeout(t);
  }, [data]);

  const hasActiveFilters = busca !== "" || categoriaFiltro !== "";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cream-100">

      <header className="shrink-0 mx-3 mt-3 rounded-3xl px-4 md:px-6 py-3 flex items-center gap-4 bg-white border border-cream-200 shadow-soft">
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Logo size={36} />
          <span className="font-display font-bold text-base text-ink-900">Minha Casa</span>
        </div>

        <div className="hidden sm:block h-6 w-px bg-cream-200" />

        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-cream-50 border border-cream-200 px-1 py-1">
            <button
              onClick={() => setData(shiftDate(data, -1))}
              className="w-8 h-8 rounded-full hover:bg-white text-ink-500 flex items-center justify-center transition-colors"
              aria-label="Dia anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 flex items-center gap-1.5 text-sm font-semibold min-w-[120px] justify-center text-ink-900">
              <CalendarDays size={13} className="text-coral-500" />
              {dateLabel(data)}
            </div>
            <button
              onClick={() => setData(shiftDate(data, 1))}
              className="w-8 h-8 rounded-full hover:bg-white text-ink-500 flex items-center justify-center transition-colors"
              aria-label="Próximo dia"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`shrink-0 flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all ${
            showFilters || hasActiveFilters ? "bg-ink-900 text-white" : "bg-cream-50 hover:bg-cream-100 text-ink-700"
          }`}
          title="Buscar e filtrar tarefas"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-coral-400" />}
        </button>

        <IconButton
          onClick={toggleFullscreen}
          variant="default"
          aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </IconButton>
      </header>

      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="shrink-0 mx-3 mt-2 rounded-3xl bg-white border border-cream-200 shadow-soft px-4 md:px-6 py-3"
        >
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Buscar tarefa por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-10 pl-10 pr-8 rounded-full border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:ring-4 focus:ring-coral-100 focus:border-coral-400"
                autoFocus
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-ink-400 hover:text-ink-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Tag size={14} className="text-ink-400 shrink-0" />
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setCategoriaFiltro("")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    !categoriaFiltro ? "bg-ink-900 text-white" : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                  }`}
                >
                  Todas
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaFiltro(categoriaFiltro === cat ? "" : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      categoriaFiltro === cat ? "bg-ink-900 text-white" : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setBusca(""); setCategoriaFiltro(""); }}
                className="text-xs text-ink-400 hover:text-coral-600 transition-colors font-semibold"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </motion.div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {pessoas === undefined ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : ativas.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-soft flex items-center justify-center text-ink-400 mb-4">
              <Users size={28} />
            </div>
            <p className="font-display font-bold text-xl text-ink-900">Nenhuma pessoa cadastrada</p>
            <p className="text-ink-400 mt-1 text-sm">Cadastre pessoas em <strong className="text-ink-700">Pessoas</strong> para começar.</p>
          </motion.div>
        ) : (
          <div
            className="grid gap-4 h-full"
            style={{ gridTemplateColumns: `repeat(${ativas.length}, minmax(0, 1fr))` }}
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

      {ativas.length > 0 && (
        <footer className="shrink-0 mx-3 mb-3 mt-2 rounded-3xl bg-white border border-cream-200 px-6 py-2.5 flex items-center justify-between text-xs text-ink-400">
          <span className="font-semibold">{ativas.length} pessoa{ativas.length > 1 ? "s" : ""}</span>
          <span>Minha Casa Minha Vida — atualização em tempo real</span>
        </footer>
      )}
    </div>
  );
}
