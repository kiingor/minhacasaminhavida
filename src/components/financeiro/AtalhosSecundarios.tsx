"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ReceiptText,
  Wallet,
  CreditCard,
  BarChart3,
  Tag,
  Users,
  GraduationCap,
  ChevronDown,
  Table2,
  type LucideIcon,
} from "lucide-react";

interface Atalho {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const ATALHOS: Atalho[] = [
  { href: "/financeiro/planejamento", label: "Planejamento", Icon: Table2 },
  { href: "/financeiro/dividas",      label: "Dívidas",      Icon: ReceiptText },
  { href: "/financeiro/contas",       label: "Contas",       Icon: Wallet },
  { href: "/financeiro/cartoes",      label: "Cartões",      Icon: CreditCard },
  { href: "/financeiro/relatorios",   label: "Relatórios",   Icon: BarChart3 },
  { href: "/financeiro/categorias",   label: "Categorias",   Icon: Tag },
  { href: "/financeiro/pagadores",    label: "Pagadores",    Icon: Users },
  { href: "/aprender",                label: "Aprender",     Icon: GraduationCap },
];

export function AtalhosSecundarios() {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-4 h-10 rounded-full text-sm font-medium text-ink-700 hover:bg-white border border-transparent hover:border-cream-200 transition-all"
      >
        <span>{aberto ? "Ocultar recursos" : "Ver mais recursos"}</span>
        <ChevronDown size={16} className={`text-ink-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            key="grid-secundarios"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 mt-3">
              {ATALHOS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-2xl bg-white shadow-soft p-3 hover:shadow-card hover:-translate-y-0.5 transition-all group flex flex-col items-center text-center gap-1.5"
                >
                  <div className="w-9 h-9 rounded-full bg-cream-100 group-hover:bg-coral-500 text-ink-700 group-hover:text-white flex items-center justify-center transition-colors">
                    <a.Icon size={16} />
                  </div>
                  <div className="text-xs font-semibold text-ink-700 truncate w-full">
                    {a.label}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
