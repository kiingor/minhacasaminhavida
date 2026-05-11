"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Wallet, ListChecks, Users, Menu, LogOut, Briefcase, MessageSquare, CalendarClock } from "lucide-react";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { useSession, useSessionToken } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";
import { NotificacoesBell } from "@/components/notificacoes/NotificacoesBell";

const navFamilia = [
  { href: "/", label: "Início", icon: Home },
  { href: "/financeiro", label: "Finanças", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/pessoas", label: "Pessoas", icon: Users },
  { href: "/configuracoes", label: "Menu", icon: Menu },
];

// Marco 3.E - menu reduzido para consultores
const navConsultor = [
  { href: "/consultor", label: "Clientes", icon: Briefcase },
  { href: "/consultor/comentarios", label: "Comentários", icon: MessageSquare },
  { href: "/consultor/agenda", label: "Agenda", icon: CalendarClock },
];

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { session, setSession } = useSession();
  const token = useSessionToken();
  const logoutMutation = useMutation(api.auth.logout);
  const verificarEventos = useMutation(api.financeiro.notificacoesEngine.verificarEventos);
  const eventosVerificados = useRef(false);

  const isConsultor = session?.role === "consultor";
  const nav = isConsultor ? navConsultor : navFamilia;

  // Dispara deteccao de eventos uma vez por sessao do usuario.
  // Consultor nao tem dados financeiros proprios — pular.
  useEffect(() => {
    if (!token || eventosVerificados.current || isConsultor) return;
    eventosVerificados.current = true;
    verificarEventos({ sessionToken: token }).catch(() => {
      // silencioso — engine nao deve quebrar a UI
    });
  }, [token, verificarEventos, isConsultor]);

  async function handleLogout() {
    if (session?.token) {
      await logoutMutation({ token: session.token });
    }
    setSession(null);
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Background gradient sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/30 -z-10" />

      {/* Sidebar (desktop) — Liquid Glass */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 m-3 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] p-4 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md shadow-primary/20">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold text-slate-800">Minha Casa</div>
            <div className="text-[10px] text-slate-400 font-medium -mt-0.5">Minha Vida</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                  active
                    ? "bg-primary/90 text-white shadow-md shadow-primary/20"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-800"
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        {session && (
          <div className="border-t border-slate-200/50 pt-3 mt-3">
            <div className="text-xs text-slate-400 truncate mb-2 px-1">{session.name}</div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:bg-white/60 hover:text-danger text-sm w-full transition-all"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}
      </aside>

      {/* Main — rola independente da sidebar */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
        {/* Sino de notificacoes (Marco 3.C) — fixo no topo direito do main */}
        {!isConsultor && (
          <div className="sticky top-3 z-40 flex justify-end pr-4 md:pr-8 pointer-events-none h-0">
            <div className="pointer-events-auto">
              <NotificacoesBell />
            </div>
          </div>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Bottom nav (mobile) — Liquid Glass */}
      <nav
        className="md:hidden print-hide-shell fixed bottom-0 inset-x-0 z-40 mx-2 mb-2 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_-4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] flex justify-around pt-2"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs transition-all",
                active
                  ? "text-primary bg-primary/10"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon size={20} />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RedirectTo({ path: target }: { path: string }) {
  const router = useRouter();
  useEffect(() => {
    router.push(target);
  }, [router, target]);
  return null;
}

// Paginas que pertencem ao app FAMILIA (consultor nao deve acessar)
const familiaOnlyPaths = [
  "/financeiro",
  "/tarefas",
  "/pessoas",
  "/notificacoes",
  "/aprender",
];

function isFamiliaOnlyPath(p: string): boolean {
  return familiaOnlyPaths.some((root) => p === root || p.startsWith(`${root}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { token, session } = useSession();

  // Páginas públicas (sem shell, sem auth)
  if (path === "/login") return <>{children}</>;

  // Páginas que precisam de auth mas sem sidebar/nav (ex: modo TV)
  if (path.startsWith("/tv")) {
    if (!token) return <RedirectTo path="/login" />;
    return <>{children}</>;
  }

  if (!token) return <RedirectTo path="/login" />;

  // Marco 3.E - Roteamento por tipo de usuario.
  const isConsultor = session?.role === "consultor";

  // Consultor tentando acessar /, /financeiro, /tarefas, etc. -> /consultor
  if (isConsultor) {
    if (path === "/" || isFamiliaOnlyPath(path)) {
      return <RedirectTo path="/consultor" />;
    }
  } else {
    // User da familia tentando acessar /consultor -> redireciona para /
    if (path === "/consultor" || path.startsWith("/consultor/")) {
      return <RedirectTo path="/" />;
    }
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
