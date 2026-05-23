"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, BookOpen, Tags, Wallet, Plus, Heart, Bell, Briefcase, Check } from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContaForm } from "@/components/financeiro/ContaForm";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sounds";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${on ? "bg-coral-500" : "bg-cream-200"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function ConfiguracoesPage() {
  const token = useSessionToken();
  const [sound, setSound] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [seededCat, setSeededCat] = useState(false);
  const [showContaForm, setShowContaForm] = useState(false);

  const seedTarefas = useMutation(api.tarefas.tarefasCatalogo.seedDefaults);
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);
  const tarefas = useQuery(api.tarefas.tarefasCatalogo.list, token ? { sessionToken: token } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token } : "skip");
  const contas = useQuery(api.financeiro.contas.list, token ? { sessionToken: token } : "skip");
  const perfilCasal = useQuery(api.pessoas.perfilCasal, token ? { sessionToken: token } : "skip");

  useEffect(() => { setSound(isSoundEnabled()); }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  }

  async function handleSeedTarefas() {
    if (!token) return;
    await seedTarefas({ sessionToken: token });
    setSeeded(true);
    setTimeout(() => setSeeded(false), 3000);
  }

  async function handleSeedCategorias() {
    if (!token) return;
    await seedCategorias({ sessionToken: token });
    setSeededCat(true);
    setTimeout(() => setSeededCat(false), 3000);
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="py-6 md:py-10 space-y-6 max-w-2xl">
      <motion.section variants={item}>
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Sistema</span>
          <span className="h-px w-8 bg-cream-300" />
          <span className="text-[10px] text-ink-400 font-medium">Preferências</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
          Configurações
        </h1>
        <p className="text-ink-500 mt-1">Preferências e dados do sistema</p>
      </motion.section>

      <motion.div variants={item}>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
                {sound ? <Volume2 size={20} className="text-coral-500" /> : <VolumeX size={20} className="text-ink-400" />}
                Efeitos Sonoros
              </h2>
              <p className="text-sm text-ink-500 mt-1">Sons de check de tarefa, XP e level up.</p>
            </div>
            <Toggle on={sound} onChange={toggleSound} label="Ligar/desligar som" />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <BookOpen size={20} className="text-coral-500" /> Catálogo de Tarefas
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            {tarefas !== undefined ? `${tarefas.length} tarefas cadastradas.` : "Carregando..."}
          </p>
          <div className="flex gap-2 flex-wrap mt-4">
            <Button variant="outline" onClick={handleSeedTarefas} disabled={seeded}>
              {seeded ? (<><Check size={14} /> Criado</>) : "Criar 29 tarefas padrão"}
            </Button>
            <Button variant="ghost" onClick={() => window.location.assign("/tarefas/catalogo")}>
              Gerenciar catálogo →
            </Button>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <Tags size={20} className="text-coral-500" /> Categorias Financeiras
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            {categorias !== undefined ? `${categorias.length} categorias cadastradas.` : "Carregando..."}
          </p>
          <Button variant="outline" onClick={handleSeedCategorias} disabled={seededCat} className="mt-4">
            {seededCat ? (<><Check size={14} /> Criado</>) : "Criar categorias padrão"}
          </Button>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <Heart size={20} className="text-coral-500" /> Modo Casal
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            {perfilCasal !== undefined
              ? `${perfilCasal.length} ${perfilCasal.length === 1 ? "perfil vinculado" : "perfis vinculados"} ao núcleo familiar.`
              : "Carregando..."}
          </p>
          <Link href="/configuracoes/casal" className="inline-block mt-4">
            <Button variant="outline">Gerenciar perfis →</Button>
          </Link>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <Bell size={20} className="text-coral-500" /> Notificações
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            Configure quais alertas você quer receber sobre orçamento, metas e Money Date.
          </p>
          <Link href="/notificacoes/preferencias" className="inline-block mt-4">
            <Button variant="outline">Gerenciar preferências →</Button>
          </Link>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <Briefcase size={20} className="text-coral-500" /> Consultor financeiro
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            Convide um consultor para acompanhar suas finanças. Ele vê seus dados em modo leitura.
          </p>
          <Link href="/configuracoes/consultor" className="inline-block mt-4">
            <Button variant="outline">Gerenciar acesso →</Button>
          </Link>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <Wallet size={20} className="text-coral-500" /> Contas Bancárias
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            {contas !== undefined ? `${contas.length} ${contas.length === 1 ? "conta cadastrada" : "contas cadastradas"}.` : "Carregando..."}
          </p>
          <div className="flex gap-2 flex-wrap mt-4">
            <Link href="/financeiro/contas">
              <Button variant="outline">Gerenciar contas →</Button>
            </Link>
            <Button onClick={() => setShowContaForm(true)}>
              <Plus size={16} /> Nova Conta
            </Button>
          </div>
        </Card>
      </motion.div>

      {showContaForm && <ContaForm onClose={() => setShowContaForm(false)} />}
    </motion.div>
  );
}
