"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, CheckCheck, AlertTriangle, Calendar, Target,
  Coffee, Trophy, Shield, TrendingUp,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { formatTempoRelativo } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type TipoNotif =
  | "orcamento_80" | "orcamento_estourado" | "vencimento_amanha" | "meta_atingida"
  | "resumo_semanal" | "money_date" | "divida_quitada" | "reserva_completa";

function iconePorTipo(tipo: TipoNotif) {
  switch (tipo) {
    case "orcamento_80":        return { Icon: AlertTriangle, classe: "bg-cream-100 text-ink-800" };
    case "orcamento_estourado": return { Icon: AlertTriangle, classe: "bg-ink-900 text-coral-400" };
    case "vencimento_amanha":   return { Icon: Calendar, classe: "bg-cream-100 text-ink-800" };
    case "meta_atingida":       return { Icon: Target, classe: "bg-coral-500 text-white" };
    case "money_date":          return { Icon: Coffee, classe: "bg-coral-500 text-white" };
    case "resumo_semanal":      return { Icon: TrendingUp, classe: "bg-cream-100 text-ink-800" };
    case "divida_quitada":      return { Icon: Trophy, classe: "bg-coral-500 text-white" };
    case "reserva_completa":    return { Icon: Shield, classe: "bg-coral-500 text-white" };
    default:                    return { Icon: Bell, classe: "bg-cream-100 text-ink-700" };
  }
}

export function NotificacoesBell() {
  const token = useSessionToken();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const lista = useQuery(api.financeiro.notificacoes.list, token ? { sessionToken: token, limit: 20 } : "skip");
  const naoLidas = useQuery(api.financeiro.notificacoes.countNaoLidas, token ? { sessionToken: token } : "skip");
  const marcarLida = useMutation(api.financeiro.notificacoes.marcarLida);
  const marcarTodas = useMutation(api.financeiro.notificacoes.marcarTodasLidas);

  const count = naoLidas ?? 0;

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  async function handleClick(id: Id<"notificacoes">, link: string | undefined) {
    if (!token) return;
    try { await marcarLida({ sessionToken: token, id }); } catch {}
    setAberto(false);
    if (link) router.push(link);
  }

  async function handleMarcarTodas() {
    if (!token) return;
    try { await marcarTodas({ sessionToken: token }); } catch {}
  }

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-white hover:shadow-card border border-cream-200 shadow-soft transition-all"
        aria-label={count > 0 ? `${count} notificações não lidas` : "Notificações"}
        aria-expanded={aberto}
        aria-haspopup="menu"
      >
        <Bell size={18} className="text-ink-700" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center shadow-pop"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-[92vw] max-w-[380px] rounded-3xl border border-cream-200 bg-white shadow-card overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
              <div className="font-display font-bold text-base text-ink-900">Notificações</div>
              {count > 0 && (
                <button onClick={handleMarcarTodas} className="text-xs font-semibold text-coral-600 hover:text-coral-700 inline-flex items-center gap-1">
                  <CheckCheck size={14} /> Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {lista === undefined ? (
                <div className="p-6 text-center text-sm text-ink-400">Carregando...</div>
              ) : lista.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-coral-500 text-white flex items-center justify-center mb-3 shadow-pop">
                    <Check size={20} />
                  </div>
                  <div className="text-sm font-semibold text-ink-900">Tudo em dia</div>
                  <div className="text-xs text-ink-400 mt-1">Nenhuma notificação pendente.</div>
                </div>
              ) : (
                <ul className="divide-y divide-cream-200">
                  {lista.map((n) => {
                    const { Icon, classe } = iconePorTipo(n.tipo as TipoNotif);
                    return (
                      <li key={n._id}>
                        <button
                          role="menuitem"
                          onClick={() => handleClick(n._id, n.link)}
                          className={cn(
                            "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-cream-50 transition-colors",
                            !n.lida && "bg-coral-50/60"
                          )}
                        >
                          <div className={cn("shrink-0 w-10 h-10 rounded-full flex items-center justify-center", classe)}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className={cn("text-sm text-ink-900 truncate", !n.lida && "font-bold")}>
                                {n.titulo}
                              </div>
                              {!n.lida && <span aria-hidden="true" className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-coral-500" />}
                            </div>
                            <div className="text-xs text-ink-500 line-clamp-2 mt-0.5">{n.mensagem}</div>
                            <div className="text-[10px] text-ink-400 mt-1">{formatTempoRelativo(n.criadaEm)}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-cream-200 px-4 py-3 flex justify-between items-center">
              <Link href="/notificacoes/preferencias" onClick={() => setAberto(false)} className="text-xs text-ink-500 hover:text-ink-800 font-medium">
                Preferências
              </Link>
              <Link href="/notificacoes" onClick={() => setAberto(false)} className="text-xs font-semibold text-coral-600 hover:text-coral-700">
                Ver todas →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
