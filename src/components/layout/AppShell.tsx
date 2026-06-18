"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Wallet, ListChecks, Users, LogOut, Settings, ChevronDown, Briefcase, MessageSquare, CalendarClock, Search } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useState, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { useSession, useSessionToken } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";
import { NotificacoesBell } from "@/components/notificacoes/NotificacoesBell";
import { Logo } from "@/components/ui/logo";
import { AgenteFAB } from "@/components/financeiro/agente/AgenteFAB";
import { CommandPalette } from "@/components/layout/CommandPalette";

function abrirBusca() {
  window.dispatchEvent(new Event("open-command-palette"));
}

const navFamilia = [
  { href: "/",             label: "Início",   icon: Home },
  { href: "/financeiro",   label: "Finanças", icon: Wallet },
  { href: "/tarefas",      label: "Tarefas",  icon: ListChecks },
  { href: "/pessoas",      label: "Pessoas",  icon: Users },
];

const navConsultor = [
  { href: "/consultor",             label: "Clientes",    icon: Briefcase },
  { href: "/consultor/comentarios", label: "Comentários", icon: MessageSquare },
  { href: "/consultor/agenda",      label: "Agenda",      icon: CalendarClock },
];

function UserMenu({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white pl-1 pr-3 py-1 shadow-soft hover:shadow-card transition-all border border-cream-200"
      >
        <span className="w-9 h-9 rounded-full bg-ink-900 text-white text-xs font-bold flex items-center justify-center">
          {initials || "·"}
        </span>
        <span className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-xs font-semibold text-ink-900 max-w-[120px] truncate">{name}</span>
          <span className="text-[10px] text-ink-400">Conta</span>
        </span>
        <ChevronDown size={14} className="text-ink-400 hidden md:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-card border border-cream-200 p-1 z-50">
          <Link href="/configuracoes" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-ink-700 hover:bg-cream-100">
            <Settings size={16} /> Configurações
          </Link>
          <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-ink-700 hover:bg-cream-100">
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    if (!token || eventosVerificados.current || isConsultor) return;
    eventosVerificados.current = true;
    verificarEventos({ sessionToken: token }).catch(() => {});
  }, [token, verificarEventos, isConsultor]);

  async function handleLogout() {
    if (session?.token) await logoutMutation({ token: session.token });
    setSession(null);
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">

      {/* Top bar (desktop) */}
      <header className="hidden md:block sticky top-0 z-30 bg-cream-100/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center gap-6">
          <Link href={isConsultor ? "/consultor" : "/"} className="flex items-center gap-2.5 shrink-0">
            <Logo size={40} />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-sm text-ink-900">Minha Casa</span>
              <span className="text-[10px] text-ink-400 -mt-0.5">{isConsultor ? "Consultor" : "Minha Vida"}</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 ml-2">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = path === href || (href !== "/" && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all",
                    active ? "bg-ink-900 text-white shadow-soft" : "text-ink-500 hover:text-ink-900 hover:bg-white"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={abrirBusca}
              className="hidden lg:flex items-center gap-2 h-10 pl-3 pr-2 rounded-full bg-white border border-cream-200 text-ink-400 hover:border-cream-300 hover:text-ink-600 transition-colors text-sm"
              aria-label="Buscar (Ctrl+K)"
            >
              <Search size={15} />
              <span>Buscar...</span>
              <span className="ml-1 text-[10px] font-mono bg-cream-100 text-ink-400 rounded px-1.5 py-0.5">Ctrl K</span>
            </button>
            {!isConsultor && <NotificacoesBell />}
            {session && <UserMenu name={session.name} onLogout={handleLogout} />}
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-cream-100/85 backdrop-blur-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href={isConsultor ? "/consultor" : "/"} className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-display font-bold text-sm text-ink-900">Minha Casa</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={abrirBusca}
              className="w-9 h-9 rounded-full bg-white border border-cream-200 flex items-center justify-center text-ink-500 hover:text-ink-800"
              aria-label="Buscar"
            >
              <Search size={16} />
            </button>
            {!isConsultor && <NotificacoesBell />}
            {session && <UserMenu name={session.name} onLogout={handleLogout} />}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10">
        <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav
        className="md:hidden print-hide-shell fixed bottom-0 inset-x-0 z-40 mx-3 mb-3 rounded-full bg-white border border-cream-200 shadow-card flex justify-around items-center px-2 py-1.5"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all min-w-[56px]",
                active ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-700"
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FAB do Agente IA (apenas família) */}
      {!isConsultor && <AgenteFAB />}

      {/* Command palette global (Ctrl+K) */}
      <CommandPalette isConsultor={isConsultor} />
    </div>
  );
}

function RedirectTo({ path: target }: { path: string }) {
  const router = useRouter();
  useEffect(() => { router.push(target); }, [router, target]);
  return null;
}

const familiaOnlyPaths = ["/financeiro", "/tarefas", "/pessoas", "/notificacoes", "/aprender"];
function isFamiliaOnlyPath(p: string): boolean {
  return familiaOnlyPaths.some((root) => p === root || p.startsWith(`${root}/`));
}

// Valida a sessão no servidor ANTES de renderizar o app autenticado.
// Sem isso, um token vencido (ainda salvo no localStorage) deixava o dashboard
// renderizar e TODAS as queries estouravam "Sessão expirada" → tela branca.
// auth.me retorna null quando a sessão é inválida/expirada (não lança).
function SessionGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { session, setSession } = useSession();
  const token = useSessionToken();
  const me = useQuery(api.auth.me, token ? { token } : "skip");

  // Token inválido/expirado: limpa o que está velho no localStorage.
  useEffect(() => {
    if (token && me === null) setSession(null);
  }, [token, me, setSession]);

  // Validando — não renderiza o dashboard (e suas queries) com token vencido.
  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <div
          className="w-8 h-8 rounded-full border-2 border-cream-300 border-t-coral-500 animate-spin"
          aria-label="Carregando"
        />
      </div>
    );
  }

  // Sessão inválida → login (o efeito acima já limpou o token).
  if (me === null) return <RedirectTo path="/login" />;

  // Sessão válida: aplica os redirects de papel e renderiza o shell.
  const isConsultor = session?.role === "consultor";
  if (isConsultor) {
    if (path === "/" || isFamiliaOnlyPath(path)) return <RedirectTo path="/consultor" />;
  } else {
    if (path === "/consultor" || path.startsWith("/consultor/")) return <RedirectTo path="/" />;
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { token } = useSession();

  if (path === "/login") return <>{children}</>;

  if (path.startsWith("/tv")) {
    if (!token) return <RedirectTo path="/login" />;
    return <>{children}</>;
  }

  if (!token) return <RedirectTo path="/login" />;

  return <SessionGate>{children}</SessionGate>;
}
