"use client";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Target,
  TrendingUp,
  Coffee,
  Mail,
  Smartphone,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type ChaveTipo =
  | "orcamento80"
  | "vencimentoAmanha"
  | "metaAtingida"
  | "resumoSemanal"
  | "moneyDate";

type ChaveCanal = "canalEmail" | "canalPush";

interface ToggleProps {
  ativo: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
}

function Toggle({ ativo, onToggle, disabled, label }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={ativo}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
        ativo ? "bg-primary" : "bg-slate-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          ativo ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

const TIPOS: Array<{
  key: ChaveTipo;
  titulo: string;
  descricao: string;
  Icon: typeof AlertTriangle;
  cor: string;
}> = [
  {
    key: "orcamento80",
    titulo: "Orçamento estourando",
    descricao: "Avisamos quando uma categoria atinge 80% ou ultrapassa o limite.",
    Icon: AlertTriangle,
    cor: "text-amber-600 bg-amber-100",
  },
  {
    key: "vencimentoAmanha",
    titulo: "Vencimento amanhã",
    descricao: "Lembrete um dia antes de cada despesa não paga.",
    Icon: Calendar,
    cor: "text-blue-600 bg-blue-100",
  },
  {
    key: "metaAtingida",
    titulo: "Meta atingida",
    descricao: "Comemore quando uma meta ou a reserva de emergência fechar.",
    Icon: Target,
    cor: "text-emerald-600 bg-emerald-100",
  },
  {
    key: "resumoSemanal",
    titulo: "Resumo semanal",
    descricao: "Toda segunda-feira, um panorama da semana anterior.",
    Icon: TrendingUp,
    cor: "text-violet-600 bg-violet-100",
  },
  {
    key: "moneyDate",
    titulo: "Money Date mensal",
    descricao: "Lembrete a partir do dia 5 para reunir o casal e revisar as finanças.",
    Icon: Coffee,
    cor: "text-orange-600 bg-orange-100",
  },
];

export default function PreferenciasNotificacaoPage() {
  const token = useSessionToken();
  const prefs = useQuery(
    api.financeiro.notificacoes.preferencias,
    token ? { sessionToken: token } : "skip"
  );
  const atualizar = useMutation(api.financeiro.notificacoes.atualizarPreferencias);

  async function toggleTipo(key: ChaveTipo) {
    if (!token || !prefs) return;
    const novoValor = !prefs[key];
    await atualizar({ sessionToken: token, [key]: novoValor });
  }

  async function toggleCanal(key: ChaveCanal) {
    if (!token || !prefs) return;
    const novoValor = !prefs[key];
    await atualizar({ sessionToken: token, [key]: novoValor });
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-2xl"
    >
      <motion.div variants={item} className="flex items-center gap-3">
        <Link
          href="/notificacoes"
          className="text-slate-400 hover:text-slate-600"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-extrabold">Preferências</h1>
          <p className="text-slate-500">Escolha o que você quer ser avisado</p>
        </div>
      </motion.div>

      {/* Tipos de notificacao */}
      <motion.div variants={item} className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="font-display font-bold text-base text-slate-800">
            Tipos de notificação
          </h2>
        </div>
        <ul className="divide-y">
          {TIPOS.map(({ key, titulo, descricao, Icon, cor }) => (
            <li key={key} className="flex items-start gap-3 px-5 py-4">
              <div className={cn("shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", cor)}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800">{titulo}</div>
                <div className="text-xs text-slate-500 mt-0.5">{descricao}</div>
              </div>
              <Toggle
                ativo={prefs ? prefs[key] : true}
                onToggle={() => toggleTipo(key)}
                disabled={!prefs}
                label={`Ativar ${titulo}`}
              />
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Canais (futuros) */}
      <motion.div variants={item} className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-slate-800">
            Canais de entrega
          </h2>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Em breve
          </span>
        </div>
        <ul className="divide-y">
          <li className="flex items-start gap-3 px-5 py-4">
            <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 bg-slate-100">
              <Mail size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">E-mail</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Receba as notificações também por e-mail. Disponível em breve.
              </div>
            </div>
            <Toggle
              ativo={prefs?.canalEmail ?? false}
              onToggle={() => toggleCanal("canalEmail")}
              disabled
              label="Canal de e-mail"
            />
          </li>
          <li className="flex items-start gap-3 px-5 py-4">
            <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 bg-slate-100">
              <Smartphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">Push (Web)</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Notificações em tempo real direto no navegador. Disponível em breve.
              </div>
            </div>
            <Toggle
              ativo={prefs?.canalPush ?? false}
              onToggle={() => toggleCanal("canalPush")}
              disabled
              label="Canal push"
            />
          </li>
        </ul>
      </motion.div>

      <motion.p variants={item} className="text-xs text-slate-400 text-center">
        Notificações in-app são sempre exibidas no sino. Os canais externos
        (e-mail e push) ficarão disponíveis em uma próxima versão.
      </motion.p>
    </motion.div>
  );
}
