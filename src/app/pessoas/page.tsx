"use client";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonCard } from "@/components/pessoas/PersonCard";
import { NewPersonButton } from "@/components/pessoas/NewPersonButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function PessoasPage() {
  const token = useSessionToken();
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="py-6 md:py-10 space-y-6">
      <motion.section variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Família</span>
            <span className="h-px w-8 bg-cream-300" />
            <span className="text-[10px] text-ink-400 font-medium">Membros</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
            Pessoas
          </h1>
          <p className="text-ink-500 mt-1">Membros da família e progressão</p>
        </div>
        <NewPersonButton />
      </motion.section>

      {pessoas === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}
        </div>
      ) : pessoas.length === 0 ? (
        <motion.div variants={item}>
          <Card tone="cream" padding="lg" className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-white shadow-soft flex items-center justify-center text-ink-400 mb-4">
              <Users size={24} />
            </div>
            <p className="font-display font-bold text-lg text-ink-900">Nenhuma pessoa cadastrada</p>
            <p className="text-sm text-ink-400 mt-1">Clique em &quot;Nova Pessoa&quot; para começar.</p>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pessoas.map((p) => <PersonCard key={p._id} pessoa={p} />)}
        </motion.div>
      )}
    </motion.div>
  );
}
