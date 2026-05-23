"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Calendar,
  Target,
  Coffee,
  Trophy,
  Shield,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { formatTempoRelativo } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TipoNotif =
  | "orcamento_80"
  | "orcamento_estourado"
  | "vencimento_amanha"
  | "meta_atingida"
  | "resumo_semanal"
  | "money_date"
  | "divida_quitada"
  | "reserva_completa";

function iconePorTipo(tipo: TipoNotif) {
  switch (tipo) {
    case "orcamento_80":
      return { Icon: AlertTriangle, classe: "text-amber-600 bg-amber-100" };
    case "orcamento_estourado":
      return { Icon: AlertTriangle, classe: "text-rose-600 bg-rose-100" };
    case "vencimento_amanha":
      return { Icon: Calendar, classe: "text-blue-600 bg-blue-100" };
    case "meta_atingida":
      return { Icon: Target, classe: "text-emerald-600 bg-emerald-100" };
    case "money_date":
      return { Icon: Coffee, classe: "text-orange-600 bg-orange-100" };
    case "resumo_semanal":
      return { Icon: TrendingUp, classe: "text-violet-600 bg-violet-100" };
    case "divida_quitada":
      return { Icon: Trophy, classe: "text-emerald-600 bg-emerald-100" };
    case "reserva_completa":
      return { Icon: Shield, classe: "text-emerald-600 bg-emerald-100" };
    default:
      return { Icon: Bell, classe: "text-slate-600 bg-slate-100" };
  }
}

type Filtro = "todas" | "nao_lidas" | "lidas";

export function NotificacoesPanel() {
  const token = useSessionToken();
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const lista = useQuery(
    api.financeiro.notificacoes.list,
    token
      ? {
          sessionToken: token,
          apenasNaoLidas: filtro === "nao_lidas",
          limit: 100,
        }
      : "skip"
  );
  const marcarLida = useMutation(api.financeiro.notificacoes.marcarLida);
  const marcarTodas = useMutation(api.financeiro.notificacoes.marcarTodasLidas);
  const remover = useMutation(api.financeiro.notificacoes.remover);

  const filtrada = (() => {
    if (!lista) return undefined;
    if (filtro === "lidas") return lista.filter((n) => n.lida);
    return lista;
  })();

  async function handleClick(id: Id<"notificacoes">, link: string | undefined, lida: boolean) {
    if (!token) return;
    if (!lida) {
      try {
        await marcarLida({ sessionToken: token, id });
      } catch {
        // ignora
      }
    }
    if (link) router.push(link);
  }

  async function handleRemover(id: Id<"notificacoes">, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    try {
      await remover({ sessionToken: token, id });
    } catch {
      // ignora
    }
  }

  async function handleMarcarTodas() {
    if (!token) return;
    try {
      await marcarTodas({ sessionToken: token });
    } catch {
      // ignora
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros + bulk action */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { key: "todas", label: "Todas" },
              { key: "nao_lidas", label: "Não lidas" },
              { key: "lidas", label: "Lidas" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filtro === f.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleMarcarTodas}>
          <CheckCheck size={14} /> Marcar todas como lidas
        </Button>
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        {filtrada === undefined ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando...</div>
        ) : filtrada.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Check size={24} className="text-emerald-600" />
            </div>
            <div className="text-base font-medium text-slate-700">Tudo em dia</div>
            <div className="text-sm text-slate-500 mt-1">
              {filtro === "nao_lidas"
                ? "Nenhuma notificação pendente."
                : "Nenhuma notificação encontrada."}
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {filtrada.map((n) => {
                const { Icon, classe } = iconePorTipo(n.tipo as TipoNotif);
                return (
                  <motion.li
                    key={n._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      onClick={() => handleClick(n._id, n.link, n.lida)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer group",
                        !n.lida && "bg-blue-50/40"
                      )}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleClick(n._id, n.link, n.lida);
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                          classe
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={cn(
                              "text-sm text-slate-800",
                              !n.lida && "font-semibold"
                            )}
                          >
                            {n.titulo}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!n.lida && (
                              <span
                                aria-hidden="true"
                                className="w-2 h-2 rounded-full bg-primary"
                              />
                            )}
                            <button
                              onClick={(e) => handleRemover(n._id, e)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1"
                              aria-label="Remover notificação"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">{n.mensagem}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {formatTempoRelativo(n.criadaEm)}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
