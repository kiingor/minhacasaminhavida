"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, Inbox, Trash2, Loader2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { formatBRL, formatDate } from "@/lib/formatters";

export default function ComprovantesPage() {
  const token = useSessionToken();
  const grupos = useQuery(
    api.financeiro.comprovantes.listarPorCategoria,
    token ? { sessionToken: token } : "skip"
  );
  const remover = useMutation(api.financeiro.comprovantes.remover);

  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [removendo, setRemovendo] = useState<string | null>(null);

  function toggle(key: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleRemover(origem: "despesa" | "receita", id: string) {
    if (!token || removendo) return;
    setRemovendo(id);
    try {
      await remover({ sessionToken: token, origem, id });
    } finally {
      setRemovendo(null);
    }
  }

  const loading = grupos === undefined;
  const total = (grupos ?? []).reduce((s, g) => s + g.total, 0);

  return (
    <div className="py-6 md:py-10 space-y-5 pb-32">
      <PageHeader
        backHref="/financeiro/lancamentos"
        backLabel="Voltar para Lançamentos"
        title="Comprovantes"
        subtitle="Recibos e notas anexados nas efetivações, organizados por categoria"
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : total === 0 ? (
        <Card tone="cream" padding="lg" className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-white shadow-soft flex items-center justify-center text-ink-400 mb-4">
            <Inbox size={24} />
          </div>
          <p className="font-display font-bold text-base text-ink-900">Nenhum comprovante ainda</p>
          <p className="text-sm text-ink-400 mt-1">
            Ao efetivar um lançamento, anexe o recibo/nota que ele aparece aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {grupos!.map((g) => {
            const key = g.categoriaId ?? "_sem";
            const expandido = expandidas.has(key);
            const Icon = iconeDaCategoria(g.icone);
            return (
              <Card key={key} padding="none" className="overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(key);
                    }
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-cream-50/60 transition-colors cursor-pointer"
                  aria-expanded={expandido}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${g.cor}20`, color: g.cor }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-ink-900 truncate">{g.categoriaNome}</div>
                    <div className="text-xs text-ink-400">
                      {g.total} {g.total === 1 ? "comprovante" : "comprovantes"}
                    </div>
                  </div>
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
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {g.itens.map((it) => (
                          <div key={it.id} className="rounded-xl border border-cream-200 bg-white overflow-hidden">
                            <a
                              href={it.url ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block aspect-square bg-cream-50 relative group"
                            >
                              {it.url && (it.contentType?.startsWith("image/") ?? false) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.url} alt={it.descricao} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-ink-400 gap-1">
                                  <FileText size={28} />
                                  <span className="text-[10px]">Abrir arquivo</span>
                                </div>
                              )}
                              <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-ink-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink size={12} />
                              </span>
                            </a>
                            <div className="p-2">
                              <div className="text-xs font-medium text-ink-900 truncate">{it.descricao}</div>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className={`text-[11px] font-mono tabular-nums ${it.sinal === "+" ? "text-emerald-600" : "text-rose-600"}`}>
                                  {it.sinal}{formatBRL(it.valor)}
                                </span>
                                <span className="text-[10px] text-ink-400">{formatDate(it.data)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemover(it.origem, it.id)}
                                disabled={removendo === it.id}
                                className="mt-1.5 w-full inline-flex items-center justify-center gap-1 h-7 rounded-lg text-[11px] text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                aria-label="Remover comprovante"
                              >
                                {removendo === it.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
