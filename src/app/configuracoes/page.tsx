"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, BookOpen, Tags } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sounds";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ConfiguracoesPage() {
  const token = useSessionToken();
  const [sound, setSound] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [seededCat, setSeededCat] = useState(false);

  const seedTarefas = useMutation(api.tarefas.tarefasCatalogo.seedDefaults);
  const seedCategorias = useMutation(api.financeiro.categorias.seedDefaults);
  const tarefas = useQuery(api.tarefas.tarefasCatalogo.list, token ? { sessionToken: token } : "skip");
  const categorias = useQuery(api.financeiro.categorias.list, token ? { sessionToken: token } : "skip");

  useEffect(() => {
    setSound(isSoundEnabled());
  }, []);

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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="font-display text-3xl font-extrabold">Configurações</h1>
        <p className="text-slate-500">Preferências e dados do sistema</p>
      </motion.div>

      {/* Som */}
      <motion.div variants={item} className="rounded-2xl bg-white border p-5 shadow-sm space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          {sound ? <Volume2 size={20} className="text-primary" /> : <VolumeX size={20} className="text-slate-400" />}
          Efeitos Sonoros
        </h2>
        <p className="text-sm text-slate-500">Sons de check de tarefa, XP e level up.</p>
        <button
          onClick={toggleSound}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sound ? "bg-primary" : "bg-slate-200"}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${sound ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </motion.div>

      {/* Catálogo de tarefas */}
      <motion.div variants={item} className="rounded-2xl bg-white border p-5 shadow-sm space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <BookOpen size={20} className="text-primary" /> Catálogo de Tarefas
        </h2>
        <p className="text-sm text-slate-500">
          {tarefas !== undefined ? `${tarefas.length} tarefas cadastradas.` : "Carregando..."}
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSeedTarefas} disabled={seeded}>
            {seeded ? "✓ Criado!" : "Criar 29 tarefas padrão"}
          </Button>
          <Button variant="outline" onClick={() => window.location.assign("/tarefas/catalogo")}>
            Gerenciar catálogo →
          </Button>
        </div>
      </motion.div>

      {/* Categorias financeiras */}
      <motion.div variants={item} className="rounded-2xl bg-white border p-5 shadow-sm space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Tags size={20} className="text-primary" /> Categorias Financeiras
        </h2>
        <p className="text-sm text-slate-500">
          {categorias !== undefined ? `${categorias.length} categorias cadastradas.` : "Carregando..."}
        </p>
        <Button variant="outline" onClick={handleSeedCategorias} disabled={seededCat}>
          {seededCat ? "✓ Criado!" : "Criar categorias padrão"}
        </Button>
      </motion.div>

    </motion.div>
  );
}
