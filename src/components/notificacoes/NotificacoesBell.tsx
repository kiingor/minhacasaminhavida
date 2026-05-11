"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { formatTempoRelativo } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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

export function NotificacoesBell() {
  const token = useSessionToken();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const lista = useQuery(
    api.financeiro.notificacoes.list,
    token ? { sessionToken: token, limit: 20 } : "skip"
  );
  const naoLidas = useQuery(
    api.financeiro.notificacoes.countNaoLidas,
    token ? { sessionToken: token } : "skip"
  );
  const marcarLida = useMutation(api.financeiro.notificacoes.marcarLida);
  const marcarTodas = useMutation(api.financeiro.notificacoes.marcarTodasLidas);

  const count = naoLidas ?? 0;

  // Fecha ao clicar fora ou pressionar Esc
  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  async function handleClick(id: Id<"notificacoes">, link: string | undefined) {
    if (!token) return;
    try {
      await marcarLida({ sessionToken: token, id });
    } catch {
      // ignora erro de marcar lida
    }
    setAberto(false);
    if (link) router.push(link);
  }

  async function handleMarcarTodas() {
    if (!token) return;
    try {
      await marcarTodas({ sessionToken: token });
    } catch {
      // silencioso
    }
  }

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 hover:bg-white/80 border border-white/50 backdrop-blur transition-colors"
        aria-label={count > 0 ? `${count} notificações não lidas` : "Notificações"}
        aria-expanded={aberto}
        aria-haspopup="menu"
      >
        <Bell size={18} className="text-slate-600" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow"
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
            className="absolute right-0 mt-2 w-[92vw] max-w-[380px] rounded-2xl border bg-white shadow-xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-display font-bold text-base text-slate-800">
                Notificações
              </div>
              {count > 0 && (
                <button
                  onClick={handleMarcarTodas}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <CheckCheck size={14} /> Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {lista === undefined ? (
                <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
              ) : lista.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                    <Check size={20} className="text-emerald-600" />
                  </div>
                  <div className="text-sm font-medium text-slate-700">Tudo em dia</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Nenhuma notificação pendente.
                  </div>
                </div>
              ) : (
                <ul className="divide-y">
                  {lista.map((n) => {
                    const { Icon, classe } = iconePorTipo(n.tipo as TipoNotif);
                    return (
                      <li key={n._id}>
                        <button
                          role="menuitem"
                          onClick={() => handleClick(n._id, n.link)}
                          className={cn(
                            "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors",
                            !n.lida && "bg-blue-50/40"
                          )}
                        >
                          <div
                            className={cn(
                              "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                              classe
                            )}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className={cn(
                                  "text-sm text-slate-800 truncate",
                                  !n.lida && "font-semibold"
                                )}
                              >
                                {n.titulo}
                              </div>
                              {!n.lida && (
                                <span
                                  aria-hidden="true"
                                  className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary"
                                />
                              )}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                              {n.mensagem}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {formatTempoRelativo(n.criadaEm)}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t px-3 py-2 flex justify-between items-center">
              <Link
                href="/notificacoes/preferencias"
                onClick={() => setAberto(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Preferências
              </Link>
              <Link
                href="/notificacoes"
                onClick={() => setAberto(false)}
                className="text-xs text-primary font-medium hover:underline"
              >
                Ver todas →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
