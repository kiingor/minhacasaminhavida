"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Wallet, ListChecks, Users, Menu, LogOut } from "lucide-react";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Início", icon: Home },
  { href: "/financeiro", label: "Finanças", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/pessoas", label: "Pessoas", icon: Users },
  { href: "/configuracoes", label: "Menu", icon: Menu },
];

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { session, setSession } = useSession();
  const logoutMutation = useMutation(api.auth.logout);

  async function handleLogout() {
    if (session?.token) {
      await logoutMutation({ token: session.token });
    }
    setSession(null);
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (desktop) — fixo, não rola com o conteúdo */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#1E1B4B] text-white p-4 overflow-y-auto">
        <div className="font-display text-xl font-extrabold mb-8">🏠 Minha Casa</div>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
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
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="text-xs text-white/50 truncate mb-2">{session.name}</div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 text-sm w-full"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}
      </aside>

      {/* Main — rola independente da sidebar */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around py-2 z-40">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs",
                active ? "text-primary" : "text-slate-500"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => { router.push("/login"); }, [router]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { token } = useSession();

  // Páginas públicas (sem shell, sem auth)
  if (path === "/login") return <>{children}</>;

  // Páginas que precisam de auth mas sem sidebar/nav (ex: modo TV)
  if (path.startsWith("/tv")) {
    if (!token) return <RedirectToLogin />;
    return <>{children}</>;
  }

  if (!token) return <RedirectToLogin />;

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
