"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Share2,
  BookOpen,
  Shield,
  TrendingDown,
  PieChart,
  TrendingUp,
  Scale,
  Coffee,
  type LucideIcon,
} from "lucide-react";
import {
  CONTEUDOS_EDUCACIONAIS,
  getConteudo,
} from "@/lib/educacao/conteudos";
import { MarkdownArticle } from "@/components/educacao/MarkdownArticle";
import { Button } from "@/components/ui/button";

const ICONES: Record<string, LucideIcon> = {
  Shield,
  TrendingDown,
  PieChart,
  TrendingUp,
  Scale,
  Coffee,
  BookOpen,
};

export default function ArtigoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const conteudo = React.useMemo(() => getConteudo(params.id), [params.id]);
  const [copiado, setCopiado] = React.useState(false);

  // Conteudo nao encontrado — redireciona pra listagem
  React.useEffect(() => {
    if (!conteudo) {
      router.replace("/aprender");
    }
  }, [conteudo, router]);

  const relacionados = React.useMemo(() => {
    if (!conteudo) return [];
    return CONTEUDOS_EDUCACIONAIS.filter(
      (c) => c.id !== conteudo.id && c.categoria === conteudo.categoria,
    ).slice(0, 3);
  }, [conteudo]);

  if (!conteudo) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        Carregando...
      </div>
    );
  }

  const Icon = ICONES[conteudo.icone] ?? BookOpen;

  async function compartilhar() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const dadosShare = {
      title: conteudo!.titulo,
      text: conteudo!.resumo,
      url,
    };

    // Web Share API — disponivel principalmente em mobile
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(dadosShare);
        return;
      } catch {
        // usuario cancelou ou erro — cai no fallback
      }
    }

    // Fallback: copia URL
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem clipboard tambem — fallback silencioso
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* Voltar */}
      <div>
        <Link
          href="/aprender"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Aprender
        </Link>
      </div>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
          style={{ background: conteudo.cor }}
        >
          <Icon size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1.5">
            <span>{conteudo.categoria}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock size={11} /> {conteudo.tempoLeituraMinutos} min de leitura
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {conteudo.titulo}
          </h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            {conteudo.resumo}
          </p>
        </div>
      </header>

      {/* Acoes */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={compartilhar}
          aria-label="Compartilhar com parceiro"
        >
          <Share2 size={14} />
          {copiado ? "Link copiado!" : "Compartilhar"}
        </Button>
      </div>

      {/* Conteudo do artigo */}
      <MarkdownArticle conteudo={conteudo.conteudoMarkdown} />

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="pt-8 mt-8 border-t border-slate-100">
          <h2 className="font-display font-bold text-lg mb-3">
            Veja tambem
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relacionados.map((r) => {
              const RelIcon = ICONES[r.icone] ?? BookOpen;
              return (
                <Link
                  key={r.id}
                  href={`/aprender/${r.id}`}
                  className="group flex items-start gap-3 rounded-xl bg-white border p-3 hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ background: r.cor }}
                  >
                    <RelIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
                      {r.tempoLeituraMinutos} min
                    </div>
                    <div className="font-display font-bold text-sm text-slate-800 group-hover:text-primary leading-snug line-clamp-2">
                      {r.titulo}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </motion.article>
  );
}
