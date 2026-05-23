"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Settings, ArrowLeft } from "lucide-react";
import { NotificacoesPanel } from "@/components/notificacoes/NotificacoesPanel";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function NotificacoesPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl"
    >
      <motion.div variants={item} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/financeiro"
            className="text-slate-400 hover:text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-extrabold">Notificações</h1>
            <p className="text-slate-500">Acompanhe alertas e conquistas da família</p>
          </div>
        </div>
        <Link
          href="/notificacoes/preferencias"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Settings size={16} />
          Preferências
        </Link>
      </motion.div>

      <motion.div variants={item}>
        <NotificacoesPanel />
      </motion.div>
    </motion.div>
  );
}
