"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Search,
  Clock,
  BookOpen,
  Shield,
  TrendingDown,
  PieChart,
  TrendingUp,
  Scale,
  Coffee,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import {
  CONTEUDOS_EDUCACIONAIS,
  CATEGORIAS_CONTEUDO,
  type CategoriaConteudo,
  type ConteudoEducacional,
} from "@/lib/educacao/conteudos";
import { listarTermos } from "@/lib/educacao/termos";
import { DicaDoDia } from "@/components/educacao/DicaDoDia";
import { Input } from "@/components/ui/input";

const ICONES: Record<string, LucideIcon> = {
  Shield,
  TrendingDown,
  PieChart,
  TrendingUp,
  Scale,
  Coffee,
  BookOpen,
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AprenderPage() {
  const [busca, setBusca] = React.useState("");
  const [categoria, setCategoria] = React.useState<CategoriaConteudo | "Todas">("Todas");

  const conteudosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return CONTEUDOS_EDUCACIONAIS.filter((c) => {
      if (categoria !== "Todas" && c.categoria !== categoria) return false;
      if (!q) return true;
      return (
        c.titulo.toLowerCase().includes(q) ||
        c.resumo.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q)
      );
    });
  }, [busca, categoria]);

  const termos = React.useMemo(() => listarTermos(), []);

  const termosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return termos;
    return termos.filter(
      ({ termo }) =>
        termo.nome.toLowerCase().includes(q) ||
        termo.definicao.toLowerCase().includes(q),
    );
  }, [termos, busca]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.header variants={item} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
          <GraduationCap size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-extrabold">Aprender</h1>
          <p className="text-slate-500 text-sm">
            Educacao financeira em pequenas doses
          </p>
        </div>
      </motion.header>

      {/* Dica do dia */}
      <motion.div variants={item}>
        <DicaDoDia />
      </motion.div>

      {/* Busca */}
      <motion.div variants={item} className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar artigos ou termos..."
          className="pl-9"
        />
      </motion.div>

      {/* Filtros de categoria */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        <CategoriaChip
          label="Todas"
          ativa={categoria === "Todas"}
          onClick={() => setCategoria("Todas")}
        />
        {CATEGORIAS_CONTEUDO.map((cat) => (
          <CategoriaChip
            key={cat}
            label={cat}
            ativa={categoria === cat}
            onClick={() => setCategoria(cat)}
          />
        ))}
      </motion.div>

      {/* Layout: artigos (esquerda) + termos (direita em desktop) */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* Artigos */}
        <section>
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            Artigos
            <span className="text-xs text-slate-400 font-normal ml-1">
              ({conteudosFiltrados.length})
            </span>
          </h2>

          {conteudosFiltrados.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-8 text-center text-sm text-slate-400">
              Nenhum artigo encontrado.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {conteudosFiltrados.map((c) => (
                <ConteudoCard key={c.id} conteudo={c} />
              ))}
            </div>
          )}
        </section>

        {/* Termos */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl bg-white border p-4 shadow-sm">
            <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
              <HelpCircle size={16} className="text-indigo-500" />
              Glossario
              <span className="text-xs text-slate-400 font-normal ml-1">
                ({termosFiltrados.length})
              </span>
            </h2>

            {termosFiltrados.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Nenhum termo encontrado.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {termosFiltrados.map(({ slug, termo }) => (
                  <li key={slug}>
                    {termo.saibaMais ? (
                      <Link
                        href={termo.saibaMais}
                        className="block px-2.5 py-1.5 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium text-slate-800">
                          {termo.nome}
                        </span>
                        <span className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {termo.definicao}
                        </span>
                      </Link>
                    ) : (
                      <div
                        className="block px-2.5 py-1.5 rounded-lg"
                        title={termo.definicao}
                      >
                        <span className="font-medium text-slate-800 text-sm">
                          {termo.nome}
                        </span>
                        <span className="text-xs text-slate-500 line-clamp-2 mt-0.5 block">
                          {termo.definicao}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </motion.div>
    </motion.div>
  );
}

function CategoriaChip({
  label,
  ativa,
  onClick,
}: {
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors " +
        (ativa
          ? "bg-primary text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")
      }
      aria-pressed={ativa}
    >
      {label}
    </button>
  );
}

function ConteudoCard({ conteudo }: { conteudo: ConteudoEducacional }) {
  const Icon = ICONES[conteudo.icone] ?? BookOpen;
  return (
    <Link
      href={`/aprender/${conteudo.id}`}
      className="group block rounded-2xl bg-white border p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"
          style={{ background: conteudo.cor }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">
            <span>{conteudo.categoria}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock size={10} /> {conteudo.tempoLeituraMinutos} min
            </span>
          </div>
          <h3 className="font-display font-bold text-slate-800 leading-tight mb-1.5 group-hover:text-primary transition-colors">
            {conteudo.titulo}
          </h3>
          <p className="text-xs text-slate-500 leading-snug line-clamp-3">
            {conteudo.resumo}
          </p>
        </div>
      </div>
    </Link>
  );
}
