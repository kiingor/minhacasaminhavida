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
  type LucideIcon,
} from "lucide-react";

interface Atalho {
  href: string;
  label: string;
  Icon: LucideIcon;
  cor: string;
}

const ATALHOS: Atalho[] = [
  { href: "/financeiro/dividas", label: "Dívidas", Icon: ReceiptText, cor: "text-rose-500" },
  { href: "/financeiro/contas", label: "Contas", Icon: Wallet, cor: "text-slate-600" },
  { href: "/financeiro/cartoes", label: "Cartões", Icon: CreditCard, cor: "text-slate-600" },
  { href: "/financeiro/relatorios", label: "Relatórios", Icon: BarChart3, cor: "text-slate-600" },
  { href: "/financeiro/categorias", label: "Categorias", Icon: Tag, cor: "text-slate-600" },
  { href: "/financeiro/pagadores", label: "Pagadores", Icon: Users, cor: "text-slate-600" },
  { href: "/aprender", label: "Aprender", Icon: GraduationCap, cor: "text-blue-500" },
];

/**
 * Toggle "Ver mais recursos" que expande grid de 7 atalhos compactos.
 * bg-white sem gradiente para nao competir visualmente com os primarios.
 */
export function AtalhosSecundarios() {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span>{aberto ? "Ocultar recursos" : "Ver mais recursos"}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
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
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 mt-2">
              {ATALHOS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-xl bg-white border p-3 hover:shadow-md transition-shadow group flex flex-col items-center text-center gap-1"
                >
                  <a.Icon
                    size={20}
                    className={`${a.cor} group-hover:scale-110 transition-transform`}
                  />
                  <div className="text-xs font-medium text-slate-700 truncate w-full">
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
